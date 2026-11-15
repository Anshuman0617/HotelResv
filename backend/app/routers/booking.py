from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.booking import Booking
from app.models.user import User
from app.schemas.booking import BookingRequest, PaymentRequest, ReviewRequest
from app.services.booking_service import (
    booking_data,
    cancel_booking,
    complete_booking,
    create_booking,
    create_review,
    owned_booking,
    record_payment,
)

router = APIRouter(prefix="/api/bookings", tags=["Bookings"])


def response(data, message):
    return {"success": True, "message": message, "data": data}


@router.post("", status_code=status.HTTP_201_CREATED)
async def book(request: BookingRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return response(await create_booking(db, user.id, request), "Booking created")


@router.get("")
async def history(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    bookings = (await db.scalars(select(Booking).where(Booking.user_id == user.id).order_by(Booking.created_at.desc(), Booking.id.desc()))).all()
    return response([await booking_data(db, booking) for booking in bookings], "Bookings retrieved")


@router.get("/{booking_id}")
async def details(booking_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return response(await booking_data(db, await owned_booking(db, booking_id, user.id)), "Booking retrieved")


@router.post("/{booking_id}/cancel")
async def cancel(booking_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return response(await cancel_booking(db, booking_id, user.id), "Booking cancelled")


@router.post("/{booking_id}/payments")
async def pay(booking_id: int, request: PaymentRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return response(await record_payment(db, booking_id, user.id, request), "Payment processed")


@router.post("/{booking_id}/complete")
async def complete(booking_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return response(await complete_booking(db, booking_id, user.id), "Stay completed")


@router.post("/{booking_id}/reviews", status_code=status.HTTP_201_CREATED)
async def review(booking_id: int, request: ReviewRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return response(await create_review(db, booking_id, user.id, request), "Review created")
