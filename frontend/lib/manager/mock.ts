export type HotelStatus = "pending" | "active" | "suspended";

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed";

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

export type PhysicalRoom = {
  id: number;
  hotel_id: number;
  room_type_id: number;
  room_number: string;
  floor: number | null;
  status: RoomStatus;
};

export type RoomStatus = "active" | "maintenance" | "inactive";
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

export type RecentReservation = {
  id: number;
  guestName: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  status: ReservationStatus;
  amount: number;
};

export type HotelDashboard = {
  hotelId: number;
  totalBookings: number;
  totalRevenue: number;
  availableRooms: number;
  recentReservations: RecentReservation[];
};

export type ReservationRoom = {
  id: number;
  room_type_id: number;
  room_type_name: string;
  room_id: number | null;
  room_number: string | null;
  nightly_rate: number;
  guest_count: number;
};

export type ManagerReservation = {
  id: number;
  user_id: number;
  hotel_id: number;
  guest_name: string;
  guest_email: string;
  check_in: string;
  check_out: string;
  guest_count: number;
  status: ReservationStatus;
  created_at: string;
  rooms: ReservationRoom[];
};

export type PaymentStatus = "successful" | "pending" | "failed" | "refunded";

export type ManagerPayment = {
  id: string;
  reservation_id: number;
  hotel_id: number;
  guest_name: string;
  amount: number;
  method: "UPI" | "Credit card" | "Debit card" | "Net banking";
  status: PaymentStatus;
  payment_date: string;
};

export type ManagerReview = {
  id: number;
  reservation_id: number;
  hotel_id: number;
  guest_name: string;
  rating: number;
  comment: string;
  review_date: string;
};

export type MonthlyRevenueResult = {
  hotel_id: number;
  hotel_name: string;
  city: string;
  revenue_month: string;
  paid_bookings_count: number;
  monthly_revenue: number;
};

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

export type HotelRatingResult = {
  hotel_id: number;
  hotel_name: string;
  city: string;
  total_reviews: number;
  average_rating: number;
  min_rating: number;
  max_rating: number;
};

export type MockReportPreview<T> = {
  source: "mock";
  rows: T[];
};

export type HotelRatingMockPreview = MockReportPreview<HotelRatingResult> & {
  hotelsWithoutReviews: number[];
};

export const managerHotels: ManagerHotel[] = [
  {
    id: 1,
    name: "Harbour View Inn",
    description: "A contemporary waterfront stay near Mumbai's historic harbour.",
    address_line: "18 Apollo Bunder Road",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    postal_code: "400001",
    timezone: "Asia/Kolkata",
    status: "active",
    registered_by: 1,
    created_at: "2025-03-12T10:00:00+05:30",
  },
  {
    id: 2,
    name: "Lotus Court",
    description: "A quiet boutique hotel close to Bengaluru's central business district.",
    address_line: "42 Residency Road",
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    postal_code: "560025",
    timezone: "Asia/Kolkata",
    status: "active",
    registered_by: 1,
    created_at: "2025-05-08T10:00:00+05:30",
  },
  {
    id: 3,
    name: "Ridge House",
    description: "A relaxed heritage-inspired retreat overlooking the old city.",
    address_line: "7 Amer Road",
    city: "Jaipur",
    state: "Rajasthan",
    country: "India",
    postal_code: "302002",
    timezone: "Asia/Kolkata",
    status: "pending",
    registered_by: 1,
    created_at: "2025-08-21T10:00:00+05:30",
  },
];

export const managerRoomTypes: RoomType[] = [
  {
    id: 101,
    hotel_id: 1,
    name: "Harbour Deluxe",
    description: "King bed with a partial harbour view.",
    max_guests: 2,
    base_price: 8500,
    created_at: "2025-03-13T10:00:00+05:30",
  },
  {
    id: 102,
    hotel_id: 1,
    name: "Family Suite",
    description: "Two bedrooms with a separate living area.",
    max_guests: 4,
    base_price: 15200,
    created_at: "2025-03-13T10:00:00+05:30",
  },
  {
    id: 103,
    hotel_id: 1,
    name: "Garden Studio",
    description: "A comfortable studio overlooking the courtyard.",
    max_guests: 2,
    base_price: 6900,
    created_at: "2025-03-14T10:00:00+05:30",
  },
  {
    id: 201,
    hotel_id: 2,
    name: "City Queen",
    description: "Queen room with a work desk and city views.",
    max_guests: 2,
    base_price: 7200,
    created_at: "2025-05-09T10:00:00+05:30",
  },
  {
    id: 202,
    hotel_id: 2,
    name: "Courtyard Suite",
    description: "Spacious suite opening onto the inner courtyard.",
    max_guests: 3,
    base_price: 11800,
    created_at: "2025-05-09T10:00:00+05:30",
  },
  {
    id: 301,
    hotel_id: 3,
    name: "Heritage King",
    description: "King room with hand-crafted local furnishings.",
    max_guests: 2,
    base_price: 9400,
    created_at: "2025-08-22T10:00:00+05:30",
  },
  {
    id: 302,
    hotel_id: 3,
    name: "Terrace Suite",
    description: "Suite with a private terrace and old-city views.",
    max_guests: 3,
    base_price: 16400,
    created_at: "2025-08-22T10:00:00+05:30",
  },
];

export const managerRooms: PhysicalRoom[] = [
  { id: 1001, hotel_id: 1, room_type_id: 101, room_number: "201", floor: 2, status: "active" },
  { id: 1002, hotel_id: 1, room_type_id: 101, room_number: "202", floor: 2, status: "active" },
  { id: 1003, hotel_id: 1, room_type_id: 102, room_number: "301", floor: 3, status: "maintenance" },
  { id: 1004, hotel_id: 1, room_type_id: 102, room_number: "302", floor: 3, status: "active" },
  { id: 1005, hotel_id: 1, room_type_id: 103, room_number: "105", floor: 1, status: "inactive" },
  { id: 2001, hotel_id: 2, room_type_id: 201, room_number: "11", floor: 1, status: "active" },
  { id: 2002, hotel_id: 2, room_type_id: 201, room_number: "12", floor: 1, status: "active" },
  { id: 2003, hotel_id: 2, room_type_id: 202, room_number: "21", floor: 2, status: "maintenance" },
  { id: 3001, hotel_id: 3, room_type_id: 301, room_number: "A1", floor: 1, status: "active" },
  { id: 3002, hotel_id: 3, room_type_id: 302, room_number: "B1", floor: 2, status: "active" },
];

export const managerReservations: ManagerReservation[] = [
  {
    id: 11042,
    user_id: 11,
    hotel_id: 1,
    guest_name: "Ananya Sharma",
    guest_email: "ananya.sharma@example.com",
    check_in: "2026-12-15",
    check_out: "2026-12-18",
    guest_count: 2,
    status: "confirmed",
    created_at: "2026-11-04T09:18:00+05:30",
    rooms: [
      {
        id: 21042,
        room_type_id: 101,
        room_type_name: "Harbour Deluxe",
        room_id: 1001,
        room_number: "201",
        nightly_rate: 8500,
        guest_count: 2,
      },
    ],
  },
  {
    id: 11038,
    user_id: 12,
    hotel_id: 1,
    guest_name: "Rohan Mehta",
    guest_email: "rohan.mehta@example.com",
    check_in: "2026-12-12",
    check_out: "2026-12-14",
    guest_count: 3,
    status: "pending",
    created_at: "2026-11-03T14:42:00+05:30",
    rooms: [
      {
        id: 21038,
        room_type_id: 101,
        room_type_name: "Harbour Deluxe",
        room_id: null,
        room_number: null,
        nightly_rate: 8200,
        guest_count: 2,
      },
      {
        id: 21039,
        room_type_id: 102,
        room_type_name: "Family Suite",
        room_id: null,
        room_number: null,
        nightly_rate: 14500,
        guest_count: 1,
      },
    ],
  },
  {
    id: 11031,
    user_id: 13,
    hotel_id: 1,
    guest_name: "Diya Nair",
    guest_email: "diya.nair@example.com",
    check_in: "2026-10-28",
    check_out: "2026-11-02",
    guest_count: 2,
    status: "completed",
    created_at: "2026-10-10T11:05:00+05:30",
    rooms: [
      {
        id: 21031,
        room_type_id: 103,
        room_type_name: "Garden Studio",
        room_id: 1005,
        room_number: "105",
        nightly_rate: 6800,
        guest_count: 2,
      },
    ],
  },
  {
    id: 11024,
    user_id: 14,
    hotel_id: 1,
    guest_name: "Vikram Iyer",
    guest_email: "vikram.iyer@example.com",
    check_in: "2026-11-20",
    check_out: "2026-11-22",
    guest_count: 2,
    status: "cancelled",
    created_at: "2026-10-28T17:30:00+05:30",
    rooms: [
      {
        id: 21024,
        room_type_id: 101,
        room_type_name: "Harbour Deluxe",
        room_id: null,
        room_number: null,
        nightly_rate: 8500,
        guest_count: 2,
      },
    ],
  },
  {
    id: 20981,
    user_id: 21,
    hotel_id: 2,
    guest_name: "Saanvi Reddy",
    guest_email: "saanvi.reddy@example.com",
    check_in: "2026-12-16",
    check_out: "2026-12-19",
    guest_count: 2,
    status: "confirmed",
    created_at: "2026-11-02T10:10:00+05:30",
    rooms: [
      {
        id: 30981,
        room_type_id: 201,
        room_type_name: "City Queen",
        room_id: 2001,
        room_number: "11",
        nightly_rate: 7200,
        guest_count: 2,
      },
    ],
  },
  {
    id: 20974,
    user_id: 22,
    hotel_id: 2,
    guest_name: "Arjun Patel",
    guest_email: "arjun.patel@example.com",
    check_in: "2026-12-10",
    check_out: "2026-12-13",
    guest_count: 2,
    status: "completed",
    created_at: "2026-10-29T08:55:00+05:30",
    rooms: [
      {
        id: 30974,
        room_type_id: 202,
        room_type_name: "Courtyard Suite",
        room_id: 2003,
        room_number: "21",
        nightly_rate: 11500,
        guest_count: 2,
      },
    ],
  },
  {
    id: 20969,
    user_id: 23,
    hotel_id: 2,
    guest_name: "Meera Joshi",
    guest_email: "meera.joshi@example.com",
    check_in: "2026-12-08",
    check_out: "2026-12-09",
    guest_count: 1,
    status: "pending",
    created_at: "2026-11-06T12:22:00+05:30",
    rooms: [
      {
        id: 30969,
        room_type_id: 201,
        room_type_name: "City Queen",
        room_id: null,
        room_number: null,
        nightly_rate: 7200,
        guest_count: 1,
      },
    ],
  },
  {
    id: 20961,
    user_id: 24,
    hotel_id: 2,
    guest_name: "Nikhil Rao",
    guest_email: "nikhil.rao@example.com",
    check_in: "2026-11-25",
    check_out: "2026-11-27",
    guest_count: 2,
    status: "cancelled",
    created_at: "2026-10-25T16:40:00+05:30",
    rooms: [
      {
        id: 30961,
        room_type_id: 201,
        room_type_name: "City Queen",
        room_id: null,
        room_number: null,
        nightly_rate: 7000,
        guest_count: 2,
      },
    ],
  },
  {
    id: 30612,
    user_id: 31,
    hotel_id: 3,
    guest_name: "Kabir Singh",
    guest_email: "kabir.singh@example.com",
    check_in: "2026-12-22",
    check_out: "2026-12-25",
    guest_count: 3,
    status: "pending",
    created_at: "2026-11-05T13:15:00+05:30",
    rooms: [
      {
        id: 40612,
        room_type_id: 301,
        room_type_name: "Heritage King",
        room_id: 3001,
        room_number: "A1",
        nightly_rate: 9200,
        guest_count: 2,
      },
      {
        id: 40613,
        room_type_id: 302,
        room_type_name: "Terrace Suite",
        room_id: 3002,
        room_number: "B1",
        nightly_rate: 15800,
        guest_count: 1,
      },
    ],
  },
  {
    id: 30608,
    user_id: 32,
    hotel_id: 3,
    guest_name: "Neha Gupta",
    guest_email: "neha.gupta@example.com",
    check_in: "2026-11-18",
    check_out: "2026-11-21",
    guest_count: 2,
    status: "completed",
    created_at: "2026-10-15T10:35:00+05:30",
    rooms: [
      {
        id: 40608,
        room_type_id: 301,
        room_type_name: "Heritage King",
        room_id: 3001,
        room_number: "A1",
        nightly_rate: 9000,
        guest_count: 2,
      },
    ],
  },
  {
    id: 30602,
    user_id: 33,
    hotel_id: 3,
    guest_name: "Ishita Kapoor",
    guest_email: "ishita.kapoor@example.com",
    check_in: "2026-12-05",
    check_out: "2026-12-07",
    guest_count: 2,
    status: "confirmed",
    created_at: "2026-11-01T15:05:00+05:30",
    rooms: [
      {
        id: 40602,
        room_type_id: 302,
        room_type_name: "Terrace Suite",
        room_id: 3002,
        room_number: "B1",
        nightly_rate: 16000,
        guest_count: 2,
      },
    ],
  },
  {
    id: 30597,
    user_id: 34,
    hotel_id: 3,
    guest_name: "Dev Malhotra",
    guest_email: "dev.malhotra@example.com",
    check_in: "2026-11-29",
    check_out: "2026-12-01",
    guest_count: 1,
    status: "cancelled",
    created_at: "2026-10-21T09:40:00+05:30",
    rooms: [
      {
        id: 40597,
        room_type_id: 301,
        room_type_name: "Heritage King",
        room_id: null,
        room_number: null,
        nightly_rate: 9400,
        guest_count: 1,
      },
    ],
  },
];

export const managerPayments: ManagerPayment[] = [
  { id: "PAY-11042", reservation_id: 11042, hotel_id: 1, guest_name: "Ananya Sharma", amount: 25500, method: "UPI", status: "successful", payment_date: "2026-11-04" },
  { id: "PAY-11038", reservation_id: 11038, hotel_id: 1, guest_name: "Rohan Mehta", amount: 45400, method: "Credit card", status: "pending", payment_date: "2026-11-03" },
  { id: "PAY-11031", reservation_id: 11031, hotel_id: 1, guest_name: "Diya Nair", amount: 34000, method: "Debit card", status: "successful", payment_date: "2026-10-10" },
  { id: "PAY-11024", reservation_id: 11024, hotel_id: 1, guest_name: "Vikram Iyer", amount: 17000, method: "Net banking", status: "refunded", payment_date: "2026-10-28" },
  { id: "PAY-20981", reservation_id: 20981, hotel_id: 2, guest_name: "Saanvi Reddy", amount: 21600, method: "UPI", status: "successful", payment_date: "2026-11-02" },
  { id: "PAY-20974", reservation_id: 20974, hotel_id: 2, guest_name: "Arjun Patel", amount: 34500, method: "Credit card", status: "successful", payment_date: "2026-10-29" },
  { id: "PAY-20969", reservation_id: 20969, hotel_id: 2, guest_name: "Meera Joshi", amount: 7200, method: "UPI", status: "pending", payment_date: "2026-11-06" },
  { id: "PAY-20961", reservation_id: 20961, hotel_id: 2, guest_name: "Nikhil Rao", amount: 14000, method: "Debit card", status: "failed", payment_date: "2026-10-25" },
  { id: "PAY-30612", reservation_id: 30612, hotel_id: 3, guest_name: "Kabir Singh", amount: 75000, method: "Credit card", status: "pending", payment_date: "2026-11-05" },
  { id: "PAY-30608", reservation_id: 30608, hotel_id: 3, guest_name: "Neha Gupta", amount: 27000, method: "UPI", status: "successful", payment_date: "2026-10-15" },
  { id: "PAY-30602", reservation_id: 30602, hotel_id: 3, guest_name: "Ishita Kapoor", amount: 32000, method: "Net banking", status: "failed", payment_date: "2026-11-01" },
  { id: "PAY-30597", reservation_id: 30597, hotel_id: 3, guest_name: "Dev Malhotra", amount: 18800, method: "Debit card", status: "refunded", payment_date: "2026-10-21" },
];

export const managerReviews: ManagerReview[] = [
  { id: 1, reservation_id: 11031, hotel_id: 1, guest_name: "Diya Nair", rating: 5, comment: "A peaceful stay, a spotless room, and a lovely view of the harbour. The team made check-in easy.", review_date: "2026-11-04" },
  { id: 2, reservation_id: 11019, hotel_id: 1, guest_name: "Priya Menon", rating: 5, comment: "Wonderful location and thoughtful service throughout our weekend.", review_date: "2026-10-29" },
  { id: 3, reservation_id: 11017, hotel_id: 1, guest_name: "Karan Desai", rating: 5, comment: "The room was comfortable and the breakfast was excellent.", review_date: "2026-10-26" },
  { id: 4, reservation_id: 11015, hotel_id: 1, guest_name: "Aisha Khan", rating: 5, comment: "Beautiful property and very helpful staff. Would happily stay again.", review_date: "2026-10-23" },
  { id: 5, reservation_id: 11012, hotel_id: 1, guest_name: "Rahul Verma", rating: 5, comment: "Great harbour-side location with clean, spacious rooms.", review_date: "2026-10-20" },
  { id: 6, reservation_id: 11009, hotel_id: 1, guest_name: "Sneha Kulkarni", rating: 5, comment: "Everything was smooth from arrival to checkout. The staff were warm and attentive.", review_date: "2026-10-17" },
  { id: 7, reservation_id: 11006, hotel_id: 1, guest_name: "Aditya Rao", rating: 5, comment: "Excellent service and a comfortable bed after a long trip.", review_date: "2026-10-14" },
  { id: 8, reservation_id: 11003, hotel_id: 1, guest_name: "Mira Shah", rating: 5, comment: "A lovely boutique hotel close to the waterfront and city attractions.", review_date: "2026-10-11" },
  { id: 9, reservation_id: 10998, hotel_id: 1, guest_name: "Naveen Bhat", rating: 5, comment: "The team was welcoming and the room was ready right on time.", review_date: "2026-10-08" },
  { id: 10, reservation_id: 10994, hotel_id: 1, guest_name: "Tara Sood", rating: 5, comment: "Quiet, clean, and conveniently located. We enjoyed our stay.", review_date: "2026-10-05" },
  { id: 11, reservation_id: 10991, hotel_id: 1, guest_name: "Ishaan Kapoor", rating: 5, comment: "The harbour view was a highlight, and service was consistently kind.", review_date: "2026-10-02" },
  { id: 12, reservation_id: 10987, hotel_id: 1, guest_name: "Rhea Thomas", rating: 5, comment: "Comfortable rooms and an easy check-in experience.", review_date: "2026-09-29" },
  { id: 13, reservation_id: 10983, hotel_id: 1, guest_name: "Manav Joshi", rating: 5, comment: "A polished stay with attentive staff and a great location.", review_date: "2026-09-26" },
  { id: 14, reservation_id: 10979, hotel_id: 1, guest_name: "Zoya Ali", rating: 4, comment: "Very comfortable and well kept. The breakfast area was busy in the morning.", review_date: "2026-09-23" },
  { id: 15, reservation_id: 10975, hotel_id: 1, guest_name: "Devika Nair", rating: 4, comment: "Friendly staff and a pleasant room; some street noise at night.", review_date: "2026-09-20" },
  { id: 16, reservation_id: 10971, hotel_id: 1, guest_name: "Siddharth Sen", rating: 4, comment: "Good value and a convenient base for exploring Mumbai.", review_date: "2026-09-17" },
  { id: 17, reservation_id: 20958, hotel_id: 2, guest_name: "Lavanya Rao", rating: 5, comment: "A quiet room, excellent service, and an ideal location for work.", review_date: "2026-11-03" },
  { id: 18, reservation_id: 20954, hotel_id: 2, guest_name: "Vivek Nair", rating: 5, comment: "Very comfortable stay. The team was quick to help with every request.", review_date: "2026-10-31" },
  { id: 19, reservation_id: 20950, hotel_id: 2, guest_name: "Amrita Das", rating: 5, comment: "Loved the calm courtyard and the thoughtful breakfast options.", review_date: "2026-10-28" },
  { id: 20, reservation_id: 20946, hotel_id: 2, guest_name: "Sanjay Bose", rating: 5, comment: "Clean, modern room and a seamless check-in process.", review_date: "2026-10-25" },
  { id: 21, reservation_id: 20942, hotel_id: 2, guest_name: "Nisha Krishnan", rating: 5, comment: "The staff were lovely and the hotel was peaceful despite being central.", review_date: "2026-10-22" },
  { id: 22, reservation_id: 20938, hotel_id: 2, guest_name: "Ritvik Shah", rating: 5, comment: "A great business stay with a comfortable desk and reliable service.", review_date: "2026-10-19" },
  { id: 23, reservation_id: 20934, hotel_id: 2, guest_name: "Pooja Iyer", rating: 5, comment: "Spacious room, welcoming staff, and a very enjoyable visit.", review_date: "2026-10-16" },
  { id: 24, reservation_id: 20930, hotel_id: 2, guest_name: "Harish Menon", rating: 5, comment: "Convenient location and a restful room. Everything was well organized.", review_date: "2026-10-13" },
  { id: 25, reservation_id: 20926, hotel_id: 2, guest_name: "Tanya Sethi", rating: 4, comment: "A pleasant stay with good service; the room could use brighter lighting.", review_date: "2026-10-10" },
  { id: 26, reservation_id: 20922, hotel_id: 2, guest_name: "Aarav Kulkarni", rating: 4, comment: "Comfortable and clean, with a lovely courtyard view.", review_date: "2026-10-07" },
  { id: 27, reservation_id: 20918, hotel_id: 2, guest_name: "Madhuri Sen", rating: 4, comment: "Helpful staff and a good location. Breakfast service was a little slow.", review_date: "2026-10-04" },
  { id: 28, reservation_id: 20914, hotel_id: 2, guest_name: "Rakesh Pillai", rating: 3, comment: "The room was comfortable, though check-in took longer than expected.", review_date: "2026-10-01" },
];

export const query3MockPreview: MockReportPreview<MonthlyRevenueResult> = {
  source: "mock",
  rows: [
    { hotel_id: 1, hotel_name: "Harbour View Inn", city: "Mumbai", revenue_month: "2026-11", paid_bookings_count: 12, monthly_revenue: 312400 },
    { hotel_id: 1, hotel_name: "Harbour View Inn", city: "Mumbai", revenue_month: "2026-10", paid_bookings_count: 9, monthly_revenue: 248600 },
    { hotel_id: 2, hotel_name: "Lotus Court", city: "Bengaluru", revenue_month: "2026-11", paid_bookings_count: 8, monthly_revenue: 195200 },
    { hotel_id: 2, hotel_name: "Lotus Court", city: "Bengaluru", revenue_month: "2026-10", paid_bookings_count: 6, monthly_revenue: 163500 },
    { hotel_id: 3, hotel_name: "Ridge House", city: "Jaipur", revenue_month: "2026-11", paid_bookings_count: 5, monthly_revenue: 127800 },
    { hotel_id: 3, hotel_name: "Ridge House", city: "Jaipur", revenue_month: "2026-10", paid_bookings_count: 4, monthly_revenue: 98600 },
  ],
};

export const query4MockPreview: MockReportPreview<PopularRoomTypeResult> = {
  source: "mock",
  rows: [
    { hotel_id: 1, hotel_name: "Harbour View Inn", city: "Mumbai", room_type_id: 101, room_type_name: "Harbour Deluxe", current_base_price: 8500, times_booked: 18, avg_booked_nightly_rate: 8235, total_room_revenue: 684000 },
    { hotel_id: 1, hotel_name: "Harbour View Inn", city: "Mumbai", room_type_id: 102, room_type_name: "Family Suite", current_base_price: 15200, times_booked: 11, avg_booked_nightly_rate: 14800, total_room_revenue: 651200 },
    { hotel_id: 1, hotel_name: "Harbour View Inn", city: "Mumbai", room_type_id: 103, room_type_name: "Garden Studio", current_base_price: 6900, times_booked: 8, avg_booked_nightly_rate: 6700, total_room_revenue: 402000 },
    { hotel_id: 2, hotel_name: "Lotus Court", city: "Bengaluru", room_type_id: 201, room_type_name: "City Queen", current_base_price: 7200, times_booked: 14, avg_booked_nightly_rate: 7050, total_room_revenue: 507600 },
    { hotel_id: 2, hotel_name: "Lotus Court", city: "Bengaluru", room_type_id: 202, room_type_name: "Courtyard Suite", current_base_price: 11800, times_booked: 9, avg_booked_nightly_rate: 11350, total_room_revenue: 510750 },
    { hotel_id: 3, hotel_name: "Ridge House", city: "Jaipur", room_type_id: 301, room_type_name: "Heritage King", current_base_price: 9400, times_booked: 7, avg_booked_nightly_rate: 9100, total_room_revenue: 354900 },
    { hotel_id: 3, hotel_name: "Ridge House", city: "Jaipur", room_type_id: 302, room_type_name: "Terrace Suite", current_base_price: 16400, times_booked: 5, avg_booked_nightly_rate: 15900, total_room_revenue: 397500 },
  ],
};

export const query5MockPreview: HotelRatingMockPreview = {
  source: "mock",
  rows: [
    { hotel_id: 1, hotel_name: "Harbour View Inn", city: "Mumbai", total_reviews: 16, average_rating: 4.81, min_rating: 4, max_rating: 5 },
    { hotel_id: 2, hotel_name: "Lotus Court", city: "Bengaluru", total_reviews: 12, average_rating: 4.58, min_rating: 3, max_rating: 5 },
  ],
  hotelsWithoutReviews: [3],
};

const dashboards: Record<number, HotelDashboard> = {
  1: {
    hotelId: 1,
    totalBookings: 42,
    totalRevenue: 1864500,
    availableRooms: 11,
    recentReservations: [
      {
        id: 1042,
        guestName: "Ananya Sharma",
        checkIn: "2026-12-15",
        checkOut: "2026-12-18",
        rooms: 1,
        status: "confirmed",
        amount: 18500,
      },
      {
        id: 1038,
        guestName: "Rohan Mehta",
        checkIn: "2026-12-12",
        checkOut: "2026-12-14",
        rooms: 2,
        status: "pending",
        amount: 24200,
      },
      {
        id: 1031,
        guestName: "Diya Nair",
        checkIn: "2026-11-28",
        checkOut: "2026-12-02",
        rooms: 1,
        status: "completed",
        amount: 31200,
      },
      {
        id: 1024,
        guestName: "Vikram Iyer",
        checkIn: "2026-11-20",
        checkOut: "2026-11-22",
        rooms: 1,
        status: "cancelled",
        amount: 9800,
      },
    ],
  },
  2: {
    hotelId: 2,
    totalBookings: 27,
    totalRevenue: 942750,
    availableRooms: 6,
    recentReservations: [
      {
        id: 981,
        guestName: "Saanvi Reddy",
        checkIn: "2026-12-16",
        checkOut: "2026-12-19",
        rooms: 1,
        status: "confirmed",
        amount: 15600,
      },
      {
        id: 974,
        guestName: "Arjun Patel",
        checkIn: "2026-12-10",
        checkOut: "2026-12-13",
        rooms: 1,
        status: "completed",
        amount: 21450,
      },
      {
        id: 969,
        guestName: "Meera Joshi",
        checkIn: "2026-12-08",
        checkOut: "2026-12-09",
        rooms: 1,
        status: "pending",
        amount: 7200,
      },
    ],
  },
  3: {
    hotelId: 3,
    totalBookings: 8,
    totalRevenue: 186000,
    availableRooms: 14,
    recentReservations: [
      {
        id: 612,
        guestName: "Kabir Singh",
        checkIn: "2026-12-22",
        checkOut: "2026-12-25",
        rooms: 2,
        status: "pending",
        amount: 27600,
      },
      {
        id: 608,
        guestName: "Neha Gupta",
        checkIn: "2026-11-18",
        checkOut: "2026-11-21",
        rooms: 1,
        status: "completed",
        amount: 14300,
      },
    ],
  },
};

export function getHotelDashboard(hotelId: number): HotelDashboard {
  return dashboards[hotelId] ?? dashboards[managerHotels[0].id];
}
