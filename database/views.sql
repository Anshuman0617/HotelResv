-- =============================================================================
-- Hotel Booking System - SQL Views for Manager Dashboard & Analytics
-- Owner: M1 (Database + Technical Lead), Consumed by M6
-- =============================================================================

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
