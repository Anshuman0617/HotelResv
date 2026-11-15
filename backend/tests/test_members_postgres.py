"""Hotel team management: owners grant, change and remove manager/staff roles."""

import os
import sys
import uuid
from pathlib import Path

import pytest
from fastapi import Header, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.database import Base, get_db  # noqa: E402
from app.dependencies.auth import get_current_user  # noqa: E402
from app.main import app  # noqa: E402
from app.models.hotel import Hotel, HotelMember  # noqa: E402
from app.models.room import Room, RoomType  # noqa: E402
from app.models.user import User  # noqa: E402


@pytest.fixture
def context():
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set TEST_DATABASE_URL to a disposable PostgreSQL database")
    admin = create_engine(url)
    schema = "members_test_" + uuid.uuid4().hex
    with admin.begin() as connection:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS citext"))
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
        connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    search_path = {"options": f"-csearch_path={schema},public"}
    engine = create_engine(url, connect_args=search_path)
    async_engine = create_async_engine(url, connect_args=search_path, poolclass=NullPool)
    async_sessions = async_sessionmaker(async_engine, autoflush=False, expire_on_commit=False)
    # checkfirst=False: see test_reports_postgres.py
    Base.metadata.create_all(engine, checkfirst=False)

    with sessionmaker(bind=engine).begin() as db:
        names = ["owner", "manager", "staff", "outsider", "other_owner"]
        users = {
            n: User(full_name=n.replace("_", " ").title(), email=f"{n}@example.com", password_hash="x")
            for n in names
        }
        db.add_all(users.values())
        db.flush()
        hotels = {}
        for key, owner in [("a", "owner"), ("b", "other_owner")]:
            hotel = Hotel(
                name=f"Hotel {key.upper()}", address_line="Street", city="City", country="India",
                timezone="Asia/Kolkata", status="active", registered_by=users[owner].id,
            )
            db.add(hotel)
            db.flush()
            room_type = RoomType(hotel_id=hotel.id, name="Standard", max_guests=2, base_price=100)
            db.add(room_type)
            db.flush()
            db.add(Room(hotel_id=hotel.id, room_type_id=room_type.id, room_number="101", status="active"))
            hotels[key] = hotel
        db.add_all([
            HotelMember(hotel_id=hotels["a"].id, user_id=users["owner"].id, role="owner"),
            HotelMember(hotel_id=hotels["a"].id, user_id=users["manager"].id, role="manager"),
            HotelMember(hotel_id=hotels["a"].id, user_id=users["staff"].id, role="staff"),
            HotelMember(hotel_id=hotels["b"].id, user_id=users["other_owner"].id, role="owner"),
        ])
        ids = {**{n: u.id for n, u in users.items()}, "a": hotels["a"].id, "b": hotels["b"].id}

    async def database():
        async with async_sessions() as db:
            yield db

    def user(x_test_user: int | None = Header(default=None)):
        if x_test_user is None:
            raise HTTPException(status_code=401, detail="Authentication required")
        return User(id=x_test_user, full_name="Test", email="test@example.com", password_hash="x")

    app.dependency_overrides[get_db] = database
    app.dependency_overrides[get_current_user] = user
    with TestClient(app) as client:
        def call(method, path, as_user="owner", json=None):
            headers = {"X-Test-User": str(ids[as_user])}
            return client.request(method, path, headers=headers, json=json)
        yield call, ids
    app.dependency_overrides.clear()
    engine.dispose()
    async_engine.sync_engine.dispose()
    with admin.begin() as connection:
        connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
    admin.dispose()


def members_path(ids, hotel="a", user=None):
    path = f"/api/hotels/{ids[hotel]}/members"
    return f"{path}/{ids[user]}" if user else path


def roles(call, ids, as_user="owner"):
    response = call("GET", members_path(ids), as_user=as_user)
    assert response.status_code == 200, response.text
    return [(m["full_name"], m["role"]) for m in response.json()["data"]]


def test_any_member_can_list_the_team_owner_first(context):
    call, ids = context
    expected = [("Owner", "owner"), ("Manager", "manager"), ("Staff", "staff")]
    for viewer in ("owner", "manager", "staff"):
        assert roles(call, ids, as_user=viewer) == expected
    assert call("GET", members_path(ids), as_user="outsider").status_code == 403


def test_owner_adds_member_by_email_and_they_gain_access(context):
    call, ids = context
    # Before: the outsider can't see hotel A's rooms.
    assert call("GET", f"/api/hotels/{ids['a']}/rooms", as_user="outsider").status_code == 403

    response = call("POST", members_path(ids), json={"email": "OUTSIDER@Example.com", "role": "staff"})
    assert response.status_code == 201, response.text
    member = response.json()["data"]
    assert (member["user_id"], member["role"], member["email"]) == (ids["outsider"], "staff", "outsider@example.com")

    # After: hotel A is in their manager hotel list and staff endpoints work.
    hotels = call("GET", "/api/manager/hotels", as_user="outsider").json()["data"]
    assert [(h["id"], h["role"]) for h in hotels] == [(ids["a"], "staff")]
    assert call("GET", f"/api/hotels/{ids['a']}/rooms", as_user="outsider").status_code == 200


def test_add_member_errors(context):
    call, ids = context
    duplicate = call("POST", members_path(ids), json={"email": "manager@example.com", "role": "staff"})
    assert duplicate.status_code == 409
    assert "already has the manager role" in duplicate.json()["detail"]
    assert call("POST", members_path(ids), json={"email": "nobody@example.com", "role": "staff"}).status_code == 404
    assert call("POST", members_path(ids), json={"email": "outsider@example.com", "role": "owner"}).status_code == 422
    assert call("POST", members_path(ids), json={"email": "not-an-email", "role": "staff"}).status_code == 422


def test_only_the_owner_can_change_the_team(context):
    call, ids = context
    for actor in ("manager", "staff", "outsider"):
        assert call("POST", members_path(ids), as_user=actor, json={"email": "outsider@example.com", "role": "staff"}).status_code == 403
        assert call("PATCH", members_path(ids, user="staff"), as_user=actor, json={"role": "manager"}).status_code == 403
        assert call("DELETE", members_path(ids, user="staff"), as_user=actor).status_code == 403
    # The owner of another hotel has no say over hotel A either.
    assert call("DELETE", members_path(ids, user="staff"), as_user="other_owner").status_code == 403
    assert roles(call, ids) == [("Owner", "owner"), ("Manager", "manager"), ("Staff", "staff")]


def test_owner_changes_a_role(context):
    call, ids = context
    response = call("PATCH", members_path(ids, user="staff"), json={"role": "manager"})
    assert response.status_code == 200, response.text
    assert response.json()["data"]["role"] == "manager"
    assert ("Staff", "manager") in roles(call, ids)
    assert call("PATCH", members_path(ids, user="staff"), json={"role": "owner"}).status_code == 422


def test_owner_row_is_protected_and_other_hotels_are_not_reachable(context):
    call, ids = context
    assert call("PATCH", members_path(ids, user="owner"), json={"role": "staff"}).status_code == 409
    assert call("DELETE", members_path(ids, user="owner")).status_code == 409
    # other_owner belongs to hotel B only, so in hotel A they are "not a member".
    assert call("PATCH", members_path(ids, user="other_owner"), json={"role": "staff"}).status_code == 404
    assert call("DELETE", members_path(ids, user="other_owner")).status_code == 404


def test_owner_removes_a_member_and_access_ends(context):
    call, ids = context
    assert call("GET", f"/api/hotels/{ids['a']}/rooms", as_user="staff").status_code == 200
    response = call("DELETE", members_path(ids, user="staff"))
    assert response.status_code == 200, response.text
    assert ("Staff", "staff") not in roles(call, ids)
    assert call("GET", f"/api/hotels/{ids['a']}/rooms", as_user="staff").status_code == 403
    assert call("DELETE", members_path(ids, user="staff")).status_code == 404
