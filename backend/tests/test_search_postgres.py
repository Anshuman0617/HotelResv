"""Fuzzy hotel search (GET /api/hotels?search=...) against PostgreSQL + pg_trgm."""

import os
import sys
import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.hotel import CityAlias, Hotel  # noqa: E402
from app.models.room import Room, RoomType  # noqa: E402
from app.models.user import User  # noqa: E402

HOTELS = [
    # name, city, state, status
    ("Taj Mahal Palace", "Mumbai", "Maharashtra", "active"),
    ("Marine Drive Grand Hotel", "Mumbai", "Maharashtra", "active"),
    ("Leela Palace Heritage", "Bengaluru", "Karnataka", "active"),
    ("Banjara Hills Luxury Stay", "Hyderabad", "Telangana", "active"),
    ("Marina Bay Executive Hotel", "Chennai", "Tamil Nadu", "active"),
    ("Baga Beachfront Retreat", "Goa", "Goa", "active"),
    ("Himalayan Pine Crest Lodge", "Shimla", "Himachal Pradesh", "pending"),
]


@pytest.fixture
def client():
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set TEST_DATABASE_URL to a disposable PostgreSQL database")
    admin = create_engine(url)
    schema = "search_test_" + uuid.uuid4().hex
    with admin.begin() as connection:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS citext"))
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
        connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    search_path = {"options": f"-csearch_path={schema},public"}
    engine = create_engine(url, connect_args=search_path)
    async_engine = create_async_engine(url, connect_args=search_path, poolclass=NullPool)
    async_sessions = async_sessionmaker(async_engine, autoflush=False, expire_on_commit=False)
    Base.metadata.create_all(engine, checkfirst=False)

    ids: dict[str, int] = {}
    with sessionmaker(bind=engine).begin() as db:
        owner = User(full_name="Owner", email="owner@example.com", password_hash="x")
        db.add(owner)
        db.flush()
        for name, city, state, status in HOTELS:
            hotel = Hotel(
                name=name, address_line="Street", city=city, state=state, country="India",
                description=f"Rooms in the heart of {city}.", timezone="Asia/Kolkata",
                status=status, registered_by=owner.id,
            )
            db.add(hotel)
            db.flush()
            room_type = RoomType(hotel_id=hotel.id, name="Standard", max_guests=2, base_price=100)
            db.add(room_type)
            db.flush()
            db.add(Room(hotel_id=hotel.id, room_type_id=room_type.id, room_number="1", status="active"))
            ids[name] = hotel.id
        db.add_all([
            CityAlias(alias="bangalore", city="Bengaluru"),
            CityAlias(alias="bombay", city="Mumbai"),
            CityAlias(alias="madras", city="Chennai"),
        ])

    async def database():
        async with async_sessions() as session:
            yield session

    app.dependency_overrides[get_db] = database
    with TestClient(app) as test_client:
        yield test_client, ids
    app.dependency_overrides.clear()
    engine.dispose()
    with admin.begin() as connection:
        connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
    admin.dispose()


def search(client, query, **params):
    response = client.get("/api/hotels", params={"search": query, **params})
    assert response.status_code == 200, response.text
    return response.json()["data"]


def names(results):
    return [hotel["name"] for hotel in results]


@pytest.mark.parametrize(
    "query, expected",
    [
        ("mumbia", {"Taj Mahal Palace", "Marine Drive Grand Hotel"}),  # typo
        ("hydrabad", {"Banjara Hills Luxury Stay"}),  # typo
        ("chenai", {"Marina Bay Executive Hotel"}),  # missing letter
        ("hyder", {"Banjara Hills Luxury Stay"}),  # word prefix
        ("bangalore", {"Leela Palace Heritage"}),  # old city name, via city_aliases
        ("bombay", {"Taj Mahal Palace", "Marine Drive Grand Hotel"}),
        ("madras", {"Marina Bay Executive Hotel"}),
        ("karnataka", {"Leela Palace Heritage"}),  # state
    ],
)
def test_typos_prefixes_and_aliases_find_the_right_hotels(client, query, expected):
    test_client, _ = client
    assert set(names(search(test_client, query))) == expected


def test_multiple_words_must_all_match_in_any_order(client):
    test_client, _ = client
    assert names(search(test_client, "taj mumbai")) == ["Taj Mahal Palace"]
    assert names(search(test_client, "mumbai taj")) == ["Taj Mahal Palace"]
    # Stopwords such as "hotel" and "in" are ignored.
    assert names(search(test_client, "hotel in chennai")) == ["Marina Bay Executive Hotel"]


def test_best_match_ranks_first_and_weak_look_alikes_are_dropped(client):
    test_client, _ = client
    results = search(test_client, "marina")
    assert names(results)[0] == "Marina Bay Executive Hotel"
    assert results[0]["search_score"] == 1.0
    scores = [hotel["search_score"] for hotel in results]
    assert scores == sorted(scores, reverse=True)
    # "taj" is an exact word in one name; "tamil" etc. must not tag along.
    assert names(search(test_client, "taj")) == ["Taj Mahal Palace"]


def test_typo_scores_below_an_exact_match(client):
    test_client, _ = client
    assert all(hotel["search_score"] < 1 for hotel in search(test_client, "mumbia"))
    assert all(hotel["search_score"] == 1 for hotel in search(test_client, "mumbai"))


def test_no_match_and_inactive_hotels(client):
    test_client, _ = client
    assert search(test_client, "xyzabc") == []
    # Shimla's only hotel is pending, so it is never listed.
    assert "Himalayan Pine Crest Lodge" not in names(search(test_client, "shimla"))


def test_search_combines_with_exact_city_filter(client):
    test_client, _ = client
    assert names(search(test_client, "palace", city="Bengaluru")) == ["Leela Palace Heritage"]


def test_query_without_usable_words_lists_all_active_hotels(client):
    test_client, _ = client
    results = search(test_client, "q")
    assert len(results) == 6
    assert "search_score" not in results[0]


def test_availability_can_be_limited_to_search_results(client):
    test_client, ids = client
    wanted = [ids["Taj Mahal Palace"], ids["Baga Beachfront Retreat"]]
    response = test_client.get(
        "/api/hotels/availability",
        params={"check_in": "2030-01-01", "check_out": "2030-01-02", "hotel_ids": wanted},
    )
    assert response.status_code == 200, response.text
    assert {row["hotel_id"] for row in response.json()["data"]} == set(wanted)
