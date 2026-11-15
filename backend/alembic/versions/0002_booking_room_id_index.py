"""Index booking_rooms.room_id for per-room booking history.

PostgreSQL does not index foreign-key columns automatically. The manager's
room history looks bookings up by room, and the availability check in
booking_service filters booking_rooms by room_id too.

Revision ID: 0002_booking_room_id_index
Revises: 0001_initial_schema
Create Date: 2026-11-15

"""
from typing import Sequence, Union

from alembic import op

revision: str = "0002_booking_room_id_index"
down_revision: Union[str, None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index("idx_booking_rooms_room_id", "booking_rooms", ["room_id"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_booking_rooms_room_id", table_name="booking_rooms")
