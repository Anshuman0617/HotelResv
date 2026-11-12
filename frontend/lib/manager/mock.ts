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
