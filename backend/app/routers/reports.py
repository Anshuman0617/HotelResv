from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.authorization import require_hotel_role
from app.models.user import User
from app.schemas.room import RoomResponse
from app.services import report_service, room_service

router = APIRouter(prefix="/api/manager", tags=["Reports"])

# Reports expose revenue and customer contact details, so staff are excluded.
report_access = require_hotel_role(["owner", "manager"])


def response(data: Any, message: str) -> dict[str, Any]:
    return {"success": True, "message": message, "data": data}


@router.get("/hotels/{hotel_id}/reports/summary", dependencies=[Depends(report_access)])
async def hotel_summary(hotel_id: int, db: AsyncSession = Depends(get_db)):
    data = await report_service.summary(db, hotel_id)
    if data is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hotel not found")
    return response(data, "Hotel summary retrieved")


@router.get("/hotels/{hotel_id}/reports/bookings", dependencies=[Depends(report_access)])
async def hotel_bookings(
    hotel_id: int,
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    return response(await report_service.bookings(db, hotel_id, limit, offset), "Booking history retrieved")


@router.get("/hotels/{hotel_id}/reports/revenue", dependencies=[Depends(report_access)])
async def hotel_revenue(hotel_id: int, db: AsyncSession = Depends(get_db)):
    return response(await report_service.monthly_revenue(db, hotel_id), "Monthly revenue retrieved")


@router.get("/hotels/{hotel_id}/reports/popular-room-types", dependencies=[Depends(report_access)])
async def hotel_popular_room_types(hotel_id: int, db: AsyncSession = Depends(get_db)):
    return response(await report_service.popular_room_types(db, hotel_id), "Popular room types retrieved")


@router.get("/hotels/{hotel_id}/reports/repeat-customers", dependencies=[Depends(report_access)])
async def hotel_repeat_customers(hotel_id: int, db: AsyncSession = Depends(get_db)):
    return response(await report_service.repeat_customers(db, hotel_id), "Repeat customers retrieved")


@router.get("/hotels/{hotel_id}/reports/payments", dependencies=[Depends(report_access)])
async def hotel_payments(hotel_id: int, db: AsyncSession = Depends(get_db)):
    return response(await report_service.hotel_payments(db, hotel_id), "Hotel payments retrieved")


@router.get(
    "/hotels/{hotel_id}/rooms/occupancy",
    dependencies=[Depends(require_hotel_role(["owner", "manager", "staff"]))],
)
async def room_occupancy(hotel_id: int, db: AsyncSession = Depends(get_db)):
    """Whether each room is occupied tonight. No guest details, so staff may read it."""
    return response(await report_service.room_occupancy(db, hotel_id, date.today()), "Room occupancy retrieved")


@router.get("/hotels/{hotel_id}/rooms/{room_id}/bookings", dependencies=[Depends(report_access)])
async def room_history(hotel_id: int, room_id: int, db: AsyncSession = Depends(get_db)):
    """Past, current and upcoming bookings assigned to one physical room."""
    # get_room 404s unless the room belongs to this hotel, so a manager can't
    # read another hotel's room by guessing its id.
    room = await room_service.get_room(db, hotel_id, room_id)
    data = {
        "room": RoomResponse.model_validate(room).model_dump(mode="json"),
        "bookings": await report_service.room_bookings(db, room.id, date.today()),
    }
    return response(data, "Room history retrieved")


@router.get("/reports/top-rated-hotels")
async def top_rated_hotels(db: AsyncSession = Depends(get_db), _user: User = Depends(get_current_user)):
    return response(await report_service.top_rated_hotels(db), "Top-rated hotels retrieved")
