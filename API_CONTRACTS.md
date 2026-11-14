# Booking API contracts

All endpoints require `Authorization: Bearer <token>`. Successful responses use `{"success": true, "message": "...", "data": ...}`. Dates use `YYYY-MM-DD`; monetary amounts are decimal values in INR. Booking access is limited to the authenticated owner.

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

A booking object contains `id`, `hotel_id`, `check_in`, `check_out`, `guest_count`, `status`, `created_at`, `total`, `rooms`, `payments`, and `review` (null when absent). Each room has `room_type_id`, `room_type_name`, `room_id`, `room_number`, `guest_count`, and `nightly_rate`. Payment entries have `id`, `amount`, `currency`, `status`, `created_at`, and `paid_at`, newest first. A review has `id`, `rating`, and `comment`.

## Payments and reviews

- `POST /api/bookings/{id}/payments` with `{"outcome":"successful"}` or `{"outcome":"failed"}` returns the booking. Failure leaves it pending; success confirms it. Retrying after success returns the existing booking without another successful payment. A positive total is required by the existing payment schema.
- `POST /api/bookings/{id}/reviews` with `{"rating":5,"comment":"Great stay"}` returns 201 and the review's `id`, `booking_id`, `hotel_id`, `rating`, and `comment`. Rating is 1–5; comment may be null. The owner may review once when the booking is `completed` and checkout has passed or is today. A separate team workflow must mark stays completed; this API does not do so.

## Errors

FastAPI errors use `{"detail":"..."}`; validation errors use a `detail` array. Missing or invalid authentication returns 401. Missing, inactive or inaccessible resources return 404 (another customer's booking is also 404). Invalid input or capacity returns 422. Insufficient availability, invalid state transitions, duplicate reviews, or a nonpositive payment total return 409. The booking and all allocations roll back on failure.

## PostgreSQL integration tests

Use a disposable PostgreSQL database and a user allowed to create schemas and the `citext` extension. Tests create and remove a separate schema; never point them at a database whose contents or permissions must not be changed.

```powershell
$env:TEST_DATABASE_URL = "postgresql+psycopg://postgres:postgres@localhost:5433/hotel_booking_test"
python -m pytest backend/tests -q
```

Without `TEST_DATABASE_URL`, the PostgreSQL tests are skipped. The allocation locking design assumes PostgreSQL's default `READ COMMITTED` isolation and that all booking writers use the same room-locking protocol.
