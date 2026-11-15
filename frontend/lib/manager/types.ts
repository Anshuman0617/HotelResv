/**
 * Types for the manager area. Each one mirrors a backend response; see
 * API_CONTRACTS.md and backend/app/services/report_service.py.
 */

export type HotelStatus = "pending" | "active" | "suspended";
export type HotelRole = "owner" | "manager" | "staff";

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed";

/** GET /api/manager/hotels */
export type ManagerHotel = {
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
  role: HotelRole;
};

export type RoomType = {
  id: number;
  hotel_id: number;
  name: string;
  description: string | null;
  max_guests: number;
  base_price: number;
  created_at: string;
};

export type RoomStatus = "active" | "maintenance" | "inactive";

export type PhysicalRoom = {
  id: number;
  hotel_id: number;
  room_type_id: number;
  room_number: string;
  floor: number | null;
  status: RoomStatus;
};

export type RoomTypeInput = Pick<
  RoomType,
  "name" | "description" | "max_guests" | "base_price"
>;
export type PhysicalRoomInput = Pick<
  PhysicalRoom,
  "room_type_id" | "room_number" | "floor" | "status"
>;

export const hotelStatuses: HotelStatus[] = ["pending", "active", "suspended"];
export const roomStatuses: RoomStatus[] = ["active", "maintenance", "inactive"];

/** GET /api/manager/hotels/{id}/reports/summary (hotel_booking_summary view) */
export type HotelSummaryReport = {
  hotel_id: number;
  hotel_name: string;
  city: string;
  total_bookings: number;
  pending_bookings: number;
  confirmed_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  total_revenue: number;
  review_count: number;
  avg_rating: number | null;
};

/** GET /api/manager/hotels/{id}/reports/bookings (Query 2) */
export type BookingHistoryRow = {
  booking_id: number;
  user_id: number;
  customer_name: string;
  customer_email: string;
  hotel_id: number;
  hotel_name: string;
  hotel_city: string;
  check_in: string;
  check_out: string;
  nights: number;
  guest_count: number;
  booking_status: ReservationStatus;
  created_at: string;
  rooms_booked: number;
  calculated_room_total: number;
  latest_payment_status: string;
  review_rating: number | null;
};

/** GET /api/manager/hotels/{id}/reports/revenue (Query 3) */
export type MonthlyRevenueResult = {
  hotel_id: number;
  hotel_name: string;
  city: string;
  revenue_month: string;
  paid_bookings_count: number;
  monthly_revenue: number;
};

/** GET /api/manager/hotels/{id}/reports/popular-room-types (Query 4) */
export type PopularRoomTypeResult = {
  hotel_id: number;
  hotel_name: string;
  city: string;
  room_type_id: number;
  room_type_name: string;
  current_base_price: number;
  times_booked: number;
  avg_booked_nightly_rate: number;
  total_room_revenue: number;
};

/** GET /api/manager/reports/top-rated-hotels (Query 5) */
export type HotelRatingResult = {
  hotel_id: number;
  hotel_name: string;
  city: string;
  total_reviews: number;
  average_rating: number;
  min_rating: number;
  max_rating: number;
};
