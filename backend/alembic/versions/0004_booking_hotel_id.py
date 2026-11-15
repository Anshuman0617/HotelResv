"""Store the hotel on each booking and pin every booking line to it.

Before this, a booking reached its hotel only through
booking_rooms -> room_types, so nothing stopped one booking from holding rooms
in two hotels, and every report had to re-derive the hotel with a DISTINCT.

This adds:
  * bookings.hotel_id (NOT NULL, FK to hotels) and UNIQUE (id, hotel_id)
  * booking_rooms.hotel_id with two composite FKs:
      (booking_id, hotel_id)   -> bookings (id, hotel_id)
      (room_type_id, hotel_id) -> room_types (id, hotel_id)
    so a line's hotel must equal both its booking's and its room type's hotel.
  * idx_bookings_hotel_checkin for hotel-scoped reports
  * hotel_booking_summary rebuilt on bookings.hotel_id

Existing rows are backfilled from room_types. The upgrade stops with an error
if any booking has no rooms or rooms in more than one hotel, since such a
booking has no single correct hotel.

Revision ID: 0004_booking_hotel_id
Revises: 0003_review_eligibility_trigger
Create Date: 2026-11-15

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004_booking_hotel_id"
down_revision: Union[str, None] = "0003_review_eligibility_trigger"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


SUMMARY_VIEW = """
CREATE VIEW hotel_booking_summary AS
WITH booking_counts AS (
    SELECT
        hotel_id,
        COUNT(id) AS total_bookings,
        COUNT(id) FILTER (WHERE status = 'pending') AS pending_bookings,
        COUNT(id) FILTER (WHERE status = 'confirmed') AS confirmed_bookings,
        COUNT(id) FILTER (WHERE status = 'completed') AS completed_bookings,
        COUNT(id) FILTER (WHERE status = 'cancelled') AS cancelled_bookings
    FROM bookings
    GROUP BY hotel_id
),
hotel_revenue AS (
    SELECT
        b.hotel_id,
        COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'successful'), 0.00) AS total_revenue
    FROM bookings b
    LEFT JOIN payments p ON p.booking_id = b.id
    GROUP BY b.hotel_id
),
hotel_reviews AS (
    SELECT
        hotel_id,
        COUNT(id) AS review_count,
        ROUND(AVG(rating)::numeric, 2) AS avg_rating
    FROM reviews
    GROUP BY hotel_id
)
SELECT
    h.id AS hotel_id,
    h.name AS hotel_name,
    h.city,
    h.status AS hotel_status,
    COALESCE(bc.total_bookings, 0) AS total_bookings,
    COALESCE(bc.pending_bookings, 0) AS pending_bookings,
    COALESCE(bc.confirmed_bookings, 0) AS confirmed_bookings,
    COALESCE(bc.completed_bookings, 0) AS completed_bookings,
    COALESCE(bc.cancelled_bookings, 0) AS cancelled_bookings,
    COALESCE(hr.total_revenue, 0.00) AS total_revenue,
    COALESCE(rv.review_count, 0) AS review_count,
    rv.avg_rating
FROM hotels h
LEFT JOIN booking_counts bc ON bc.hotel_id = h.id
LEFT JOIN hotel_revenue hr ON hr.hotel_id = h.id
LEFT JOIN hotel_reviews rv ON rv.hotel_id = h.id;
"""

# The view as created by 0001, restored on downgrade.
OLD_SUMMARY_VIEW = """
CREATE VIEW hotel_booking_summary AS
WITH hotel_bookings AS (
    SELECT DISTINCT
        rt.hotel_id,
        b.id AS booking_id,
        b.status AS booking_status
    FROM bookings b
    JOIN booking_rooms br ON br.booking_id = b.id
    JOIN room_types rt ON rt.id = br.room_type_id
),
booking_counts AS (
    SELECT
        hotel_id,
        COUNT(booking_id) AS total_bookings,
        COUNT(booking_id) FILTER (WHERE booking_status = 'pending') AS pending_bookings,
        COUNT(booking_id) FILTER (WHERE booking_status = 'confirmed') AS confirmed_bookings,
        COUNT(booking_id) FILTER (WHERE booking_status = 'completed') AS completed_bookings,
        COUNT(booking_id) FILTER (WHERE booking_status = 'cancelled') AS cancelled_bookings
    FROM hotel_bookings
    GROUP BY hotel_id
),
hotel_revenue AS (
    SELECT
        hb.hotel_id,
        COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'successful'), 0.00) AS total_revenue
    FROM hotel_bookings hb
    LEFT JOIN payments p ON p.booking_id = hb.booking_id
    GROUP BY hb.hotel_id
),
hotel_reviews AS (
    SELECT
        hotel_id,
        COUNT(id) AS review_count,
        ROUND(AVG(rating)::numeric, 2) AS avg_rating
    FROM reviews
    GROUP BY hotel_id
)
SELECT
    h.id AS hotel_id,
    h.name AS hotel_name,
    h.city,
    h.status AS hotel_status,
    COALESCE(bc.total_bookings, 0) AS total_bookings,
    COALESCE(bc.pending_bookings, 0) AS pending_bookings,
    COALESCE(bc.confirmed_bookings, 0) AS confirmed_bookings,
    COALESCE(bc.completed_bookings, 0) AS completed_bookings,
    COALESCE(bc.cancelled_bookings, 0) AS cancelled_bookings,
    COALESCE(hr.total_revenue, 0.00) AS total_revenue,
    COALESCE(rv.review_count, 0) AS review_count,
    rv.avg_rating
FROM hotels h
LEFT JOIN booking_counts bc ON bc.hotel_id = h.id
LEFT JOIN hotel_revenue hr ON hr.hotel_id = h.id
LEFT JOIN hotel_reviews rv ON rv.hotel_id = h.id;
"""


def upgrade() -> None:
    # 1. Refuse to guess for bookings that have no single hotel.
    op.execute(
        """
        DO $$
        DECLARE
            v_bad BIGINT;
        BEGIN
            SELECT b.id INTO v_bad
              FROM bookings b
              LEFT JOIN booking_rooms br ON br.booking_id = b.id
              LEFT JOIN room_types rt ON rt.id = br.room_type_id
             GROUP BY b.id
            HAVING COUNT(DISTINCT rt.hotel_id) <> 1
             LIMIT 1;
            IF v_bad IS NOT NULL THEN
                RAISE EXCEPTION 'Booking % has no rooms or rooms in several hotels; fix it before adding bookings.hotel_id', v_bad;
            END IF;
        END $$;
        """
    )

    # 2. bookings.hotel_id, backfilled from the booking's room types.
    op.add_column("bookings", sa.Column("hotel_id", sa.BigInteger(), nullable=True))
    op.execute(
        """
        UPDATE bookings b
           SET hotel_id = sub.hotel_id
          FROM (
              SELECT DISTINCT br.booking_id, rt.hotel_id
                FROM booking_rooms br
                JOIN room_types rt ON rt.id = br.room_type_id
          ) sub
         WHERE sub.booking_id = b.id;
        """
    )
    op.alter_column("bookings", "hotel_id", nullable=False)
    op.create_foreign_key(
        "bookings_hotel_id_fkey", "bookings", "hotels",
        ["hotel_id"], ["id"], ondelete="RESTRICT",
    )
    op.create_unique_constraint("uq_bookings_id_hotel", "bookings", ["id", "hotel_id"])
    op.create_index("idx_bookings_hotel_checkin", "bookings", ["hotel_id", "check_in"], unique=False)

    # 3. booking_rooms.hotel_id, pinned to both the booking and the room type.
    op.add_column("booking_rooms", sa.Column("hotel_id", sa.BigInteger(), nullable=True))
    op.execute(
        """
        UPDATE booking_rooms br
           SET hotel_id = rt.hotel_id
          FROM room_types rt
         WHERE rt.id = br.room_type_id;
        """
    )
    op.alter_column("booking_rooms", "hotel_id", nullable=False)
    op.create_foreign_key(
        "fk_booking_rooms_booking_hotel", "booking_rooms", "bookings",
        ["booking_id", "hotel_id"], ["id", "hotel_id"], ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_booking_rooms_room_type_hotel", "booking_rooms", "room_types",
        ["room_type_id", "hotel_id"], ["id", "hotel_id"], ondelete="RESTRICT",
    )

    # 4. Rebuild the summary view on the new column.
    op.execute("DROP VIEW IF EXISTS hotel_booking_summary;")
    op.execute(SUMMARY_VIEW)


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS hotel_booking_summary;")
    op.execute(OLD_SUMMARY_VIEW)

    op.drop_constraint("fk_booking_rooms_room_type_hotel", "booking_rooms", type_="foreignkey")
    op.drop_constraint("fk_booking_rooms_booking_hotel", "booking_rooms", type_="foreignkey")
    op.drop_column("booking_rooms", "hotel_id")

    op.drop_index("idx_bookings_hotel_checkin", table_name="bookings")
    op.drop_constraint("uq_bookings_id_hotel", "bookings", type_="unique")
    op.drop_constraint("bookings_hotel_id_fkey", "bookings", type_="foreignkey")
    op.drop_column("bookings", "hotel_id")
