from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.hotel import Hotel
from app.models.room import Room, RoomType
from app.schemas.room import RoomCreate, RoomTypeCreate, RoomTypeUpdate


def list_room_types(db: Session, hotel_id: int) -> list[RoomType]:
    """Retrieve all room types belonging to a given hotel."""
    return db.scalars(
        select(RoomType)
        .where(RoomType.hotel_id == hotel_id)
        .order_by(RoomType.base_price.asc())
    ).all()


def get_room_type(db: Session, hotel_id: int, room_type_id: int) -> RoomType:
    """Retrieve a specific room type by hotel and ID."""
    rt = db.scalar(
        select(RoomType).where(
            RoomType.id == room_type_id,
            RoomType.hotel_id == hotel_id,
        )
    )
    if rt is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room type not found for this hotel",
        )
    return rt


def create_room_type(db: Session, hotel_id: int, data: RoomTypeCreate) -> RoomType:
    """Create a new room type for a hotel."""
    # Ensure hotel exists
    hotel = db.get(Hotel, hotel_id)
    if hotel is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hotel not found",
        )

    # Check for name uniqueness within hotel
    existing = db.scalar(
        select(RoomType).where(
            RoomType.hotel_id == hotel_id,
            RoomType.name == data.name.strip(),
        )
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Room type '{data.name.strip()}' already exists for this hotel",
        )

    room_type = RoomType(
        hotel_id=hotel_id,
        name=data.name.strip(),
        description=data.description,
        max_guests=data.max_guests,
        base_price=data.base_price,
    )
    db.add(room_type)
    try:
        db.commit()
        db.refresh(room_type)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Integrity error creating room type",
        ) from exc

    return room_type


def update_room_type(
    db: Session, hotel_id: int, room_type_id: int, data: RoomTypeUpdate
) -> RoomType:
    """Update fields of an existing room type."""
    room_type = get_room_type(db, hotel_id, room_type_id)

    updates = data.model_dump(exclude_unset=True)
    if "name" in updates and updates["name"] is not None:
        new_name = updates["name"].strip()
        existing = db.scalar(
            select(RoomType).where(
                RoomType.hotel_id == hotel_id,
                RoomType.name == new_name,
                RoomType.id != room_type_id,
            )
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Room type '{new_name}' already exists for this hotel",
            )
        updates["name"] = new_name

    for field, val in updates.items():
        setattr(room_type, field, val)

    try:
        db.commit()
        db.refresh(room_type)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Integrity error updating room type",
        ) from exc

    return room_type


def list_rooms(
    db: Session,
    hotel_id: int,
    room_type_id: int | None = None,
    status_filter: str | None = None,
) -> list[Room]:
    """List physical rooms for a hotel with optional filters."""
    stmt = select(Room).where(Room.hotel_id == hotel_id)
    if room_type_id is not None:
        stmt = stmt.where(Room.room_type_id == room_type_id)
    if status_filter:
        stmt = stmt.where(Room.status == status_filter)

    stmt = stmt.order_by(Room.room_number.asc())
    return db.scalars(stmt).all()


def get_room(db: Session, hotel_id: int, room_id: int) -> Room:
    """Retrieve a specific physical room."""
    room = db.scalar(
        select(Room).where(
            Room.id == room_id,
            Room.hotel_id == hotel_id,
        )
    )
    if room is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found for this hotel",
        )
    return room


def create_room(db: Session, hotel_id: int, data: RoomCreate) -> Room:
    """Create a new physical room in a hotel."""
    # Ensure room type belongs to this hotel
    rt = db.scalar(
        select(RoomType).where(
            RoomType.id == data.room_type_id,
            RoomType.hotel_id == hotel_id,
        )
    )
    if rt is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid room_type_id: room type does not belong to this hotel",
        )

    # Check for duplicate room number in hotel
    existing = db.scalar(
        select(Room).where(
            Room.hotel_id == hotel_id,
            Room.room_number == data.room_number.strip(),
        )
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Room '{data.room_number.strip()}' already exists in this hotel",
        )

    room = Room(
        hotel_id=hotel_id,
        room_type_id=data.room_type_id,
        room_number=data.room_number.strip(),
        floor=data.floor,
        status=data.status,
    )
    db.add(room)
    try:
        db.commit()
        db.refresh(room)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Integrity error creating room",
        ) from exc

    return room


def update_room_status(
    db: Session, hotel_id: int, room_id: int, new_status: str
) -> Room:
    """Update status of a physical room (active, maintenance, inactive)."""
    room = get_room(db, hotel_id, room_id)
    room.status = new_status
    db.commit()
    db.refresh(room)
    return room

