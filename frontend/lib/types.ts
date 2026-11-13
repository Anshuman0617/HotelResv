/**
 * Frontend types mirroring the SQLAlchemy models in backend/app/models.
 *
 * Conventions:
 * - Field names match database column names (snake_case).
 * - DATE / TIMESTAMPTZ columns are ISO-8601 strings.
 * - NUMERIC money columns are numbers (backend serializes Decimal as float).
 * - Status unions match the CHECK constraints in the schema.
 */

export type HotelStatus = "pending" | "active" | "suspended";
export type HotelMemberRole = "owner" | "manager" | "staff";
export type RoomStatus = "active" | "maintenance" | "inactive";
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";
export type PaymentStatus = "initiated" | "successful" | "failed" | "refunded";

/** users (password_hash is never sent to the client). */
export interface User {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  created_at?: string;
}

/** hotels */
export interface Hotel {
  id: number;
  name: string;
  description: string | null;
  address_line: string;
  city: string;
  state: string | null;
  country: string;
  postal_code: string | null;
  timezone: string;
  status: HotelStatus;
  registered_by: number;
  created_at: string;
}

/** hotel_members (composite PK: hotel_id + user_id) */
export interface HotelMember {
  hotel_id: number;
  user_id: number;
  role: HotelMemberRole;
  joined_at: string;
}

/** room_types */
export interface RoomType {
  id: number;
  hotel_id: number;
  name: string;
  description: string | null;
  max_guests: number;
  base_price: number;
  created_at: string;
}

/** rooms (physical rooms) */
export interface Room {
  id: number;
  hotel_id: number;
  room_type_id: number;
  room_number: string;
  floor: number | null;
  status: RoomStatus;
}

/** bookings */
export interface Booking {
  id: number;
  user_id: number;
  check_in: string;
  check_out: string;
  guest_count: number;
  status: BookingStatus;
  created_at: string;
}

/** booking_rooms (room_id is null until a physical room is allocated) */
export interface BookingRoom {
  id: number;
  booking_id: number;
  room_type_id: number;
  room_id: number | null;
  nightly_rate: number;
  guest_count: number;
  created_at: string;
}

/** payments */
export interface Payment {
  id: number;
  booking_id: number;
  provider: string;
  provider_reference: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paid_at: string | null;
  created_at: string;
}

/** reviews (rating is 1-5) */
export interface Review {
  id: number;
  booking_id: number;
  user_id: number;
  hotel_id: number;
  rating: number;
  comment: string | null;
  created_at: string;
}

/** data payload of POST /api/auth/login and /api/auth/register */
export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}
