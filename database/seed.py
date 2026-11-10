#!/usr/bin/env python3
"""
Deterministic Seed Data Generator for the Hotel Booking System (M1 Deliverable).

Generates exactly 735 logically consistent records across all 9 tables:
  - users:          50
  - hotels:         10
  - hotel_members:  15
  - room_types:     30
  - rooms:         100
  - bookings:      150
  - booking_rooms: 180
  - payments:      140
  - reviews:        60
  --------------------
  Total:           735

Usage:
  python3 database/seed.py                 # Generates database/seed.sql and seeds PostgreSQL if reachable
  python3 database/seed.py --export-only   # Only writes database/seed.sql
"""

from __future__ import annotations

import argparse
import os
import random
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

SEED_SQL_PATH = Path(__file__).resolve().parent / "seed.sql"

# Deterministic bcrypt hash for password "Password@123"
DEFAULT_PASSWORD_HASH = "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW"


def sql_str(val: str | None) -> str:
    if val is None:
        return "NULL"
    escaped = val.replace("'", "''")
    return f"'{escaped}'"


def sql_val(val: object) -> str:
    if val is None:
        return "NULL"
    if isinstance(val, str):
        return sql_str(val)
    if isinstance(val, (date, datetime)):
        return f"'{val.isoformat()}'"
    if isinstance(val, Decimal):
        return f"{val:.2f}"
    return str(val)


def generate_seed_data() -> dict[str, list[dict[str, object]]]:
    rng = random.Random(20261110)

    first_names = [
        "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
        "Ananya", "Diya", "Pari", "Saanvi", "Aadhya", "Kiara", "Myra", "Meera", "Ira", "Riya",
        "Rohan", "Vikram", "Karthik", "Nikhil", "Pranav", "Siddharth", "Rahul", "Dev", "Kabir", "Dhruv",
        "Neha", "Pooja", "Sneha", "Kavya", "Tanvi", "Shreya", "Nisha", "Aditi", "divya", "Tara",
        "Harshil", "Anshuman", "Rohit", "Yash", "Karan", "Manish", "Gaurav", "Tushar", "Varun", "Akash",
    ]
    last_names = [
        "Sharma", "Verma", "Patel", "Reddy", "Nair", "Iyer", "Singh", "Gupta", "Mehta", "Joshi",
    ]

    # -------------------------------------------------------------------------
    # 1. users (50 rows: 1..10 hotel owners/staff, 11..50 customers)
    # -------------------------------------------------------------------------
    users: list[dict[str, object]] = []
    base_ts = datetime(2026, 1, 1, 9, 0, tzinfo=timezone.utc)
    for uid in range(1, 51):
        fname = first_names[uid - 1].capitalize()
        lname = last_names[(uid - 1) % len(last_names)]
        full_name = f"{fname} {lname}"
        email = f"{fname.lower()}.{lname.lower()}{uid}@example.com"
        phone = f"+91-98{uid:02d}{100000 + uid * 137:06d}"
        created_at = base_ts + timedelta(days=uid, hours=uid % 12)
        users.append(
            {
                "id": uid,
                "full_name": full_name,
                "email": email,
                "password_hash": DEFAULT_PASSWORD_HASH,
                "phone": phone,
                "created_at": created_at,
            }
        )

    # -------------------------------------------------------------------------
    # 2. hotels (10 rows)
    # -------------------------------------------------------------------------
    hotel_specs = [
        ("Taj Mahal Palace Suites", "Mumbai", "Maharashtra", "400001", "Apollo Bunder, Colaba", "active", 1),
        ("Marine Drive Grand Hotel", "Mumbai", "Maharashtra", "400020", "Netaji Subhash Chandra Bose Road", "active", 2),
        ("Leela Palace Heritage", "Bengaluru", "Karnataka", "560008", "23 Old Airport Road, Kodihalli", "active", 3),
        ("Silicon Valley Business Inn", "Bengaluru", "Karnataka", "560100", "Electronic City Phase 1", "active", 4),
        ("Connaught Royale Residency", "New Delhi", "Delhi", "110001", "Inner Circle, Connaught Place", "active", 5),
        ("Pink City Haveli Resort", "Jaipur", "Rajasthan", "302002", "Amer Road, Near Jal Mahal", "active", 6),
        ("Baga Beachfront Retreat", "Goa", "Goa", "403516", "Calangute-Baga Road, Bardez", "active", 7),
        ("Banjara Hills Luxury Stay", "Hyderabad", "Telangana", "500034", "Road No. 1, Banjara Hills", "active", 8),
        ("Marina Bay Executive Hotel", "Chennai", "Tamil Nadu", "600004", "Kamarajar Salai, Mylapore", "active", 9),
        ("Himalayan Pine Crest Lodge", "Shimla", "Himachal Pradesh", "171001", "Mall Road, Ridge View", "pending", 10),
    ]
    hotels: list[dict[str, object]] = []
    for hid, (name, city, state, postal, addr, status, reg_by) in enumerate(hotel_specs, start=1):
        hotels.append(
            {
                "id": hid,
                "name": name,
                "description": f"Premier hospitality experience at {name} in the heart of {city}.",
                "address_line": addr,
                "city": city,
                "state": state,
                "country": "India",
                "postal_code": postal,
                "timezone": "Asia/Kolkata",
                "status": status,
                "registered_by": reg_by,
                "created_at": base_ts + timedelta(days=10 + hid),
            }
        )

    # -------------------------------------------------------------------------
    # 3. hotel_members (15 rows: 10 owners + 5 managers/staff)
    # -------------------------------------------------------------------------
    hotel_members: list[dict[str, object]] = []
    for hid in range(1, 11):
        hotel_members.append(
            {
                "hotel_id": hid,
                "user_id": hid,
                "role": "owner",
                "joined_at": base_ts + timedelta(days=10 + hid, hours=1),
            }
        )
    extra_memberships = [
        (1, 2, "manager"),
        (2, 3, "manager"),
        (3, 4, "staff"),
        (4, 5, "manager"),
        (5, 6, "staff"),
    ]
    for hid, uid, role in extra_memberships:
        hotel_members.append(
            {
                "hotel_id": hid,
                "user_id": uid,
                "role": role,
                "joined_at": base_ts + timedelta(days=25 + hid),
            }
        )

    # -------------------------------------------------------------------------
    # 4. room_types (30 rows: 3 per hotel)
    # 5. rooms (100 rows: 10 per hotel -> 4 Standard, 3 Deluxe, 3 Suite)
    # -------------------------------------------------------------------------
    room_types: list[dict[str, object]] = []
    rooms: list[dict[str, object]] = []
    hotel_rooms_map: dict[int, list[dict[str, object]]] = {h["id"]: [] for h in hotels}

    rt_templates = [
        ("Standard Queen Room", "Comfortable queen bed room with high-speed Wi-Fi and work desk.", 2, Decimal("3200.00"), 4),
        ("Deluxe King Room", "Spacious king bed room with city/garden view and lounge seating.", 3, Decimal("5400.00"), 3),
        ("Executive Family Suite", "Two-room luxury suite with living area and complimentary breakfast.", 4, Decimal("8800.00"), 3),
    ]

    rt_id = 1
    room_id = 1
    for hid in range(1, 11):
        price_multiplier = Decimal("1.00") + Decimal(str((hid % 4) * 0.10))
        floor_counter = 1
        room_seq = 1
        for rt_name, rt_desc, max_guests, base_price, count_rooms in rt_templates:
            adjusted_price = (base_price * price_multiplier).quantize(Decimal("0.01"))
            rt_record = {
                "id": rt_id,
                "hotel_id": hid,
                "name": rt_name,
                "description": rt_desc,
                "max_guests": max_guests,
                "base_price": adjusted_price,
                "created_at": base_ts + timedelta(days=20 + hid),
            }
            room_types.append(rt_record)

            for idx in range(count_rooms):
                r_status = "active"
                if idx == count_rooms - 1 and rt_name == "Executive Family Suite" and hid in (9, 10):
                    r_status = "maintenance"
                room_num = f"{floor_counter}0{room_seq}"
                r_record = {
                    "id": room_id,
                    "hotel_id": hid,
                    "room_type_id": rt_id,
                    "room_number": room_num,
                    "floor": floor_counter,
                    "status": r_status,
                    "base_price": adjusted_price,
                    "max_guests": max_guests,
                }
                rooms.append(r_record)
                hotel_rooms_map[hid].append(r_record)
                room_id += 1
                room_seq += 1

            rt_id += 1
            floor_counter += 1
            room_seq = 1

    # -------------------------------------------------------------------------
    # 6. bookings (150 rows) & 7. booking_rooms (180 rows: 120 single-room + 30 two-room)
    # -------------------------------------------------------------------------
    # Status distribution across 150 bookings:
    #   - 1..85    (85 bookings): 'completed'
    #   - 86..125  (40 bookings): 'confirmed'
    #   - 126..140 (15 bookings): 'pending'
    #   - 141..150 (10 bookings): 'cancelled'
    bookings: list[dict[str, object]] = []
    booking_rooms: list[dict[str, object]] = []

    # Track per-room next available date so no two bookings on the same room overlap
    room_next_date: dict[int, date] = {r["id"]: date(2026, 2, 1) for r in rooms}
    customer_ids = list(range(11, 51))  # 40 customers across 150 bookings -> guarantees repeat customers

    br_id = 1
    booking_meta: list[dict[str, object]] = []

    for bid in range(1, 151):
        if bid <= 85:
            b_status = "completed"
        elif bid <= 125:
            b_status = "confirmed"
        elif bid <= 140:
            b_status = "pending"
        else:
            b_status = "cancelled"

        # Pick an active hotel (hotels 1..9) for active/completed bookings
        hid = ((bid - 1) % 9) + 1
        uid = customer_ids[(bid - 1) % len(customer_ids)]
        num_rooms = 2 if bid <= 30 else 1

        # Select candidate active rooms in this hotel with earliest next available date
        active_hotel_rooms = [r for r in hotel_rooms_map[hid] if r["status"] == "active"]
        active_hotel_rooms.sort(key=lambda r: (room_next_date[int(r["id"])], int(r["id"])))
        chosen_rooms = active_hotel_rooms[:num_rooms]

        earliest_start = max(room_next_date[int(r["id"])] for r in chosen_rooms)
        nights = 2 + (bid % 4)  # 2 to 5 nights
        check_in = earliest_start + timedelta(days=1)
        check_out = check_in + timedelta(days=nights)

        for r in chosen_rooms:
            room_next_date[int(r["id"])] = check_out + timedelta(days=1)

        total_guests = 0
        total_amount = Decimal("0.00")
        created_at = datetime.combine(check_in - timedelta(days=7), datetime.min.time(), tzinfo=timezone.utc) + timedelta(hours=10)

        for r in chosen_rooms:
            rg = min(int(r["max_guests"]), 1 + (bid % int(r["max_guests"])))
            total_guests += rg
            rate = Decimal(str(r["base_price"]))
            total_amount += rate * Decimal(nights)

            allocated_room_id = None if b_status == "pending" else int(r["id"])
            booking_rooms.append(
                {
                    "id": br_id,
                    "booking_id": bid,
                    "room_type_id": int(r["room_type_id"]),
                    "room_id": allocated_room_id,
                    "nightly_rate": rate,
                    "guest_count": rg,
                    "created_at": created_at,
                }
            )
            br_id += 1

        bookings.append(
            {
                "id": bid,
                "user_id": uid,
                "check_in": check_in,
                "check_out": check_out,
                "guest_count": total_guests,
                "status": b_status,
                "created_at": created_at,
            }
        )
        booking_meta.append(
            {
                "booking_id": bid,
                "user_id": uid,
                "hotel_id": hid,
                "status": b_status,
                "total_amount": total_amount,
                "created_at": created_at,
                "check_out": check_out,
            }
        )

    # -------------------------------------------------------------------------
    # 8. payments (140 rows)
    # -------------------------------------------------------------------------
    # Bookings 1..140 get 1 payment each (140 payments total):
    #   - Bookings 1..85 ('completed'): 'successful'
    #   - Bookings 86..125 ('confirmed'): 'successful'
    #   - Bookings 126..132 ('pending'): 'initiated'
    #   - Bookings 133..136 ('pending'): 'failed'
    #   - Bookings 137..140 ('pending'): 'refunded'
    payments: list[dict[str, object]] = []
    providers = ["Razorpay", "Stripe", "PayU", "Cashfree"]
    for pid in range(1, 141):
        meta = booking_meta[pid - 1]
        if pid <= 125:
            p_status = "successful"
            paid_at = meta["created_at"] + timedelta(minutes=15)
        elif pid <= 132:
            p_status = "initiated"
            paid_at = None
        elif pid <= 136:
            p_status = "failed"
            paid_at = None
        else:
            p_status = "refunded"
            paid_at = meta["created_at"] + timedelta(minutes=20)

        payments.append(
            {
                "id": pid,
                "booking_id": int(meta["booking_id"]),
                "provider": providers[(pid - 1) % len(providers)],
                "provider_reference": f"TXN-2026-{pid:05d}-{1000 + pid * 7}",
                "amount": meta["total_amount"],
                "currency": "INR",
                "status": p_status,
                "paid_at": paid_at,
                "created_at": meta["created_at"] + timedelta(minutes=5),
            }
        )

    # -------------------------------------------------------------------------
    # 9. reviews (60 rows: strictly for completed bookings 1..60)
    # -------------------------------------------------------------------------
    review_comments = [
        "Excellent stay! Clean rooms, courteous staff, and smooth check-in.",
        "Very comfortable beds and great location near major attractions.",
        "Good value for money. Breakfast spread and room service were prompt.",
        "Spacious suite and quiet floor. Would definitely book again.",
        "Well-maintained property with fast Wi-Fi and helpful front desk.",
        "Pleasant stay overall; check-in took a few minutes but rooms were spotless.",
    ]
    reviews: list[dict[str, object]] = []
    for rev_id in range(1, 61):
        meta = booking_meta[rev_id - 1]  # bookings 1..60 are all 'completed'
        rating = 3 + (rev_id % 3)  # ratings 3, 4, 5
        if rev_id % 11 == 0:
            rating = 2
        check_out_dt = datetime.combine(meta["check_out"], datetime.min.time(), tzinfo=timezone.utc) + timedelta(days=1, hours=14)
        reviews.append(
            {
                "id": rev_id,
                "booking_id": int(meta["booking_id"]),
                "user_id": int(meta["user_id"]),
                "hotel_id": int(meta["hotel_id"]),
                "rating": rating,
                "comment": review_comments[(rev_id - 1) % len(review_comments)],
                "created_at": check_out_dt,
            }
        )

    # Strip helper keys from rooms
    clean_rooms = [
        {
            "id": r["id"],
            "hotel_id": r["hotel_id"],
            "room_type_id": r["room_type_id"],
            "room_number": r["room_number"],
            "floor": r["floor"],
            "status": r["status"],
        }
        for r in rooms
    ]

    return {
        "users": users,
        "hotels": hotels,
        "hotel_members": hotel_members,
        "room_types": room_types,
        "rooms": clean_rooms,
        "bookings": bookings,
        "booking_rooms": booking_rooms,
        "payments": payments,
        "reviews": reviews,
    }


def export_seed_sql(data: dict[str, list[dict[str, object]]], output_path: Path = SEED_SQL_PATH) -> None:
    lines: list[str] = [
        "-- =============================================================================",
        "-- Hotel Booking System - Deterministic Sample Data (735 Records)",
        "-- Generated by database/seed.py (Owner: M1)",
        "-- =============================================================================",
        "",
        "BEGIN;",
        "",
        "TRUNCATE TABLE",
        "    reviews,",
        "    payments,",
        "    booking_rooms,",
        "    bookings,",
        "    rooms,",
        "    room_types,",
        "    hotel_members,",
        "    hotels,",
        "    users",
        "RESTART IDENTITY CASCADE;",
        "",
    ]

    table_order = [
        ("users", ["id", "full_name", "email", "password_hash", "phone", "created_at"]),
        (
            "hotels",
            [
                "id",
                "name",
                "description",
                "address_line",
                "city",
                "state",
                "country",
                "postal_code",
                "timezone",
                "status",
                "registered_by",
                "created_at",
            ],
        ),
        ("hotel_members", ["hotel_id", "user_id", "role", "joined_at"]),
        ("room_types", ["id", "hotel_id", "name", "description", "max_guests", "base_price", "created_at"]),
        ("rooms", ["id", "hotel_id", "room_type_id", "room_number", "floor", "status"]),
        ("bookings", ["id", "user_id", "check_in", "check_out", "guest_count", "status", "created_at"]),
        ("booking_rooms", ["id", "booking_id", "room_type_id", "room_id", "nightly_rate", "guest_count", "created_at"]),
        (
            "payments",
            ["id", "booking_id", "provider", "provider_reference", "amount", "currency", "status", "paid_at", "created_at"],
        ),
        ("reviews", ["id", "booking_id", "user_id", "hotel_id", "rating", "comment", "created_at"]),
    ]

    for table_name, cols in table_order:
        rows = data[table_name]
        lines.append(f"-- Table: {table_name} ({len(rows)} rows)")
        col_list = ", ".join(cols)
        lines.append(f"INSERT INTO {table_name} ({col_list}) VALUES")
        value_tuples: list[str] = []
        for row in rows:
            vals = ", ".join(sql_val(row[c]) for c in cols)
            value_tuples.append(f"    ({vals})")
        lines.append(",\n".join(value_tuples) + ";")
        lines.append("")

    # Synchronize BIGSERIAL sequences
    serial_tables = ["users", "hotels", "room_types", "rooms", "bookings", "booking_rooms", "payments", "reviews"]
    lines.append("-- Reset BIGSERIAL sequences to max(id)")
    for tbl in serial_tables:
        lines.append(f"SELECT setval(pg_get_serial_sequence('{tbl}', 'id'), COALESCE((SELECT MAX(id) FROM {tbl}), 1), true);")

    lines.append("")
    lines.append("COMMIT;")
    lines.append("")

    output_path.write_text("\n".join(lines), encoding="utf-8")


def apply_seed_to_database(sql_path: Path) -> bool:
    """Apply seed.sql to PostgreSQL if sqlalchemy/psycopg and database are reachable."""
    try:
        from sqlalchemy import create_engine, text
    except ImportError:
        return False

    db_url = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://postgres:postgres@localhost:5432/hotel_booking",
    )
    try:
        engine = create_engine(db_url)
        raw_sql = sql_path.read_text(encoding="utf-8")
        with engine.begin() as conn:
            conn.exec_driver_sql(raw_sql)
            total = 0
            print("\nPostgreSQL Seed Summary:")
            for tbl in [
                "users",
                "hotels",
                "hotel_members",
                "room_types",
                "rooms",
                "bookings",
                "booking_rooms",
                "payments",
                "reviews",
            ]:
                cnt = conn.execute(text(f"SELECT COUNT(*) FROM {tbl}")).scalar_one()
                total += cnt
                print(f"  - {tbl:<15}: {cnt:>4} rows")
            print(f"  Total seeded rows: {total}")
        return True
    except Exception as exc:
        print(f"Note: Skipped direct DB execution ({exc}). Use 'psql -f database/seed.sql' when PostgreSQL is running.")
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate and apply Hotel Booking System seed data.")
    parser.add_argument("--export-only", action="store_true", help="Only generate database/seed.sql without connecting to PostgreSQL.")
    args = parser.parse_args()

    data = generate_seed_data()
    export_seed_sql(data, SEED_SQL_PATH)

    total = sum(len(rows) for rows in data.values())
    print(f"Generated {SEED_SQL_PATH} with {total} total records:")
    for tbl, rows in data.items():
        print(f"  - {tbl:<15}: {len(rows):>4}")

    if not args.export_only:
        apply_seed_to_database(SEED_SQL_PATH)


if __name__ == "__main__":
    main()
