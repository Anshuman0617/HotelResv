"""Manager reporting queries.

Each statement mirrors a query in ``database/queries.sql`` (or the
``hotel_booking_summary`` view in ``database/views.sql``), scoped to one hotel
where the report is hotel-specific. All values are passed as bind parameters.
"""

from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

# View: hotel_booking_summary (database/views.sql)
SUMMARY_SQL = text(
    """
    SELECT *
    FROM hotel_booking_summary
    WHERE hotel_id = :hotel_id
    """
)

# Query 2: booking history with rooms, totals, latest payment and review rating.
# Rooms are aggregated before joining payments so totals are not multiplied, and
# the latest payment is chosen by time rather than alphabetically.
BOOKINGS_SQL = text(
    """
    WITH room_totals AS (
        SELECT br.booking_id, rt.hotel_id, COUNT(*) AS rooms_booked,
               SUM(br.nightly_rate) AS nightly_total
        FROM booking_rooms br
        JOIN room_types rt ON rt.id = br.room_type_id
        WHERE rt.hotel_id = :hotel_id
        GROUP BY br.booking_id, rt.hotel_id
    )
    SELECT b.id AS booking_id, u.id AS user_id, u.full_name AS customer_name,
           u.email AS customer_email, h.id AS hotel_id, h.name AS hotel_name,
           h.city AS hotel_city, b.check_in, b.check_out,
           b.check_out - b.check_in AS nights, b.guest_count,
           b.status AS booking_status, b.created_at, rooms.rooms_booked,
           rooms.nightly_total * (b.check_out - b.check_in) AS calculated_room_total,
           COALESCE(latest.status, 'unpaid') AS latest_payment_status,
           rv.rating AS review_rating
    FROM bookings b
    JOIN users u ON u.id = b.user_id
    JOIN room_totals rooms ON rooms.booking_id = b.id
    JOIN hotels h ON h.id = rooms.hotel_id
    LEFT JOIN LATERAL (
        SELECT p.status FROM payments p WHERE p.booking_id = b.id
        ORDER BY p.created_at DESC, p.id DESC LIMIT 1
    ) latest ON TRUE
    LEFT JOIN reviews rv ON rv.booking_id = b.id
    ORDER BY b.created_at DESC, b.id DESC
    LIMIT :limit OFFSET :offset
    """
)

# Query 3: monthly revenue from successful payments.
REVENUE_SQL = text(
    """
    WITH booking_hotel AS (
        SELECT DISTINCT br.booking_id, rt.hotel_id
        FROM booking_rooms br
        JOIN room_types rt ON rt.id = br.room_type_id
    )
    SELECT h.id AS hotel_id, h.name AS hotel_name, h.city,
           TO_CHAR(DATE_TRUNC('month', p.paid_at), 'YYYY-MM') AS revenue_month,
           COUNT(DISTINCT p.booking_id) AS paid_bookings_count,
           SUM(p.amount) AS monthly_revenue
    FROM payments p
    JOIN booking_hotel bh ON bh.booking_id = p.booking_id
    JOIN hotels h ON h.id = bh.hotel_id
    WHERE p.status = 'successful'
      AND p.paid_at IS NOT NULL
      AND bh.hotel_id = :hotel_id
    GROUP BY h.id, h.name, h.city, DATE_TRUNC('month', p.paid_at)
    ORDER BY revenue_month DESC
    """
)

# Query 4: most popular room types by booking volume.
POPULAR_ROOM_TYPES_SQL = text(
    """
    SELECT h.id AS hotel_id, h.name AS hotel_name, h.city,
           rt.id AS room_type_id, rt.name AS room_type_name,
           rt.base_price AS current_base_price,
           COUNT(br.id) AS times_booked,
           ROUND(AVG(br.nightly_rate), 2) AS avg_booked_nightly_rate,
           SUM(br.nightly_rate * (b.check_out - b.check_in)) AS total_room_revenue
    FROM room_types rt
    JOIN hotels h ON h.id = rt.hotel_id
    JOIN booking_rooms br ON br.room_type_id = rt.id
    JOIN bookings b ON b.id = br.booking_id
    WHERE b.status IN ('confirmed', 'completed')
      AND h.id = :hotel_id
    GROUP BY h.id, h.name, h.city, rt.id, rt.name, rt.base_price
    ORDER BY times_booked DESC, total_room_revenue DESC
    LIMIT 15
    """
)

# Query 5: top-rated hotels with a minimum review threshold (compares hotels).
TOP_RATED_HOTELS_SQL = text(
    """
    SELECT h.id AS hotel_id, h.name AS hotel_name, h.city,
           COUNT(rv.id) AS total_reviews,
           ROUND(AVG(rv.rating)::numeric, 2) AS average_rating,
           MIN(rv.rating) AS min_rating,
           MAX(rv.rating) AS max_rating
    FROM hotels h
    JOIN reviews rv ON rv.hotel_id = h.id
    GROUP BY h.id, h.name, h.city
    HAVING COUNT(rv.id) >= 3
       AND AVG(rv.rating) >= 3.5
    ORDER BY average_rating DESC, total_reviews DESC
    """
)

# Query 6: customers with more than one booking at this hotel, with spend.
REPEAT_CUSTOMERS_SQL = text(
    """
    WITH hotel_bookings AS (
        SELECT DISTINCT br.booking_id
        FROM booking_rooms br
        JOIN room_types rt ON rt.id = br.room_type_id
        WHERE rt.hotel_id = :hotel_id
    ),
    customer_booking_metrics AS (
        SELECT u.id AS user_id, u.full_name, u.email,
               COUNT(b.id) AS total_bookings,
               COUNT(b.id) FILTER (WHERE b.status IN ('confirmed', 'completed'))
                   AS active_or_completed_bookings,
               SUM(b.check_out - b.check_in) AS total_nights_booked,
               MIN(b.check_in) AS first_check_in,
               MAX(b.check_in) AS latest_check_in
        FROM users u
        JOIN bookings b ON b.user_id = u.id
        JOIN hotel_bookings hb ON hb.booking_id = b.id
        GROUP BY u.id, u.full_name, u.email
        HAVING COUNT(b.id) > 1
    ),
    customer_spend AS (
        SELECT b.user_id,
               COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'successful'), 0.00)
                   AS total_spend
        FROM bookings b
        JOIN hotel_bookings hb ON hb.booking_id = b.id
        LEFT JOIN payments p ON p.booking_id = b.id
        GROUP BY b.user_id
    )
    SELECT cbm.user_id, cbm.full_name, cbm.email, cbm.total_bookings,
           cbm.active_or_completed_bookings, cbm.total_nights_booked,
           cs.total_spend, cbm.first_check_in, cbm.latest_check_in
    FROM customer_booking_metrics cbm
    JOIN customer_spend cs ON cs.user_id = cbm.user_id
    ORDER BY cbm.total_bookings DESC, cs.total_spend DESC
    """
)


def _rows(db: Session, statement, **params: Any) -> list[dict[str, Any]]:
    return [dict(row) for row in db.execute(statement, params).mappings()]


def summary(db: Session, hotel_id: int) -> dict[str, Any] | None:
    rows = _rows(db, SUMMARY_SQL, hotel_id=hotel_id)
    return rows[0] if rows else None


def bookings(db: Session, hotel_id: int, limit: int, offset: int) -> list[dict[str, Any]]:
    return _rows(db, BOOKINGS_SQL, hotel_id=hotel_id, limit=limit, offset=offset)


def monthly_revenue(db: Session, hotel_id: int) -> list[dict[str, Any]]:
    return _rows(db, REVENUE_SQL, hotel_id=hotel_id)


def popular_room_types(db: Session, hotel_id: int) -> list[dict[str, Any]]:
    return _rows(db, POPULAR_ROOM_TYPES_SQL, hotel_id=hotel_id)


def top_rated_hotels(db: Session) -> list[dict[str, Any]]:
    return _rows(db, TOP_RATED_HOTELS_SQL)


def repeat_customers(db: Session, hotel_id: int) -> list[dict[str, Any]]:
    return _rows(db, REPEAT_CUSTOMERS_SQL, hotel_id=hotel_id)
