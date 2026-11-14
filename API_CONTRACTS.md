# API contracts

All endpoints require `Authorization: Bearer <token>` where authenticated. Successful responses use `{"success": true, "message": "...", "data": ...}`. Dates use `YYYY-MM-DD`; monetary amounts are decimal values in INR. Booking access is limited to the authenticated owner.

## Authentication (Owner: M1)

- `POST /api/auth/register` (201): Register a new user with `full_name`, `email`, `password`, and optional `phone`. Returns access token and user info.
- `POST /api/auth/login`: Login with `email` and `password`. Returns access token and user info.
- `POST /api/auth/google`: Login/Register with Google OAuth `id_token`. Returns access token and user info.
- `GET /api/auth/me`: Retrieve current authenticated user profile. Requires Bearer token.

## Hotels and inventory (Owner: M3)

Public endpoints allow customer hotel browsing and availability search; management endpoints require authenticated hotel membership (`owner`, `manager`, or `staff`).

### Hotel endpoints

- `GET /api/hotels`: List and search active hotels. Query parameters: `city`, `country`, `status` (default `active`), `search` (keyword in name, city, or description), `limit` (default 50), and `offset` (default 0). Returns array of hotels with room types.
- `GET /api/hotels/{id}`: Detailed hotel profile with active room types.
- `POST /api/hotels` (201): Register a new hotel. Requires authentication. The creator is automatically added as `owner` in `hotel_members`.
  ```json
  {"name": "Hotel Taj", "address_line": "Marine Drive", "city": "Mumbai", "country": "India", "timezone": "Asia/Kolkata"}
  ```
- `PUT /api/hotels/{id}`: Update hotel profile details. Requires `owner` or `manager` role in `hotel_members`.
- `GET /api/hotels/{id}/reviews`: Retrieve public guest reviews, count, and aggregate rating.

### Availability search (Query 1)

- `GET /api/hotels/availability?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD&guests=N&city=City`: Executes Query 1 from `database/queries.sql`. Returns available hotels and room types that have unallocated physical rooms for the date range and meet minimum guest capacity, ordered by lowest price.
- `GET /api/hotels/{id}/availability?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD&guests=N`: Scoped availability check for a specific hotel.

### Room types and physical rooms

- `GET /api/hotels/{id}/room-types`: List all room types for a hotel.
- `POST /api/hotels/{id}/room-types` (201): Create a room type with `name`, `description`, `max_guests` (>0), and `base_price` (>=0). Requires `owner` or `manager`.
- `PUT /api/hotels/{id}/room-types/{type_id}`: Update an existing room type. Requires `owner` or `manager`.
- `GET /api/hotels/{id}/rooms`: List physical rooms. Query filters: `room_type_id`, `status`. Requires `owner`, `manager`, or `staff`.
- `POST /api/hotels/{id}/rooms` (201): Add a physical room with `room_type_id`, `room_number`, `floor`, and `status`. Requires `owner` or `manager`.
- `PATCH /api/hotels/{id}/rooms/{room_id}/status`: Change physical room status (`active`, `maintenance`, `inactive`). Requires `owner`, `manager`, or `staff`.

## Create booking

`POST /api/bookings` (201)

```json
{"hotel_id": 1, "check_in": "2027-01-10", "check_out": "2027-01-12", "rooms": [{"room_type_id": 2, "quantity": 2, "guests_per_room": 2}, {"room_type_id": 3, "quantity": 1, "guests_per_room": 1}]}
```

Each type occurs once; quantities and guests per room are positive, each room must fit its guests, and at most 100 rooms may be requested. All types must belong to the same active hotel. Check-in is today or later; checkout is later than check-in. Pending and confirmed bookings reserve rooms, and checkout and check-in on the same date do not overlap. The response contains the booking object below. A booking starts `pending`; rates are snapshots of room type prices.

## Read and cancel

- `GET /api/bookings`: `data` is an array of the customer's bookings, newest first.
- `GET /api/bookings/{id}`: `data` is one booking.
- `POST /api/bookings/{id}/cancel`: pending or confirmed bookings can be cancelled before check-in; successful payments become `refunded`. Returns the booking.
- `POST /api/bookings/{id}/complete`: Confirmed bookings can be completed upon checkout to allow guest review submission. Returns the updated booking.

A booking object contains `id`, `hotel_id`, `check_in`, `check_out`, `guest_count`, `status`, `created_at`, `total`, `rooms`, `payments`, and `review` (null when absent). Each room has `room_type_id`, `room_type_name`, `room_id`, `room_number`, `guest_count`, and `nightly_rate`. Payment entries have `id`, `amount`, `currency`, `status`, `created_at`, and `paid_at`, newest first. A review has `id`, `rating`, and `comment`.

## Payments and reviews

- `POST /api/bookings/{id}/payments` with `{"outcome":"successful"}` or `{"outcome":"failed"}` returns the booking. Failure leaves it pending; success confirms it. Retrying after success returns the existing booking without another successful payment. A positive total is required by the existing payment schema.
- `POST /api/bookings/{id}/reviews` with `{"rating":5,"comment":"Great stay"}` returns 201 and the review's `id`, `booking_id`, `hotel_id`, `rating`, and `comment`. Rating is 1–5; comment may be null. The owner may review once when the booking is `completed` and checkout has passed or is today. A separate team workflow must mark stays completed; this API does not do so.

## Manager reports

Read-only reports that run the SQL from `database/queries.sql` and the
`hotel_booking_summary` view (`database/views.sql`) against PostgreSQL.
Responses use `{"success": true, "message": "...", "data": ...}`.

Hotel reports need a Bearer token for an `owner` or `manager` of that hotel
(`hotel_members`). Staff and non-members get 403; a missing or invalid token
gets 401.

| Endpoint | Source | `data` |
|---|---|---|
| `GET /api/manager/hotels/{hotel_id}/reports/summary` | `hotel_booking_summary` view | one object: booking counts by status, `total_revenue`, `review_count`, `avg_rating` |
| `GET /api/manager/hotels/{hotel_id}/reports/bookings?limit=25&offset=0` | Query 2 | booking history rows; `limit` is 1–100 |
| `GET /api/manager/hotels/{hotel_id}/reports/revenue` | Query 3 | monthly revenue from successful payments, newest month first |
| `GET /api/manager/hotels/{hotel_id}/reports/popular-room-types` | Query 4 | up to 15 room types by times booked |
| `GET /api/manager/hotels/{hotel_id}/reports/repeat-customers` | Query 6 | customers with more than one booking at this hotel |
| `GET /api/manager/reports/top-rated-hotels` | Query 5 | hotels with at least 3 reviews and an average of 3.5 or more; any signed-in user |

Field names match the frontend types in `frontend/lib/manager/mock.ts`
(`MonthlyRevenueResult`, `PopularRoomTypeResult`, `HotelRatingResult`).

## Errors

FastAPI errors use `{"detail":"..."}`; validation errors use a `detail` array. Missing or invalid authentication returns 401. Missing, inactive or inaccessible resources return 404 (another customer's booking is also 404). Invalid input or capacity returns 422. Insufficient availability, invalid state transitions, duplicate reviews, or a nonpositive payment total return 409. The booking and all allocations roll back on failure.

## PostgreSQL integration tests

Use a disposable PostgreSQL database and a user allowed to create schemas and the `citext` extension. Tests create and remove a separate schema; never point them at a database whose contents or permissions must not be changed.

```powershell
$env:TEST_DATABASE_URL = "postgresql+psycopg://postgres:postgres@localhost:5433/hotel_booking_test"
python -m pytest backend/tests -q
```

Without `TEST_DATABASE_URL`, the PostgreSQL tests are skipped. The allocation locking design assumes PostgreSQL's default `READ COMMITTED` isolation and that all booking writers use the same room-locking protocol.
