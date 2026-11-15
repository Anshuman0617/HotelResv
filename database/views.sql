-- =============================================================================
-- Hotel Booking System - SQL Views for Manager Dashboard & Analytics
-- Owner: M1 (Database + Technical Lead), Consumed by M6
-- =============================================================================

CREATE OR REPLACE VIEW hotel_booking_summary AS
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
