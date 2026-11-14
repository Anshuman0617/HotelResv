from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.booking import Booking
from app.models.user import User
from app.schemas.booking import BookingRequest, PaymentRequest, ReviewRequest
from app.services.booking_service import booking_data, cancel_booking, create_booking, create_review, owned_booking, record_payment

router = APIRouter(prefix="/api/bookings", tags=["Bookings"])


def response(data, message):
    return {"success": True, "message": message, "data": data}


@router.post("", status_code=status.HTTP_201_CREATED)
def book(request: BookingRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return response(create_booking(db, user.id, request), "Booking created")


@router.get("")
def history(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    bookings = db.scalars(select(Booking).where(Booking.user_id == user.id).order_by(Booking.created_at.desc(), Booking.id.desc())).all()
    return response([booking_data(db, booking) for booking in bookings], "Bookings retrieved")


@router.get("/{booking_id}")
def details(booking_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return response(booking_data(db, owned_booking(db, booking_id, user.id)), "Booking retrieved")


@router.post("/{booking_id}/cancel")
def cancel(booking_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return response(cancel_booking(db, booking_id, user.id), "Booking cancelled")


@router.post("/{booking_id}/payments")
def pay(booking_id: int, request: PaymentRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return response(record_payment(db, booking_id, user.id, request), "Payment processed")


@router.post("/{booking_id}/reviews", status_code=status.HTTP_201_CREATED)
def review(booking_id: int, request: ReviewRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return response(create_review(db, booking_id, user.id, request), "Review created")
