-- =============================================================================
-- Hotel Booking System - PostgreSQL Relational Database Schema (3NF)
-- Owner: M1 (Database + Technical Lead)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS citext;

-- Drop existing objects in reverse dependency order for clean re-initialization
DROP VIEW IF EXISTS hotel_booking_summary;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS booking_rooms CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS room_types CASCADE;
DROP TABLE IF EXISTS hotel_members CASCADE;
DROP TABLE IF EXISTS hotels CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =============================================================================
-- 1. Table: users
-- =============================================================================
CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    full_name       VARCHAR(120) NOT NULL,
    email           CITEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    phone           VARCHAR(25) NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 2. Table: hotels
-- =============================================================================
CREATE TABLE hotels (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(180) NOT NULL,
    description     TEXT NULL,
    address_line    VARCHAR(255) NOT NULL,
    city            VARCHAR(100) NOT NULL,
    state           VARCHAR(100) NULL,
    country         VARCHAR(100) NOT NULL,
    postal_code     VARCHAR(20) NULL,
    timezone        VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    registered_by   BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_hotels_status
        CHECK (status IN ('pending', 'active', 'suspended'))
);

-- =============================================================================
-- 3. Table: hotel_members
-- =============================================================================
CREATE TABLE hotel_members (
    hotel_id        BIGINT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (hotel_id, user_id),
    CONSTRAINT ck_hotel_members_role
        CHECK (role IN ('owner', 'manager', 'staff'))
);

-- =============================================================================
-- 4. Table: room_types
-- =============================================================================
CREATE TABLE room_types (
    id              BIGSERIAL PRIMARY KEY,
    hotel_id        BIGINT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    description     TEXT NULL,
    max_guests      SMALLINT NOT NULL,
    base_price      NUMERIC(12, 2) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_room_types_hotel_name
        UNIQUE (hotel_id, name),
    CONSTRAINT uq_room_types_id_hotel
        UNIQUE (id, hotel_id),
    CONSTRAINT ck_room_types_max_guests_pos
        CHECK (max_guests > 0),
    CONSTRAINT ck_room_types_base_price_nonneg
        CHECK (base_price >= 0)
);

-- =============================================================================
-- 5. Table: rooms
-- =============================================================================
CREATE TABLE rooms (
    id              BIGSERIAL PRIMARY KEY,
    hotel_id        BIGINT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    room_type_id    BIGINT NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
    room_number     VARCHAR(20) NOT NULL,
    floor           SMALLINT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    CONSTRAINT uq_rooms_hotel_room_number
        UNIQUE (hotel_id, room_number),
    CONSTRAINT uq_rooms_id_room_type
        UNIQUE (id, room_type_id),
    CONSTRAINT fk_rooms_room_type_hotel_match
        FOREIGN KEY (room_type_id, hotel_id)
        REFERENCES room_types(id, hotel_id) ON DELETE RESTRICT,
    CONSTRAINT ck_rooms_status
        CHECK (status IN ('active', 'maintenance', 'inactive'))
);

-- =============================================================================
-- 6. Table: bookings
-- =============================================================================
CREATE TABLE bookings (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    check_in        DATE NOT NULL,
    check_out       DATE NOT NULL,
    guest_count     SMALLINT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_bookings_valid_dates
        CHECK (check_out > check_in),
    CONSTRAINT ck_bookings_guest_count_pos
        CHECK (guest_count > 0),
    CONSTRAINT ck_bookings_status
        CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed'))
);

-- =============================================================================
-- 7. Table: booking_rooms
-- =============================================================================
CREATE TABLE booking_rooms (
    id              BIGSERIAL PRIMARY KEY,
    booking_id      BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    room_type_id    BIGINT NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
    room_id         BIGINT NULL REFERENCES rooms(id) ON DELETE SET NULL,
    nightly_rate    NUMERIC(12, 2) NOT NULL,
    guest_count     SMALLINT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_booking_rooms_room_type_match
        FOREIGN KEY (room_id, room_type_id)
        REFERENCES rooms(id, room_type_id) ON DELETE RESTRICT,
    CONSTRAINT ck_booking_rooms_nightly_rate_nonneg
        CHECK (nightly_rate >= 0),
    CONSTRAINT ck_booking_rooms_guest_count_pos
        CHECK (guest_count > 0)
);

-- =============================================================================
-- 8. Table: payments
-- =============================================================================
CREATE TABLE payments (
    id                  BIGSERIAL PRIMARY KEY,
    booking_id          BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    provider            VARCHAR(40) NOT NULL,
    provider_reference  VARCHAR(160) NULL UNIQUE,
    amount              NUMERIC(12, 2) NOT NULL,
    currency            CHAR(3) NOT NULL DEFAULT 'INR',
    status              VARCHAR(20) NOT NULL,
    paid_at             TIMESTAMPTZ NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_payments_amount_pos
        CHECK (amount > 0),
    CONSTRAINT ck_payments_status
        CHECK (status IN ('initiated', 'successful', 'failed', 'refunded'))
);

-- =============================================================================
-- 9. Table: reviews
-- =============================================================================
CREATE TABLE reviews (
    id              BIGSERIAL PRIMARY KEY,
    booking_id      BIGINT NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    hotel_id        BIGINT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    rating          SMALLINT NOT NULL,
    comment         TEXT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_reviews_rating_range
        CHECK (rating BETWEEN 1 AND 5)
);

-- =============================================================================
-- Trigger: Validate review eligibility (completed booking, matching user & hotel)
-- =============================================================================
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
        RAISE EXCEPTION 'Review user_id (%) must match booking user_id (%)', NEW.user_id, v_booking_user_id;
    END IF;

    IF v_booking_status <> 'completed' THEN
        RAISE EXCEPTION 'Reviews can only be submitted for completed bookings (current status: %)', v_booking_status;
    END IF;

    SELECT EXISTS (
        SELECT 1
          FROM booking_rooms br
          JOIN room_types rt ON rt.id = br.room_type_id
         WHERE br.booking_id = NEW.booking_id
           AND rt.hotel_id = NEW.hotel_id
    ) INTO v_hotel_matches;

    IF NOT v_hotel_matches THEN
        RAISE EXCEPTION 'Review hotel_id (%) does not match the hotel of booking %', NEW.hotel_id, NEW.booking_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_review_eligibility
BEFORE INSERT OR UPDATE ON reviews
FOR EACH ROW
EXECUTE FUNCTION enforce_review_eligibility();
