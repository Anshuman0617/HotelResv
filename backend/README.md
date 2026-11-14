# Backend - FastAPI

Planned REST API for authentication, hotel and room
management, booking operations, availability checks,
payments, and reviews.

Status: Proposed; implementation pending.

## Manager report endpoints

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

Tests: `TEST_DATABASE_URL=postgresql+psycopg://<user>@localhost:5432/<disposable_db> python -m pytest backend/tests -q`
(PostgreSQL tests are skipped without `TEST_DATABASE_URL`).
