from datetime import date, datetime, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking, BookingRoom
from app.models.hotel import Hotel
from app.models.payment import Payment
from app.models.review import Review
from app.models.room import Room, RoomType
from app.schemas.booking import BookingRequest, PaymentRequest, ReviewRequest


async def owned_booking(db: AsyncSession, booking_id: int, user_id: int, lock: bool = False) -> Booking:
    query = select(Booking).where(Booking.id == booking_id, Booking.user_id == user_id)
    if lock:
        query = query.with_for_update()
    booking = await db.scalar(query)
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


async def booking_data(db: AsyncSession, booking: Booking) -> dict:
    rooms = (await db.execute(select(BookingRoom, RoomType, Room).join(RoomType, BookingRoom.room_type_id == RoomType.id).outerjoin(Room, BookingRoom.room_id == Room.id).where(BookingRoom.booking_id == booking.id).order_by(BookingRoom.id))).all()
    payments = (await db.scalars(select(Payment).where(Payment.booking_id == booking.id).order_by(Payment.created_at.desc(), Payment.id.desc()))).all()
    review = await db.scalar(select(Review).where(Review.booking_id == booking.id))
    hotel = await db.get(Hotel, rooms[0][1].hotel_id) if rooms else None
    return {
        "id": booking.id, "check_in": booking.check_in, "check_out": booking.check_out,
        "guest_count": booking.guest_count, "status": booking.status, "created_at": booking.created_at,
        "hotel_id": hotel.id if hotel else None,
        "hotel_name": hotel.name if hotel else None,
        "hotel_city": hotel.city if hotel else None,
        "total": sum((item.nightly_rate * (booking.check_out - booking.check_in).days for item, _, _ in rooms), Decimal("0")),
        "rooms": [{"room_type_id": rt.id, "room_type_name": rt.name, "room_id": room.id if room else None, "room_number": room.room_number if room else None, "guest_count": item.guest_count, "nightly_rate": item.nightly_rate} for item, rt, room in rooms],
        "payments": [{"id": p.id, "amount": p.amount, "currency": p.currency, "status": p.status, "created_at": p.created_at, "paid_at": p.paid_at} for p in payments],
        "review": {"id": review.id, "rating": review.rating, "comment": review.comment} if review else None,
    }


async def create_booking(db: AsyncSession, user_id: int, request: BookingRequest) -> dict:
    try:
        hotel = await db.get(Hotel, request.hotel_id)
        if hotel is None or hotel.status != "active":
            raise HTTPException(status_code=404, detail="Active hotel not found")

        # Disallow double-booking: check for overlapping active bookings by the same user at this hotel
        overlapping = await db.scalar(
            select(Booking.id)
            .join(BookingRoom, BookingRoom.booking_id == Booking.id)
            .join(RoomType, RoomType.id == BookingRoom.room_type_id)
            .where(
                Booking.user_id == user_id,
                RoomType.hotel_id == request.hotel_id,
                Booking.status.in_(["pending", "confirmed"]),
                Booking.check_in < request.check_out,
                Booking.check_out > request.check_in,
            )
            .limit(1)
        )
        if overlapping is not None:
            raise HTTPException(
                status_code=409,
                detail="You already have an active reservation at this hotel for overlapping dates",
            )
        requested = sorted(request.rooms, key=lambda item: item.room_type_id)
        room_types = {item.id: item for item in (await db.scalars(select(RoomType).where(RoomType.id.in_([r.room_type_id for r in requested]), RoomType.hotel_id == request.hotel_id))).all()}
        for item in requested:
            room_type = room_types.get(item.room_type_id)
            if room_type is None or item.guests_per_room > room_type.max_guests:
                raise HTTPException(status_code=422, detail="Invalid room type or guest capacity")

        # Disallow double-booking: check for overlapping active bookings by the same user at this hotel
        overlapping = await db.scalar(
            select(Booking.id)
            .join(BookingRoom, BookingRoom.booking_id == Booking.id)
            .join(RoomType, RoomType.id == BookingRoom.room_type_id)
            .where(
                Booking.user_id == user_id,
                RoomType.hotel_id == request.hotel_id,
                Booking.status.in_(["pending", "confirmed"]),
                Booking.check_in < request.check_out,
                Booking.check_out > request.check_in,
            )
            .limit(1)
        )
        if overlapping is not None:
            raise HTTPException(
                status_code=409,
                detail="You already have an active reservation at this hotel for overlapping dates",
            )

        candidates = (await db.scalars(select(Room).where(Room.hotel_id == request.hotel_id, Room.room_type_id.in_(room_types), Room.status == "active").order_by(Room.id).with_for_update())).all()
        occupied = set((await db.scalars(select(BookingRoom.room_id).join(Booking, Booking.id == BookingRoom.booking_id).where(BookingRoom.room_id.in_([r.id for r in candidates]), Booking.status.in_(["pending", "confirmed"]), Booking.check_in < request.check_out, Booking.check_out > request.check_in))).all())
        booking = Booking(user_id=user_id, check_in=request.check_in, check_out=request.check_out, guest_count=sum(r.quantity * r.guests_per_room for r in requested), status="pending")
        db.add(booking)
        await db.flush()
        for item in requested:
            available = [room for room in candidates if room.room_type_id == item.room_type_id and room.id not in occupied]
            if len(available) < item.quantity:
                raise HTTPException(status_code=409, detail="Not enough rooms available")
            for room in available[:item.quantity]:
                db.add(BookingRoom(booking_id=booking.id, room_type_id=item.room_type_id, room_id=room.id, guest_count=item.guests_per_room, nightly_rate=room_types[item.room_type_id].base_price))
            await db.flush()
        await db.flush()
        result = await booking_data(db, booking)
        await db.commit()
        return result
    except Exception:
        await db.rollback()
        raise


async def cancel_booking(db: AsyncSession, booking_id: int, user_id: int) -> dict:
    try:
        booking = await owned_booking(db, booking_id, user_id, lock=True)
        if booking.status not in ("pending", "confirmed") or booking.check_in <= date.today():
            raise HTTPException(status_code=409, detail="Booking cannot be cancelled")
        booking.status = "cancelled"
        for payment in (await db.scalars(select(Payment).where(Payment.booking_id == booking.id, Payment.status == "successful"))).all():
            payment.status = "refunded"
        await db.flush()
        result = await booking_data(db, booking)
        await db.commit()
        return result
    except Exception:
        await db.rollback()
        raise


async def record_payment(db: AsyncSession, booking_id: int, user_id: int, request: PaymentRequest) -> dict:
    try:
        booking = await owned_booking(db, booking_id, user_id, lock=True)
        existing = await db.scalar(select(Payment).where(Payment.booking_id == booking.id, Payment.status == "successful"))
        if existing is not None and booking.status == "confirmed":
            result = await booking_data(db, booking)
            await db.commit()
            return result
        if booking.status != "pending":
            raise HTTPException(status_code=409, detail="Booking cannot be paid")
        total = sum((await db.scalars(select(BookingRoom.nightly_rate).where(BookingRoom.booking_id == booking.id))).all(), Decimal("0")) * (booking.check_out - booking.check_in).days
        if total <= 0:
            raise HTTPException(status_code=409, detail="Booking total must be positive for payment")
        payment = Payment(booking_id=booking.id, provider="simulated", amount=total, currency="INR", status=request.outcome, paid_at=datetime.now(timezone.utc) if request.outcome == "successful" else None)
        db.add(payment)
        if request.outcome == "successful":
            booking.status = "confirmed"
        await db.flush()
        result = await booking_data(db, booking)
        await db.commit()
        return result
    except Exception:
        await db.rollback()
        raise


async def create_review(db: AsyncSession, booking_id: int, user_id: int, request: ReviewRequest) -> dict:
    try:
        booking = await owned_booking(db, booking_id, user_id, lock=True)
        if booking.status != "completed" or booking.check_out > date.today():
            raise HTTPException(status_code=409, detail="Review requires a completed stay after checkout")
        if await db.scalar(select(Review.id).where(Review.booking_id == booking.id)) is not None:
            raise HTTPException(status_code=409, detail="Booking already reviewed")
        hotel_id = await db.scalar(select(RoomType.hotel_id).join(BookingRoom, BookingRoom.room_type_id == RoomType.id).where(BookingRoom.booking_id == booking.id).limit(1))
        if hotel_id is None:
            raise HTTPException(status_code=409, detail="Booking has no rooms")
        review = Review(booking_id=booking.id, user_id=user_id, hotel_id=hotel_id, rating=request.rating, comment=request.comment)
        db.add(review)
        await db.flush()
        result = {"id": review.id, "booking_id": booking.id, "hotel_id": hotel_id, "rating": review.rating, "comment": review.comment}
        await db.commit()
        return result
    except Exception:
        await db.rollback()
        raise


async def complete_booking(db: AsyncSession, booking_id: int, user_id: int) -> dict:
    """Check out of a confirmed stay so the guest can leave a review.

    The stay must have started at least one night ago. Checking out early
    shortens ``check_out`` to today; checking out on or after the planned
    date leaves it unchanged.
    """
    try:
        booking = await owned_booking(db, booking_id, user_id, lock=True)
        if booking.status != "confirmed":
            raise HTTPException(status_code=409, detail="Only confirmed bookings can be completed")
        today = date.today()
        if booking.check_in >= today:
            raise HTTPException(status_code=409, detail="A stay can only be completed after check-in night")
        if booking.check_out > today:
            booking.check_out = today
        booking.status = "completed"
        await db.commit()
        return await booking_data(db, booking)
    except Exception:
        await db.rollback()
        raise



