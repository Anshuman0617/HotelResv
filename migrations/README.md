# Database Migrations

The migrations live in [`backend/alembic/versions`](../backend/alembic/versions) and are managed with Alembic:

| Revision | Change |
|---|---|
| `0001_initial_schema` | Tables, constraints, indexes and the `hotel_booking_summary` view |
| `0002_booking_room_id_index` | Index on `booking_rooms.room_id` |
| `0003_review_eligibility_trigger` | `trg_enforce_review_eligibility` on `reviews` |
| `0004_booking_hotel_id` | `bookings.hotel_id`, `booking_rooms.hotel_id` and their composite foreign keys |
| `0005_fuzzy_hotel_search` | `pg_trgm`, the `hotels.search_text` generated column, its GIN index and `city_aliases` |

```bash
cd backend
alembic upgrade head      # build or update the schema
alembic downgrade base    # remove everything again
```

The Docker backend runs `alembic upgrade head` on every start.
