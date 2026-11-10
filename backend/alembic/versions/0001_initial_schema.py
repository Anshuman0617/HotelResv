"""Initial schema for Hotel Booking System (9 tables, constraints, indexes, and view).

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-11-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS citext;")

    # 1. users
    op.create_table(
        "users",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("full_name", sa.String(length=120), nullable=False),
        sa.Column("email", postgresql.CITEXT(), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("phone", sa.String(length=25), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )

    # 2. hotels
    op.create_table(
        "hotels",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("address_line", sa.String(length=255), nullable=False),
        sa.Column("city", sa.String(length=100), nullable=False),
        sa.Column("state", sa.String(length=100), nullable=True),
        sa.Column("country", sa.String(length=100), nullable=False),
        sa.Column("postal_code", sa.String(length=20), nullable=True),
        sa.Column("timezone", sa.String(length=64), nullable=False),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default="pending",
            nullable=False,
        ),
        sa.Column("registered_by", sa.BigInteger(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'active', 'suspended')",
            name="ck_hotels_status",
        ),
        sa.ForeignKeyConstraint(["registered_by"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_hotels_city_status", "hotels", ["city", "status"], unique=False)

    # 3. hotel_members
    op.create_table(
        "hotel_members",
        sa.Column("hotel_id", sa.BigInteger(), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column(
            "joined_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "role IN ('owner', 'manager', 'staff')",
            name="ck_hotel_members_role",
        ),
        sa.ForeignKeyConstraint(["hotel_id"], ["hotels.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("hotel_id", "user_id"),
    )

    # 4. room_types
    op.create_table(
        "room_types",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("hotel_id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("max_guests", sa.SmallInteger(), nullable=False),
        sa.Column("base_price", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("max_guests > 0", name="ck_room_types_max_guests_pos"),
        sa.CheckConstraint("base_price >= 0", name="ck_room_types_base_price_nonneg"),
        sa.ForeignKeyConstraint(["hotel_id"], ["hotels.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("hotel_id", "name", name="uq_room_types_hotel_name"),
        sa.UniqueConstraint("id", "hotel_id", name="uq_room_types_id_hotel"),
    )
    op.create_index("idx_room_types_hotel_id", "room_types", ["hotel_id"], unique=False)

    # 5. rooms
    op.create_table(
        "rooms",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("hotel_id", sa.BigInteger(), nullable=False),
        sa.Column("room_type_id", sa.BigInteger(), nullable=False),
        sa.Column("room_number", sa.String(length=20), nullable=False),
        sa.Column("floor", sa.SmallInteger(), nullable=True),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default="active",
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('active', 'maintenance', 'inactive')",
            name="ck_rooms_status",
        ),
        sa.ForeignKeyConstraint(["hotel_id"], ["hotels.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["room_type_id"], ["room_types.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(
            ["room_type_id", "hotel_id"],
            ["room_types.id", "room_types.hotel_id"],
            name="fk_rooms_room_type_hotel_match",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("hotel_id", "room_number", name="uq_rooms_hotel_room_number"),
        sa.UniqueConstraint("id", "room_type_id", name="uq_rooms_id_room_type"),
    )
    op.create_index(
        "idx_rooms_hotel_type_status",
        "rooms",
        ["hotel_id", "room_type_id", "status"],
        unique=False,
    )

    # 6. bookings
    op.create_table(
        "bookings",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("check_in", sa.Date(), nullable=False),
        sa.Column("check_out", sa.Date(), nullable=False),
        sa.Column("guest_count", sa.SmallInteger(), nullable=False),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default="pending",
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("check_out > check_in", name="ck_bookings_valid_dates"),
        sa.CheckConstraint("guest_count > 0", name="ck_bookings_guest_count_pos"),
        sa.CheckConstraint(
            "status IN ('pending', 'confirmed', 'cancelled', 'completed')",
            name="ck_bookings_status",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_bookings_user_checkin",
        "bookings",
        ["user_id", "check_in"],
        unique=False,
    )

    # 7. booking_rooms
    op.create_table(
        "booking_rooms",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("booking_id", sa.BigInteger(), nullable=False),
        sa.Column("room_type_id", sa.BigInteger(), nullable=False),
        sa.Column("room_id", sa.BigInteger(), nullable=True),
        sa.Column("nightly_rate", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("guest_count", sa.SmallInteger(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("nightly_rate >= 0", name="ck_booking_rooms_nightly_rate_nonneg"),
        sa.CheckConstraint("guest_count > 0", name="ck_booking_rooms_guest_count_pos"),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["room_id"], ["rooms.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["room_type_id"], ["room_types.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(
            ["room_id", "room_type_id"],
            ["rooms.id", "rooms.room_type_id"],
            name="fk_booking_rooms_room_type_match",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_booking_rooms_booking_id", "booking_rooms", ["booking_id"], unique=False)

    # 8. payments
    op.create_table(
        "payments",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("booking_id", sa.BigInteger(), nullable=False),
        sa.Column("provider", sa.String(length=40), nullable=False),
        sa.Column("provider_reference", sa.String(length=160), nullable=True),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column(
            "currency",
            sa.CHAR(length=3),
            server_default="INR",
            nullable=False,
        ),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("amount > 0", name="ck_payments_amount_pos"),
        sa.CheckConstraint(
            "status IN ('initiated', 'successful', 'failed', 'refunded')",
            name="ck_payments_status",
        ),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider_reference"),
    )
    op.create_index("idx_payments_booking_id", "payments", ["booking_id"], unique=False)

    # 9. reviews
    op.create_table(
        "reviews",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("booking_id", sa.BigInteger(), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("hotel_id", sa.BigInteger(), nullable=False),
        sa.Column("rating", sa.SmallInteger(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("rating BETWEEN 1 AND 5", name="ck_reviews_rating_range"),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["hotel_id"], ["hotels.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("booking_id"),
    )
    op.create_index("idx_reviews_hotel_id", "reviews", ["hotel_id"], unique=False)

    # Hotel booking summary view for manager reporting
    op.execute(
        """
        CREATE OR REPLACE VIEW hotel_booking_summary AS
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
    )


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS hotel_booking_summary;")
    op.drop_index("idx_reviews_hotel_id", table_name="reviews")
    op.drop_table("reviews")
    op.drop_index("idx_payments_booking_id", table_name="payments")
    op.drop_table("payments")
    op.drop_index("idx_booking_rooms_booking_id", table_name="booking_rooms")
    op.drop_table("booking_rooms")
    op.drop_index("idx_bookings_user_checkin", table_name="bookings")
    op.drop_table("bookings")
    op.drop_index("idx_rooms_hotel_type_status", table_name="rooms")
    op.drop_table("rooms")
    op.drop_index("idx_room_types_hotel_id", table_name="room_types")
    op.drop_table("room_types")
    op.drop_table("hotel_members")
    op.drop_index("idx_hotels_city_status", table_name="hotels")
    op.drop_table("hotels")
    op.drop_table("users")
