import os
import sys
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from pathlib import Path
from threading import Barrier

import pytest
from fastapi import Header
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select, text
from sqlalchemy.orm import Session, sessionmaker

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import Base, get_db
from app.dependencies.auth import get_current_user
from app.main import app
from app.models.booking import Booking, BookingRoom
from app.models.hotel import Hotel
from app.models.payment import Payment
from app.models.room import Room, RoomType
from app.models.user import User


@pytest.fixture
def context():
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set TEST_DATABASE_URL to a disposable PostgreSQL database")
    admin = create_engine(url)
    schema = "booking_test_" + uuid.uuid4().hex
    with admin.begin() as connection:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS citext"))
        connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine = create_engine(url, connect_args={"options": f"-csearch_path={schema},public"})
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, autoflush=False)
    with sessions.begin() as db:
        users = [User(full_name="One", email="one@example.com", password_hash="x"), User(full_name="Two", email="two@example.com", password_hash="x")]
        db.add_all(users)
        db.flush()
        hotel = Hotel(name="Hotel", address_line="Street", city="City", country="India", timezone="Asia/Kolkata", status="active", registered_by=users[0].id)
        db.add(hotel)
        db.flush()
        types = [RoomType(hotel_id=hotel.id, name="Standard", max_guests=2, base_price=100), RoomType(hotel_id=hotel.id, name="Suite", max_guests=3, base_price=200)]
        db.add_all(types)
        db.flush()
        db.add_all([Room(hotel_id=hotel.id, room_type_id=types[0].id, room_number="1", status="active"), Room(hotel_id=hotel.id, room_type_id=types[1].id, room_number="2", status="active")])
        ids = (hotel.id, types[0].id, types[1].id, users[0].id, users[1].id)
    def database():
        with sessions() as db:
            yield db
    current_user = {"id": ids[3]}
    def user(x_test_user: int | None = Header(default=None)):
        return User(id=x_test_user or current_user["id"], full_name="Test", email="test@example.com", password_hash="x")
    app.dependency_overrides[get_db] = database
    app.dependency_overrides[get_current_user] = user
    with TestClient(app) as client:
        yield client, sessions, ids, current_user
    app.dependency_overrides.clear()
    engine.dispose()
    with admin.begin() as connection:
        connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
    admin.dispose()


def request(ids, rooms=None, start=None):
    start = start or date.today() + timedelta(days=10)
    return {"hotel_id": ids[0], "check_in": start.isoformat(), "check_out": (start + timedelta(days=2)).isoformat(), "rooms": rooms or [{"room_type_id": ids[1], "quantity": 1, "guests_per_room": 2}]}


def test_concurrent_last_room(context):
    client, sessions, ids, _ = context
    barrier = Barrier(2)
    def submit(user_id):
        barrier.wait()
        return client.post("/api/bookings", json=request(ids), headers={"X-Test-User": str(user_id)}).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        statuses = list(pool.map(submit, ids[3:5]))
    assert sorted(statuses) == [201, 409]
    with sessions() as db:
        assert db.scalar(select(func.count()).select_from(Booking)) == 1
        assert db.scalar(select(func.count()).select_from(BookingRoom)) == 1


def test_rollback_and_dates(context):
    client, sessions, ids, _ = context
    payload = request(ids, [{"room_type_id": ids[1], "quantity": 1, "guests_per_room": 2}, {"room_type_id": ids[2], "quantity": 2, "guests_per_room": 1}])
    assert client.post("/api/bookings", json=payload).status_code == 409
    with sessions() as db:
        assert db.scalar(select(func.count()).select_from(Booking)) == 0
        assert db.scalar(select(func.count()).select_from(BookingRoom)) == 0
    assert client.post("/api/bookings", json=request(ids)).status_code == 201
    assert client.post("/api/bookings", json=request(ids)).status_code == 409
    assert client.post("/api/bookings", json=request(ids, start=date.today() + timedelta(days=12))).status_code == 201
    invalid = request(ids)
    invalid["check_out"] = invalid["check_in"]
    assert client.post("/api/bookings", json=invalid).status_code == 422
    assert client.post("/api/bookings", json=request(ids, [{"room_type_id": ids[1], "quantity": 1, "guests_per_room": 3}])).status_code == 422


def test_payments_ownership_cancellation_and_review(context):
    client, sessions, ids, user = context
    created = client.post("/api/bookings", json=request(ids)).json()["data"]
    booking_id = created["id"]
    user["id"] = ids[4]
    for method, suffix, body in [("get", "", None), ("post", "/cancel", None), ("post", "/payments", {"outcome": "successful"}), ("post", "/reviews", {"rating": 5})]:
        response = getattr(client, method)(f"/api/bookings/{booking_id}{suffix}", **({"json": body} if body else {}))
        assert response.status_code == 404
    user["id"] = ids[3]
    assert client.post(f"/api/bookings/{booking_id}/reviews", json={"rating": 5}).status_code == 409
    assert client.post(f"/api/bookings/{booking_id}/payments", json={"outcome": "failed"}).json()["data"]["status"] == "pending"
    for _ in range(2):
        assert client.post(f"/api/bookings/{booking_id}/payments", json={"outcome": "successful"}).json()["data"]["status"] == "confirmed"
    with sessions() as db:
        assert db.scalar(select(func.count()).select_from(Payment).where(Payment.booking_id == booking_id, Payment.status == "successful")) == 1
    cancelled = client.post(f"/api/bookings/{booking_id}/cancel").json()["data"]
    assert cancelled["status"] == "cancelled"
    assert {p["status"] for p in cancelled["payments"]} == {"failed", "refunded"}
    assert client.post(f"/api/bookings/{booking_id}/cancel").status_code == 409
    with sessions.begin() as db:
        booking = db.get(Booking, booking_id)
        booking.status = "completed"
        booking.check_in = date.today() - timedelta(days=3)
        booking.check_out = date.today() - timedelta(days=1)
    assert client.post(f"/api/bookings/{booking_id}/reviews", json={"rating": 6}).status_code == 422
    assert client.post(f"/api/bookings/{booking_id}/reviews", json={"rating": 5}).status_code == 201
    assert client.post(f"/api/bookings/{booking_id}/reviews", json={"rating": 4}).status_code == 409


def test_query_two_totals_and_latest_payment(context):
    client, sessions, ids, _ = context
    payload = request(ids, [{"room_type_id": ids[1], "quantity": 1, "guests_per_room": 1}, {"room_type_id": ids[2], "quantity": 1, "guests_per_room": 1}])
    booking_id = client.post("/api/bookings", json=payload).json()["data"]["id"]
    client.post(f"/api/bookings/{booking_id}/payments", json={"outcome": "failed"})
    client.post(f"/api/bookings/{booking_id}/payments", json={"outcome": "successful"})
    source = (Path(__file__).resolve().parents[2] / "database" / "queries.sql").read_text(encoding="utf-8")
    query = source[source.index("WITH room_totals AS"):source.index("\n\n\n-- -----------------------------------------------------------------------------\n-- Query 3")]
    with sessions() as db:
        row = db.execute(text(query)).mappings().one()
        assert row["rooms_booked"] == 2
        assert row["calculated_room_total"] == 600
        assert row["latest_payment_status"] == "successful"
