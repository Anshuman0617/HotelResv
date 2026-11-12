-- =============================================================================
-- Hotel Booking System - Non-Trivial SQL Queries (DBMS Evaluation)
-- Shared by: M1, M3, M4, M6
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Query 1 (Owner: M3): Available hotels and room types for selected dates & guests
-- Concepts: Multi-table joins, NOT EXISTS date-overlap check, GROUP BY, HAVING
-- -----------------------------------------------------------------------------
SELECT
    h.id AS hotel_id,
    h.name AS hotel_name,
    h.city,
    rt.id AS room_type_id,
    rt.name AS room_type_name,
    rt.max_guests,
    rt.base_price,
    COUNT(r.id) AS available_rooms_count
FROM hotels h
JOIN room_types rt ON rt.hotel_id = h.id
JOIN rooms r ON r.room_type_id = rt.id AND r.hotel_id = h.id
WHERE h.status = 'active'
  AND h.city = 'Mumbai'
  AND r.status = 'active'
  AND rt.max_guests >= 2
  AND NOT EXISTS (
      SELECT 1
      FROM booking_rooms br
      JOIN bookings b ON b.id = br.booking_id
      WHERE br.room_id = r.id
        AND b.status IN ('pending', 'confirmed')
        AND b.check_in < DATE '2026-12-20'
        AND b.check_out > DATE '2026-12-15'
  )
GROUP BY h.id, h.name, h.city, rt.id, rt.name, rt.max_guests, rt.base_price
HAVING COUNT(r.id) > 0
ORDER BY rt.base_price ASC;


-- -----------------------------------------------------------------------------
-- Query 2 (Owner: M4): Complete customer booking history with hotel, rooms,
-- payment status, and review rating
-- Concepts: 6-table JOIN / LEFT JOIN, aggregation, date arithmetic
-- -----------------------------------------------------------------------------
SELECT
    b.id AS booking_id,
    u.full_name AS customer_name,
    u.email AS customer_email,
    h.name AS hotel_name,
    h.city AS hotel_city,
    b.check_in,
    b.check_out,
    (b.check_out - b.check_in) AS nights,
    b.status AS booking_status,
    COUNT(DISTINCT br.id) AS rooms_booked,
    SUM(br.nightly_rate * (b.check_out - b.check_in)) AS calculated_room_total,
    COALESCE(MAX(p.status), 'unpaid') AS latest_payment_status,
    rv.rating AS review_rating
FROM bookings b
JOIN users u ON u.id = b.user_id
JOIN booking_rooms br ON br.booking_id = b.id
JOIN room_types rt ON rt.id = br.room_type_id
JOIN hotels h ON h.id = rt.hotel_id
LEFT JOIN payments p ON p.booking_id = b.id
LEFT JOIN reviews rv ON rv.booking_id = b.id
GROUP BY
    b.id, u.full_name, u.email, h.name, h.city,
    b.check_in, b.check_out, b.status, rv.rating
ORDER BY b.created_at DESC
LIMIT 25;


-- -----------------------------------------------------------------------------
-- Query 3 (Owner: M6): Monthly revenue per hotel from successful payments
-- Concepts: DATE_TRUNC, SUM, COUNT, GROUP BY, ORDER BY
-- -----------------------------------------------------------------------------
WITH booking_hotel AS (
    SELECT DISTINCT
        br.booking_id,
        rt.hotel_id
    FROM booking_rooms br
    JOIN room_types rt ON rt.id = br.room_type_id
)
SELECT
    h.id AS hotel_id,
    h.name AS hotel_name,
    h.city,
    TO_CHAR(DATE_TRUNC('month', p.paid_at), 'YYYY-MM') AS revenue_month,
    COUNT(DISTINCT p.booking_id) AS paid_bookings_count,
    SUM(p.amount) AS monthly_revenue
FROM payments p
JOIN booking_hotel bh ON bh.booking_id = p.booking_id
JOIN hotels h ON h.id = bh.hotel_id
WHERE p.status = 'successful'
  AND p.paid_at IS NOT NULL
GROUP BY h.id, h.name, h.city, DATE_TRUNC('month', p.paid_at)
ORDER BY revenue_month DESC, monthly_revenue DESC;


-- -----------------------------------------------------------------------------
-- Query 4 (Owner: M6): Most popular room types across hotels by booking volume
-- Concepts: Multiple joins, COUNT, AVG, SUM, GROUP BY, ORDER BY
-- -----------------------------------------------------------------------------
SELECT
    h.id AS hotel_id,
    h.name AS hotel_name,
    h.city,
    rt.id AS room_type_id,
    rt.name AS room_type_name,
    rt.base_price AS current_base_price,
    COUNT(br.id) AS times_booked,
    ROUND(AVG(br.nightly_rate), 2) AS avg_booked_nightly_rate,
    SUM(br.nightly_rate * (b.check_out - b.check_in)) AS total_room_revenue
FROM room_types rt
JOIN hotels h ON h.id = rt.hotel_id
JOIN booking_rooms br ON br.room_type_id = rt.id
JOIN bookings b ON b.id = br.booking_id
WHERE b.status IN ('confirmed', 'completed')
GROUP BY h.id, h.name, h.city, rt.id, rt.name, rt.base_price
ORDER BY times_booked DESC, total_room_revenue DESC
LIMIT 15;


-- -----------------------------------------------------------------------------
-- Query 5 (Owner: M6): Top-rated hotels with minimum review threshold
-- Concepts: AVG, COUNT, MIN, MAX, GROUP BY, HAVING
-- -----------------------------------------------------------------------------
SELECT
    h.id AS hotel_id,
    h.name AS hotel_name,
    h.city,
    COUNT(rv.id) AS total_reviews,
    ROUND(AVG(rv.rating)::numeric, 2) AS average_rating,
    MIN(rv.rating) AS min_rating,
    MAX(rv.rating) AS max_rating
FROM hotels h
JOIN reviews rv ON rv.hotel_id = h.id
GROUP BY h.id, h.name, h.city
HAVING COUNT(rv.id) >= 3
   AND AVG(rv.rating) >= 3.5
ORDER BY average_rating DESC, total_reviews DESC;


-- -----------------------------------------------------------------------------
-- Query 6 (Owner: M1): Customers with multiple bookings and lifetime value metrics
-- Concepts: CTEs, subquery/window aggregation, HAVING, multi-table joins
-- -----------------------------------------------------------------------------
WITH customer_booking_metrics AS (
    SELECT
        u.id AS user_id,
        u.full_name,
        u.email,
        COUNT(DISTINCT b.id) AS total_bookings,
        COUNT(DISTINCT b.id) FILTER (WHERE b.status IN ('confirmed', 'completed')) AS active_or_completed_bookings,
        COUNT(DISTINCT rt.hotel_id) AS distinct_hotels_visited,
        SUM(b.check_out - b.check_in) AS total_nights_booked,
        MIN(b.check_in) AS first_check_in,
        MAX(b.check_in) AS latest_check_in
    FROM users u
    JOIN bookings b ON b.user_id = u.id
    JOIN booking_rooms br ON br.booking_id = b.id
    JOIN room_types rt ON rt.id = br.room_type_id
    GROUP BY u.id, u.full_name, u.email
    HAVING COUNT(DISTINCT b.id) > 1
),
customer_spend AS (
    SELECT
        b.user_id,
        COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'successful'), 0.00) AS lifetime_spend
    FROM bookings b
    LEFT JOIN payments p ON p.booking_id = b.id
    GROUP BY b.user_id
)
SELECT
    cbm.user_id,
    cbm.full_name,
    cbm.email,
    cbm.total_bookings,
    cbm.active_or_completed_bookings,
    cbm.distinct_hotels_visited,
    cbm.total_nights_booked,
    cs.lifetime_spend,
    cbm.first_check_in,
    cbm.latest_check_in
FROM customer_booking_metrics cbm
JOIN customer_spend cs ON cs.user_id = cbm.user_id
ORDER BY cbm.total_bookings DESC, cs.lifetime_spend DESC;
