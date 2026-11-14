from datetime import date, timedelta
from decimal import Decimal
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import Base
from app.models.hotel import Hotel, HotelMember
from app.models.room import Room, RoomType
from app.models.user import User
from app.schemas.hotel import HotelCreate, HotelUpdate
from app.schemas.room import RoomCreate, RoomTypeCreate, RoomTypeUpdate
from app.services import hotel_service, room_service
from fastapi import HTTPException
from sqlalchemy import BigInteger
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import CITEXT

@compiles(CITEXT, "sqlite")
def compile_citext_sqlite(type_, compiler, **kw):
    return "TEXT"

@compiles(BigInteger, "sqlite")
def compile_bigint_sqlite(type_, compiler, **kw):
    return "INTEGER"




# -----------------------------------------------------------------------------
# 1. Schema Validation Tests
# -----------------------------------------------------------------------------


def test_hotel_schema_validation():
    # Valid hotel
    hotel_data = {
        "name": "Grand Palace Hotel",
        "description": "Luxury hotel in city centre",
        "address_line": "123 Marine Drive",
        "city": "Mumbai",
        "country": "India",
        "timezone": "Asia/Kolkata",
    }
    hotel = HotelCreate(**hotel_data)
    assert hotel.name == "Grand Palace Hotel"
    assert hotel.city == "Mumbai"

    # Missing mandatory address
    with pytest.raises(ValidationError):
        HotelCreate(name="Hotel", city="Mumbai", country="India")


def test_room_type_and_room_schema_validation():
    # Valid room type
    rt = RoomTypeCreate(name="Deluxe King", max_guests=2, base_price=Decimal("4500.00"))
    assert rt.max_guests == 2
    assert rt.base_price == Decimal("4500.00")

    # Invalid max_guests (must be > 0)
    with pytest.raises(ValidationError):
        RoomTypeCreate(name="Invalid", max_guests=0, base_price=Decimal("1000"))

    # Invalid negative price
    with pytest.raises(ValidationError):
        RoomTypeCreate(name="Invalid", max_guests=2, base_price=Decimal("-100"))

    # Valid physical room
    room = RoomCreate(room_type_id=1, room_number="101", floor=1, status="active")
    assert room.room_number == "101"

    # Invalid status
    with pytest.raises(ValidationError):
        RoomCreate(room_type_id=1, room_number="102", status="occupied")


# -----------------------------------------------------------------------------
# 2. Service & CRUD Tests (SQLite In-Memory with Foreign Keys)
# -----------------------------------------------------------------------------


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    # Create dummy user
    user = User(
        full_name="Hotelier Admin",
        email="hotelier@example.com",
        password_hash="hash123",
        phone="9876543210",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    try:
        yield db, user
    finally:
        db.close()
        Base.metadata.drop_all(engine)


def test_hotel_crud_service(db_session):
    db, user = db_session

    # 1. Create hotel
    hotel_in = HotelCreate(
        name="The Taj Gateway",
        description="Scenic coastal resort",
        address_line="Beach Road 4",
        city="Goa",
        country="India",
        timezone="Asia/Kolkata",
    )
    hotel = hotel_service.create_hotel(db, user_id=user.id, data=hotel_in)
    assert hotel.id is not None
    assert hotel.registered_by == user.id
    assert hotel.status == "active"

    # Verify hotel_members automatically added user as owner
    membership = db.query(HotelMember).filter_by(hotel_id=hotel.id, user_id=user.id).first()
    assert membership is not None
    assert membership.role == "owner"

    # 2. Get hotel
    fetched = hotel_service.get_hotel(db, hotel.id)
    assert fetched.name == "The Taj Gateway"

    # 3. Update hotel
    updated = hotel_service.update_hotel(
        db, hotel.id, HotelUpdate(description="Updated description", city="North Goa")
    )
    assert updated.city == "North Goa"
    assert updated.description == "Updated description"

    # 4. List hotels with filter
    hotels = hotel_service.list_hotels(db, city="North Goa")
    assert len(hotels) == 1
    assert hotels[0].id == hotel.id

    no_hotels = hotel_service.list_hotels(db, city="Kolkata")
    assert len(no_hotels) == 0


def test_room_and_room_type_crud(db_session):
    db, user = db_session

    hotel = hotel_service.create_hotel(
        db,
        user_id=user.id,
        data=HotelCreate(
            name="City Inn",
            address_line="Main Ave",
            city="Pune",
            country="India",
        ),
    )

    # 1. Create RoomType
    rt_in = RoomTypeCreate(name="Superior", max_guests=3, base_price=Decimal("2500.00"))
    rt = room_service.create_room_type(db, hotel_id=hotel.id, data=rt_in)
    assert rt.id is not None
    assert rt.name == "Superior"

    # Duplicate room type name in same hotel should fail with 409
    with pytest.raises(HTTPException) as exc_info:
        room_service.create_room_type(db, hotel_id=hotel.id, data=rt_in)
    assert exc_info.value.status_code == 409

    # 2. Create Physical Rooms
    r1 = room_service.create_room(
        db,
        hotel_id=hotel.id,
        data=RoomCreate(room_type_id=rt.id, room_number="101", floor=1, status="active"),
    )
    assert r1.id is not None
    assert r1.room_number == "101"

    # Duplicate room number in same hotel should fail with 409
    with pytest.raises(HTTPException) as exc_info:
        room_service.create_room(
            db,
            hotel_id=hotel.id,
            data=RoomCreate(room_type_id=rt.id, room_number="101", floor=1),
        )
    assert exc_info.value.status_code == 409

    # 3. Update Room Status
    updated_room = room_service.update_room_status(
        db, hotel_id=hotel.id, room_id=r1.id, new_status="maintenance"
    )
    assert updated_room.status == "maintenance"

    # 4. List rooms
    rooms = room_service.list_rooms(db, hotel_id=hotel.id, status_filter="maintenance")
    assert len(rooms) == 1
    assert rooms[0].room_number == "101"


def test_availability_date_validation(db_session):
    db, user = db_session

    # check_out must be after check_in
    today = date.today()
    with pytest.raises(HTTPException) as exc_info:
        hotel_service.search_availability(
            db,
            hotel_id=1,
            check_in=today,
            check_out=today,  # Invalid: same date
            guests=2,
        )
    assert exc_info.value.status_code == 422


# -----------------------------------------------------------------------------
# 3. FastAPI Endpoint Integration Tests
# -----------------------------------------------------------------------------


def test_api_endpoints_workflow(db_session):
    from fastapi.testclient import TestClient
    from app.main import app
    from app.database import get_db
    from app.dependencies.auth import get_current_user

    db, owner_user = db_session

    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: owner_user
    client = TestClient(app)

    try:
        # 1. Register a hotel via POST /api/hotels
        reg_payload = {
            "name": "Seaside Resort",
            "description": "5-star luxury by the sea",
            "address_line": "1 Coastal Highway",
            "city": "Chennai",
            "country": "India",
            "timezone": "Asia/Kolkata",
        }
        res = client.post("/api/hotels", json=reg_payload)
        assert res.status_code == 201, res.text
        hotel_data = res.json()["data"]
        hotel_id = hotel_data["id"]
        assert hotel_data["name"] == "Seaside Resort"

        # 2. Get hotel details via GET /api/hotels/{id}
        res = client.get(f"/api/hotels/{hotel_id}")
        assert res.status_code == 200
        assert res.json()["data"]["city"] == "Chennai"

        # 3. List hotels with search filter
        res = client.get("/api/hotels?city=Chennai")
        assert res.status_code == 200
        assert len(res.json()["data"]) == 1

        # 4. Create Room Type via POST /api/hotels/{id}/room-types
        rt_payload = {
            "name": "Ocean Deluxe",
            "description": "Panoramic ocean view",
            "max_guests": 2,
            "base_price": 5000.0,
        }
        res = client.post(f"/api/hotels/{hotel_id}/room-types", json=rt_payload)
        assert res.status_code == 201
        rt_id = res.json()["data"]["id"]

        # 5. List room types via GET /api/hotels/{id}/room-types
        res = client.get(f"/api/hotels/{hotel_id}/room-types")
        assert res.status_code == 200
        assert len(res.json()["data"]) == 1
        assert res.json()["data"][0]["name"] == "Ocean Deluxe"

        # 6. Add physical room via POST /api/hotels/{id}/rooms
        room_payload = {
            "room_type_id": rt_id,
            "room_number": "501",
            "floor": 5,
            "status": "active",
        }
        res = client.post(f"/api/hotels/{hotel_id}/rooms", json=room_payload)
        assert res.status_code == 201
        room_id = res.json()["data"]["id"]

        # 7. List physical rooms via GET /api/hotels/{id}/rooms
        res = client.get(f"/api/hotels/{hotel_id}/rooms")
        assert res.status_code == 200
        assert len(res.json()["data"]) == 1
        assert res.json()["data"][0]["room_number"] == "501"

        # 8. Update room status via PATCH /api/hotels/{id}/rooms/{room_id}/status
        res = client.patch(
            f"/api/hotels/{hotel_id}/rooms/{room_id}/status",
            json={"status": "maintenance"},
        )
        assert res.status_code == 200
        assert res.json()["data"]["status"] == "maintenance"

        # 9. Test Query 1 availability search
        check_in = (date.today() + timedelta(days=5)).isoformat()
        check_out = (date.today() + timedelta(days=7)).isoformat()
        res = client.get(
            f"/api/hotels/availability?check_in={check_in}&check_out={check_out}&guests=2"
        )
        assert res.status_code == 200
    finally:
        app.dependency_overrides.clear()


