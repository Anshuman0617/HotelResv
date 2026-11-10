# Database Schema & ORM Reference (M1 Handoff for M2, M3, M4)

This guide explains how to use the SQLAlchemy database session and the 9 ORM models in your FastAPI routers and services.

---

## 1. Using the Database Session in FastAPI Routes

Import `get_db` from `app.database` and models from `app.models`:

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    User,
    Hotel,
    HotelMember,
    RoomType,
    Room,
    Booking,
    BookingRoom,
    Payment,
    Review,
)

router = APIRouter()

@router.get("/example")
def example_route(db: Session = Depends(get_db)):
    hotels = db.query(Hotel).filter(Hotel.status == "active").all()
    return {"success": True, "message": "Operation successful", "data": hotels}
```

---

## 2. Running Migrations (Alembic)

From inside the `backend/` folder:

```bash
# Apply all migrations to PostgreSQL
alembic upgrade head

# Roll back migrations
alembic downgrade base
```

---

## 3. Model Summary & Relationships

| Model Class | Table Name | Primary Key | Key Relationships & Notes |
|---|---|---|---|
| `User` | `users` | `id` (`BigInteger`) | `registered_hotels`, `hotel_memberships`, `bookings`, `reviews`. `email` uses case-insensitive `CITEXT`. |
| `Hotel` | `hotels` | `id` (`BigInteger`) | `registrant` (`User`), `members` (`HotelMember`), `room_types`, `rooms`, `reviews`. `status`: `'pending'`, `'active'`, `'suspended'`. |
| `HotelMember` | `hotel_members` | `(hotel_id, user_id)` | Composite PK linking `Hotel` and `User`. `role`: `'owner'`, `'manager'`, `'staff'`. |
| `RoomType` | `room_types` | `id` (`BigInteger`) | `hotel`, `rooms`, `booking_rooms`. `UNIQUE(hotel_id, name)`. `max_guests > 0`, `base_price >= 0`. |
| `Room` | `rooms` | `id` (`BigInteger`) | `hotel`, `room_type`, `booking_rooms`. `UNIQUE(hotel_id, room_number)`. Composite FK guarantees `room.hotel_id == room_type.hotel_id`. `status`: `'active'`, `'maintenance'`, `'inactive'`. |
| `Booking` | `bookings` | `id` (`BigInteger`) | `user`, `booking_rooms`, `payments`, `review` (1:0..1). `check_out > check_in`, `guest_count > 0`. `status`: `'pending'`, `'confirmed'`, `'cancelled'`, `'completed'`. |
| `BookingRoom` | `booking_rooms` | `id` (`BigInteger`) | `booking`, `room_type`, `room` (nullable until allocated). Composite FK guarantees allocated `room` belongs to `room_type`. Snapshots `nightly_rate`. |
| `Payment` | `payments` | `id` (`BigInteger`) | `booking`. `amount > 0`, `currency` defaults to `'INR'`. `status`: `'initiated'`, `'successful'`, `'failed'`, `'refunded'`. |
| `Review` | `reviews` | `id` (`BigInteger`) | `booking` (`UNIQUE`), `user`, `hotel`. `rating` must be between `1` and `5`. |

---

## 4. SQL View Available for Manager Reporting (M6)

- **`hotel_booking_summary`**: Returns `hotel_id`, `hotel_name`, `city`, `hotel_status`, `total_bookings`, `pending_bookings`, `confirmed_bookings`, `completed_bookings`, `cancelled_bookings`, `total_revenue`, `review_count`, and `avg_rating`.
