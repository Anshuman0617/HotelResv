"""Enforce review eligibility in the database with a trigger.

database/schema.sql defined trg_enforce_review_eligibility, but no migration
created it, so databases built with `alembic upgrade head` had no trigger.
This adds the same function and trigger.

A review is accepted only when its booking exists, is completed, belongs to
the reviewing user, and has a room at the reviewed hotel.

Revision ID: 0003_review_eligibility_trigger
Revises: 0002_booking_room_id_index
Create Date: 2026-11-15

"""
from typing import Sequence, Union

from alembic import op

revision: str = "0003_review_eligibility_trigger"
down_revision: Union[str, None] = "0002_booking_room_id_index"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE OR REPLACE FUNCTION enforce_review_eligibility()
        RETURNS TRIGGER AS $$
        DECLARE
            v_booking_user_id BIGINT;
            v_booking_status  VARCHAR(20);
            v_hotel_matches   BOOLEAN;
        BEGIN
            SELECT user_id, status
              INTO v_booking_user_id, v_booking_status
              FROM bookings
             WHERE id = NEW.booking_id;

            IF v_booking_user_id IS NULL THEN
                RAISE EXCEPTION 'Booking % does not exist', NEW.booking_id;
            END IF;

            IF v_booking_user_id <> NEW.user_id THEN
                RAISE EXCEPTION 'Review user_id (%) must match booking user_id (%)',
                    NEW.user_id, v_booking_user_id;
            END IF;

            IF v_booking_status <> 'completed' THEN
                RAISE EXCEPTION 'Reviews can only be submitted for completed bookings (current status: %)',
                    v_booking_status;
            END IF;

            SELECT EXISTS (
                SELECT 1
                  FROM booking_rooms br
                  JOIN room_types rt ON rt.id = br.room_type_id
                 WHERE br.booking_id = NEW.booking_id
                   AND rt.hotel_id = NEW.hotel_id
            ) INTO v_hotel_matches;

            IF NOT v_hotel_matches THEN
                RAISE EXCEPTION 'Review hotel_id (%) does not match the hotel of booking %',
                    NEW.hotel_id, NEW.booking_id;
            END IF;

            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    op.execute(
        """
        CREATE TRIGGER trg_enforce_review_eligibility
        BEFORE INSERT OR UPDATE ON reviews
        FOR EACH ROW
        EXECUTE FUNCTION enforce_review_eligibility();
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_enforce_review_eligibility ON reviews;")
    op.execute("DROP FUNCTION IF EXISTS enforce_review_eligibility();")
