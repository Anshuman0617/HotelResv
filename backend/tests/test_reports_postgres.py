import os
import sys
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pytest
from fastapi import Header, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.database import Base, get_db  # noqa: E402
from app.dependencies.auth import get_current_user  # noqa: E402
from app.main import app  # noqa: E402
from app.models.booking import Booking, BookingRoom  # noqa: E402
from app.models.hotel import Hotel, HotelMember  # noqa: E402
from app.models.payment import Payment  # noqa: E402
from app.models.review import Review  # noqa: E402
from app.models.room import Room, RoomType  # noqa: E402
from app.models.user import User  # noqa: E402


def at(day: str) -> datetime:
    return datetime.fromisoformat(day).replace(hour=12, tzinfo=timezone.utc)


def add_booking(db, user, rooms, check_in, nights, status):
    start = date.fromisoformat(check_in)
    booking = Booking(user_id=user.id, check_in=start, check_out=start + timedelta(days=nights), guest_count=len(rooms), status=status)
    db.add(booking)
    db.flush()
    for room, rate in rooms:
        db.add(BookingRoom(booking_id=booking.id, room_type_id=room.room_type_id, room_id=room.id, nightly_rate=rate, guest_count=1))
    db.flush()
    return booking


def add_payment(db, booking, amount, status, created):
    db.add(Payment(booking_id=booking.id, provider="simulated", amount=amount, status=status, created_at=at(created), paid_at=at(created) if status in ("successful", "refunded") else None))


def add_hotel(db, name, owner):
    hotel = Hotel(name=name, address_line="Street", city="City", country="India", timezone="Asia/Kolkata", status="active", registered_by=owner.id)
    db.add(hotel)
    db.flush()
    return hotel


def add_room(db, hotel, room_type, number):
    room = Room(hotel_id=hotel.id, room_type_id=room_type.id, room_number=number, status="active")
    db.add(room)
    db.flush()
    return room


@pytest.fixture
def context():
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set TEST_DATABASE_URL to a disposable PostgreSQL database")
    admin = create_engine(url)
    schema = "reports_test_" + uuid.uuid4().hex
    with admin.begin() as connection:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS citext"))
        connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine = create_engine(url, connect_args={"options": f"-csearch_path={schema},public"})
    Base.metadata.create_all(engine)
    with engine.begin() as connection:
        connection.exec_driver_sql((ROOT / "database" / "views.sql").read_text())
    sessions = sessionmaker(bind=engine, autoflush=False)

    with sessions.begin() as db:
        names = ["owner", "staff", "outsider", "cust1", "cust2", "cust3"]
        users = {n: User(full_name=n.title(), email=f"{n}@example.com", password_hash="x") for n in names}
        db.add_all(users.values())
        db.flush()

        a = add_hotel(db, "Hotel A", users["owner"])
        b = add_hotel(db, "Hotel B", users["outsider"])
        c = add_hotel(db, "Hotel C", users["outsider"])
        db.add_all([
            HotelMember(hotel_id=a.id, user_id=users["owner"].id, role="owner"),
            HotelMember(hotel_id=a.id, user_id=users["staff"].id, role="staff"),
            HotelMember(hotel_id=b.id, user_id=users["outsider"].id, role="owner"),
        ])
        a_std = RoomType(hotel_id=a.id, name="Standard", max_guests=2, base_price=100)
        a_suite = RoomType(hotel_id=a.id, name="Suite", max_guests=3, base_price=200)
        b_std = RoomType(hotel_id=b.id, name="Standard", max_guests=2, base_price=50)
        c_std = RoomType(hotel_id=c.id, name="Standard", max_guests=2, base_price=80)
        db.add_all([a_std, a_suite, b_std, c_std])
        db.flush()
        r1, r2 = add_room(db, a, a_std, "101"), add_room(db, a, a_std, "102")
        r3 = add_room(db, a, a_suite, "201")
        r4, r5 = add_room(db, b, b_std, "1"), add_room(db, c, c_std, "1")

        # Hotel A: cust1 is a repeat customer; cust2 has a single cancelled stay.
        b1 = add_booking(db, users["cust1"], [(r1, 100), (r3, 200)], "2026-01-10", 2, "completed")
        add_payment(db, b1, 600, "successful", "2026-01-04")
        add_payment(db, b1, 600, "initiated", "2026-01-05")  # latest by time
        db.add(Review(booking_id=b1.id, user_id=users["cust1"].id, hotel_id=a.id, rating=5))
        b2 = add_booking(db, users["cust1"], [(r2, 100)], "2026-02-10", 1, "confirmed")
        add_payment(db, b2, 100, "successful", "2026-02-01")
        b3 = add_booking(db, users["cust2"], [(r1, 100)], "2026-03-01", 2, "cancelled")
        add_payment(db, b3, 200, "refunded", "2026-02-20")

        # Hotel B: three reviews averaging 3.0 (below the top-rated threshold).
        for user, start, status, rating in [("cust2", "2026-01-10", "confirmed", 2), ("cust2", "2026-04-01", "pending", 3), ("cust1", "2026-05-01", "completed", 4)]:
            booking = add_booking(db, users[user], [(r4, 50)], start, 1, status)
            if status != "pending":
                add_payment(db, booking, 50, "successful", start)
            db.add(Review(booking_id=booking.id, user_id=users[user].id, hotel_id=b.id, rating=rating))

        # Hotel C: three reviews averaging 3.67 (qualifies as top-rated).
        for start, rating in [("2026-01-01", 4), ("2026-02-01", 4), ("2026-03-01", 3)]:
            booking = add_booking(db, users["cust3"], [(r5, 80)], start, 1, "completed")
            db.add(Review(booking_id=booking.id, user_id=users["cust3"].id, hotel_id=c.id, rating=rating))

        ids = {"a": a.id, "b": b.id, "c": c.id, "b1": b1.id, "b2": b2.id, "b3": b3.id, **{n: u.id for n, u in users.items()}}

    def database():
        with sessions() as db:
            yield db

    def user(x_test_user: int | None = Header(default=None)):
        if x_test_user is None:
            raise HTTPException(status_code=401, detail="Authentication required")
        return User(id=x_test_user, full_name="Test", email="test@example.com", password_hash="x")

    app.dependency_overrides[get_db] = database
    app.dependency_overrides[get_current_user] = user
    with TestClient(app) as client:
        def get(path, as_user="owner"):
            headers = {"X-Test-User": str(ids[as_user])} if as_user else {}
            return client.get(path, headers=headers)
        yield get, ids
    app.dependency_overrides.clear()
    engine.dispose()
    with admin.begin() as connection:
        connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
    admin.dispose()


def report(get, ids, name, hotel="a", **kwargs):
    response = get(f"/api/manager/hotels/{ids[hotel]}/reports/{name}", **kwargs)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["success"] is True
    return body["data"]


def test_summary_uses_view(context):
    get, ids = context
    data = report(get, ids, "summary")
    assert data["hotel_id"] == ids["a"]
    assert (data["total_bookings"], data["pending_bookings"], data["confirmed_bookings"], data["completed_bookings"], data["cancelled_bookings"]) == (3, 0, 1, 1, 1)
    assert data["total_revenue"] == 700  # successful only; refunded excluded
    assert data["review_count"] == 1 and data["avg_rating"] == 5


def test_booking_history_totals_latest_payment_and_isolation(context):
    get, ids = context
    rows = report(get, ids, "bookings")
    assert {row["booking_id"] for row in rows} == {ids["b1"], ids["b2"], ids["b3"]}
    b1 = next(row for row in rows if row["booking_id"] == ids["b1"])
    assert b1["rooms_booked"] == 2 and b1["nights"] == 2
    assert b1["calculated_room_total"] == 600  # not doubled by two payments
    assert b1["latest_payment_status"] == "initiated"  # by time, not alphabetical
    assert b1["review_rating"] == 5
    assert len(report(get, ids, "bookings?limit=1")) == 1
    assert len(report(get, ids, "bookings?limit=2&offset=2")) == 1
    assert get(f"/api/manager/hotels/{ids['a']}/reports/bookings?limit=500").status_code == 422


def test_monthly_revenue(context):
    get, ids = context
    rows = report(get, ids, "revenue")
    assert [(r["revenue_month"], r["paid_bookings_count"], r["monthly_revenue"]) for r in rows] == [("2026-02", 1, 100), ("2026-01", 1, 600)]


def test_popular_room_types(context):
    get, ids = context
    rows = report(get, ids, "popular-room-types")
    assert [(r["room_type_name"], r["times_booked"], r["total_room_revenue"]) for r in rows] == [("Standard", 2, 300), ("Suite", 1, 400)]
    assert {r["hotel_id"] for r in rows} == {ids["a"]}


def test_repeat_customers_scoped_to_hotel(context):
    get, ids = context
    rows = report(get, ids, "repeat-customers")
    assert [r["user_id"] for r in rows] == [ids["cust1"]]
    assert rows[0]["total_bookings"] == 2 and rows[0]["total_nights_booked"] == 3
    assert rows[0]["total_spend"] == 700  # excludes cust1's spend at hotel B
    rows = report(get, ids, "repeat-customers", hotel="b", as_user="outsider")
    assert [(r["user_id"], r["total_spend"]) for r in rows] == [(ids["cust2"], 50)]


def test_top_rated_hotels(context):
    get, ids = context
    response = get("/api/manager/reports/top-rated-hotels", as_user="outsider")
    assert response.status_code == 200
    rows = response.json()["data"]
    assert [(r["hotel_id"], r["total_reviews"], r["average_rating"]) for r in rows] == [(ids["c"], 3, 3.67)]
    assert get("/api/manager/reports/top-rated-hotels", as_user=None).status_code == 401


@pytest.mark.parametrize("name", ["summary", "bookings", "revenue", "popular-room-types", "repeat-customers"])
def test_hotel_report_access(context, name):
    get, ids = context
    path = f"/api/manager/hotels/{ids['a']}/reports/{name}"
    assert get(path, as_user="owner").status_code == 200
    assert get(path, as_user="staff").status_code == 403
    assert get(path, as_user="outsider").status_code == 403
    assert get(path, as_user="cust1").status_code == 403
    assert get(path, as_user=None).status_code == 401
    assert get(f"/api/manager/hotels/{ids['b']}/reports/{name}", as_user="owner").status_code == 403
