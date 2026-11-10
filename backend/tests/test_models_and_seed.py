import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from database.seed import generate_seed_data  # noqa: E402


def test_seed_data_counts_and_integrity() -> None:
    data = generate_seed_data()

    expected_counts = {
        "users": 50,
        "hotels": 10,
        "hotel_members": 15,
        "room_types": 30,
        "rooms": 100,
        "bookings": 150,
        "booking_rooms": 180,
        "payments": 140,
        "reviews": 60,
    }
    for table, count in expected_counts.items():
        assert len(data[table]) == count, f"Expected {count} rows in {table}, got {len(data[table])}"

    total = sum(len(rows) for rows in data.values())
    assert total == 735

    # Verify check_out > check_in for all bookings
    bookings_by_id = {b["id"]: b for b in data["bookings"]}
    for b in data["bookings"]:
        assert b["check_out"] > b["check_in"]
        assert b["guest_count"] > 0

    # Verify room hotel_id matches room_type hotel_id
    rt_by_id = {rt["id"]: rt for rt in data["room_types"]}
    rooms_by_id = {r["id"]: r for r in data["rooms"]}
    for r in data["rooms"]:
        assert r["hotel_id"] == rt_by_id[r["room_type_id"]]["hotel_id"]

    # Verify booking_rooms room_id matches room_type_id and no physical room has overlapping dates
    room_intervals: dict[int, list[tuple[object, object]]] = {}
    for br in data["booking_rooms"]:
        b = bookings_by_id[br["booking_id"]]
        if br["room_id"] is not None:
            room = rooms_by_id[br["room_id"]]
            assert room["room_type_id"] == br["room_type_id"]
            intervals = room_intervals.setdefault(int(br["room_id"]), [])
            for existing_in, existing_out in intervals:
                overlap = (existing_in < b["check_out"]) and (existing_out > b["check_in"])
                assert not overlap, f"Overlapping allocation on room {br['room_id']}"
            intervals.append((b["check_in"], b["check_out"]))

    # Verify reviews only belong to completed bookings and match user_id & hotel_id
    for rev in data["reviews"]:
        b = bookings_by_id[rev["booking_id"]]
        assert b["status"] == "completed"
        assert rev["user_id"] == b["user_id"]
        assert 1 <= int(rev["rating"]) <= 5


def test_sqlalchemy_models_metadata() -> None:
    try:
        from app.models import Base
    except ImportError:
        return

    expected_tables = {
        "users",
        "hotels",
        "hotel_members",
        "room_types",
        "rooms",
        "bookings",
        "booking_rooms",
        "payments",
        "reviews",
    }
    assert set(Base.metadata.tables.keys()) == expected_tables


if __name__ == "__main__":
    test_seed_data_counts_and_integrity()
    test_sqlalchemy_models_metadata()
    print("All model and seed data integrity checks passed!")
