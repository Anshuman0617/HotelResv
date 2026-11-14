from datetime import date
from typing import Any, Literal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.authorization import require_hotel_role
from app.models.user import User
from app.schemas.hotel import HotelCreate, HotelResponse, HotelSummary, HotelUpdate
from app.schemas.room import (
    AvailableRoomType,
    RoomCreate,
    RoomResponse,
    RoomStatusUpdate,
    RoomTypeCreate,
    RoomTypeResponse,
    RoomTypeUpdate,
)
from app.services import hotel_service, room_service

router = APIRouter(prefix="/api/hotels", tags=["Hotels & Inventory"])


def api_response(data: Any, message: str) -> dict[str, Any]:
    return {"success": True, "message": message, "data": data}


def get_public_hotel(db: Session, hotel_id: int):
    hotel = hotel_service.get_hotel(db, hotel_id)
    if hotel.status != "active":
        raise HTTPException(status_code=404, detail="Hotel not found")
    return hotel


# -----------------------------------------------------------------------------
# 1. Hotel Endpoints
# -----------------------------------------------------------------------------


@router.get("", response_model=dict[str, Any])
def list_hotels(
    city: str | None = Query(None, description="Filter by city name"),
    country: str | None = Query(None, description="Filter by country"),
    status: Literal["active"] = Query("active", description="Only active hotels are publicly listed"),
    search: str | None = Query(None, description="Search name, city or description"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Browse and search hotels."""
    hotels = hotel_service.list_hotels(
        db,
        city=city,
        country=country,
        status_filter=status,
        query=search,
        limit=limit,
        offset=offset,
    )
    data = [HotelResponse.model_validate(h).model_dump(mode="json") for h in hotels]
    return api_response(data, "Hotels retrieved successfully")


@router.get("/availability", response_model=dict[str, Any])
def search_global_availability(
    check_in: date = Query(..., description="Check-in date (YYYY-MM-DD)"),
    check_out: date = Query(..., description="Check-out date (YYYY-MM-DD)"),
    guests: int = Query(1, ge=1, description="Required guest capacity"),
    city: str | None = Query(None, description="Filter by city"),
    hotel_id: int | None = Query(None, description="Optional hotel ID filter"),
    db: Session = Depends(get_db),
):
    """Query 1: Search available hotels and room types for selected dates and guests."""
    results = hotel_service.search_availability(
        db,
        hotel_id=hotel_id,
        city=city,
        check_in=check_in,
        check_out=check_out,
        guests=guests,
    )
    data = [r.model_dump(mode="json") for r in results]
    return api_response(data, "Available room types retrieved successfully")


@router.get("/{hotel_id}", response_model=dict[str, Any])
def get_hotel(hotel_id: int, db: Session = Depends(get_db)):
    """Retrieve full details of a specific hotel including room types."""
    hotel = get_public_hotel(db, hotel_id)
    data = HotelResponse.model_validate(hotel).model_dump(mode="json")
    return api_response(data, "Hotel details retrieved successfully")


@router.post("", status_code=status.HTTP_201_CREATED, response_model=dict[str, Any])
def register_hotel(
    request: HotelCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Register a new hotel. The creator is automatically added as hotel owner."""
    hotel = hotel_service.create_hotel(db, user_id=current_user.id, data=request)
    data = HotelSummary.model_validate(hotel).model_dump(mode="json")
    return api_response(data, "Hotel registered successfully")


@router.put("/{hotel_id}", response_model=dict[str, Any])
def update_hotel_profile(
    hotel_id: int,
    request: HotelUpdate,
    db: Session = Depends(get_db),
    _membership=Depends(require_hotel_role(["owner", "manager"])),
):
    """Update hotel profile details (requires owner or manager role)."""
    hotel = hotel_service.update_hotel(db, hotel_id, request)
    data = HotelSummary.model_validate(hotel).model_dump(mode="json")
    return api_response(data, "Hotel profile updated successfully")


@router.get("/{hotel_id}/availability", response_model=dict[str, Any])
def check_hotel_availability(
    hotel_id: int,
    check_in: date = Query(..., description="Check-in date (YYYY-MM-DD)"),
    check_out: date = Query(..., description="Check-out date (YYYY-MM-DD)"),
    guests: int = Query(1, ge=1, description="Required guest capacity"),
    db: Session = Depends(get_db),
):
    """Query 1 (Hotel scoped): Available room types and free rooms for a specific hotel."""
    results = hotel_service.search_availability(
        db,
        hotel_id=hotel_id,
        city=None,
        check_in=check_in,
        check_out=check_out,
        guests=guests,
    )
    data = [r.model_dump(mode="json") for r in results]
    return api_response(data, "Hotel room availability retrieved successfully")


# -----------------------------------------------------------------------------
# 2. Room Type Endpoints
# -----------------------------------------------------------------------------


@router.get("/{hotel_id}/room-types", response_model=dict[str, Any])
def list_hotel_room_types(hotel_id: int, db: Session = Depends(get_db)):
    """List all room types for a hotel."""
    get_public_hotel(db, hotel_id)
    room_types = room_service.list_room_types(db, hotel_id)
    data = [RoomTypeResponse.model_validate(rt).model_dump(mode="json") for rt in room_types]
    return api_response(data, "Room types retrieved successfully")


@router.post(
    "/{hotel_id}/room-types",
    status_code=status.HTTP_201_CREATED,
    response_model=dict[str, Any],
)
def create_room_type(
    hotel_id: int,
    request: RoomTypeCreate,
    db: Session = Depends(get_db),
    _membership=Depends(require_hotel_role(["owner", "manager"])),
):
    """Create a new room type for a hotel (requires owner or manager)."""
    room_type = room_service.create_room_type(db, hotel_id, request)
    data = RoomTypeResponse.model_validate(room_type).model_dump(mode="json")
    return api_response(data, "Room type created successfully")


@router.put(
    "/{hotel_id}/room-types/{room_type_id}",
    response_model=dict[str, Any],
)
def update_room_type(
    hotel_id: int,
    room_type_id: int,
    request: RoomTypeUpdate,
    db: Session = Depends(get_db),
    _membership=Depends(require_hotel_role(["owner", "manager"])),
):
    """Update an existing room type (requires owner or manager)."""
    room_type = room_service.update_room_type(db, hotel_id, room_type_id, request)
    data = RoomTypeResponse.model_validate(room_type).model_dump(mode="json")
    return api_response(data, "Room type updated successfully")


# -----------------------------------------------------------------------------
# 3. Physical Room Endpoints
# -----------------------------------------------------------------------------


@router.get("/{hotel_id}/rooms", response_model=dict[str, Any])
def list_physical_rooms(
    hotel_id: int,
    room_type_id: int | None = Query(None, description="Filter by room type ID"),
    status: str | None = Query(None, description="Filter by status (active, maintenance, inactive)"),
    db: Session = Depends(get_db),
    _membership=Depends(require_hotel_role(["owner", "manager", "staff"])),
):
    """List physical rooms for staff/manager inventory management."""
    rooms = room_service.list_rooms(db, hotel_id, room_type_id=room_type_id, status_filter=status)
    data = [RoomResponse.model_validate(r).model_dump(mode="json") for r in rooms]
    return api_response(data, "Rooms retrieved successfully")


@router.post(
    "/{hotel_id}/rooms",
    status_code=status.HTTP_201_CREATED,
    response_model=dict[str, Any],
)
def create_physical_room(
    hotel_id: int,
    request: RoomCreate,
    db: Session = Depends(get_db),
    _membership=Depends(require_hotel_role(["owner", "manager"])),
):
    """Add a new physical room to inventory (requires owner or manager)."""
    room = room_service.create_room(db, hotel_id, request)
    data = RoomResponse.model_validate(room).model_dump(mode="json")
    return api_response(data, "Room created successfully")


@router.patch(
    "/{hotel_id}/rooms/{room_id}/status",
    response_model=dict[str, Any],
)
def update_room_status(
    hotel_id: int,
    room_id: int,
    request: RoomStatusUpdate,
    db: Session = Depends(get_db),
    _membership=Depends(require_hotel_role(["owner", "manager", "staff"])),
):
    """Update room maintenance status (requires owner, manager, or staff)."""
    room = room_service.update_room_status(db, hotel_id, room_id, request.status)
    data = RoomResponse.model_validate(room).model_dump(mode="json")
    return api_response(data, "Room status updated successfully")


@router.get("/{hotel_id}/reviews", response_model=dict[str, Any])
def list_hotel_reviews(hotel_id: int, db: Session = Depends(get_db)):
    """Retrieve all customer reviews and ratings for a hotel."""
    data = hotel_service.list_hotel_reviews(db, hotel_id)
    return api_response(data, "Hotel reviews retrieved successfully")


