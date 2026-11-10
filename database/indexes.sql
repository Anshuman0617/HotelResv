-- =============================================================================
-- Hotel Booking System - Performance Indexes & EXPLAIN ANALYZE Verification
-- Owner: M1 (Database + Technical Lead), Verified by M6
-- =============================================================================

-- 1. Hotel discovery by city and active status
CREATE INDEX IF NOT EXISTS idx_hotels_city_status
    ON hotels(city, status);

-- 2. Room type lookup by hotel
CREATE INDEX IF NOT EXISTS idx_room_types_hotel_id
    ON room_types(hotel_id);

-- 3. Physical room lookup by hotel, room type, and operational status
CREATE INDEX IF NOT EXISTS idx_rooms_hotel_type_status
    ON rooms(hotel_id, room_type_id, status);

-- 4. Customer booking lookup and chronological sorting
CREATE INDEX IF NOT EXISTS idx_bookings_user_checkin
    ON bookings(user_id, check_in);

-- 5. Booking room line lookup by parent booking
CREATE INDEX IF NOT EXISTS idx_booking_rooms_booking_id
    ON booking_rooms(booking_id);

-- 6. Payment transaction lookup by booking
CREATE INDEX IF NOT EXISTS idx_payments_booking_id
    ON payments(booking_id);

-- 7. Hotel review lookup and rating aggregation
CREATE INDEX IF NOT EXISTS idx_reviews_hotel_id
    ON reviews(hotel_id);

-- =============================================================================
-- Query Plan Verification (Run after seeding to demonstrate index usage)
-- =============================================================================
-- EXPLAIN ANALYZE SELECT * FROM hotels WHERE city = 'Mumbai' AND status = 'active';
-- EXPLAIN ANALYZE SELECT * FROM rooms WHERE hotel_id = 1 AND room_type_id = 1 AND status = 'active';
-- EXPLAIN ANALYZE SELECT * FROM bookings WHERE user_id = 10 ORDER BY check_in DESC;
-- EXPLAIN ANALYZE SELECT AVG(rating), COUNT(*) FROM reviews WHERE hotel_id = 1;
