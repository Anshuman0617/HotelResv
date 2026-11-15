from datetime import date
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.models.hotel import Hotel, HotelMember
from app.schemas.hotel import HotelCreate, HotelUpdate
from app.schemas.room import AvailableRoomType


def list_hotels(
    db: Session,
    city: str | None = None,
    country: str | None = None,
    status_filter: str | None = "active",
    query: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Hotel]:
    """Retrieve hotels with optional filtering by city, country, status, and name search."""
    stmt = (
        select(Hotel)
        .options(selectinload(Hotel.room_types))
        .order_by(Hotel.name.asc())
        .limit(limit)
        .offset(offset)
    )

    if status_filter:
        stmt = stmt.where(Hotel.status == status_filter)
    if city:
        stmt = stmt.where(func.lower(Hotel.city) == city.strip().lower())
    if country:
        stmt = stmt.where(func.lower(Hotel.country) == country.strip().lower())
    if query:
        search = f"%{query.strip().lower()}%"
        stmt = stmt.where(
            func.lower(Hotel.name).like(search)
            | func.lower(Hotel.city).like(search)
            | func.lower(Hotel.description).like(search)
        )

    return db.scalars(stmt).all()


def get_hotel(db: Session, hotel_id: int) -> Hotel:
    """Retrieve a single hotel with room types loaded."""
    hotel = db.scalar(
        select(Hotel)
        .options(selectinload(Hotel.room_types))
        .where(Hotel.id == hotel_id)
    )
    if hotel is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hotel not found",
        )
    return hotel


def create_hotel(db: Session, user_id: int, data: HotelCreate) -> Hotel:
    """Register a new hotel and add the user as owner in hotel_members."""
    hotel = Hotel(
        name=data.name.strip(),
        description=data.description,
        address_line=data.address_line.strip(),
        city=data.city.strip(),
        state=data.state.strip() if data.state else None,
        country=data.country.strip(),
        postal_code=data.postal_code.strip() if data.postal_code else None,
        timezone=data.timezone,
        status="active",
        registered_by=user_id,
    )
    db.add(hotel)
    db.flush()

    # Automatically grant the creator owner membership
    membership = HotelMember(
        hotel_id=hotel.id,
        user_id=user_id,
        role="owner",
    )
    db.add(membership)

    try:
        db.commit()
        db.refresh(hotel)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Could not create hotel due to database constraint",
        ) from exc

    return hotel


def update_hotel(db: Session, hotel_id: int, data: HotelUpdate) -> Hotel:
    """Update hotel profile details."""
    hotel = get_hotel(db, hotel_id)

    updates = data.model_dump(exclude_unset=True)
    for field, val in updates.items():
        if isinstance(val, str):
            val = val.strip()
        setattr(hotel, field, val)

    try:
        db.commit()
        db.refresh(hotel)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Integrity error updating hotel",
        ) from exc

    return hotel


def search_availability(
    db: Session,
    hotel_id: int | None = None,
    city: str | None = None,
    check_in: date | None = None,
    check_out: date | None = None,
    guests: int = 1,
) -> list[AvailableRoomType]:
    """Execute Query 1: Available room types and room counts for given dates and guests."""
    if check_in is None or check_out is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="check_in and check_out dates are required",
        )
    if check_out <= check_in:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="check_out date must be strictly after check_in date",
        )
    if guests < 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="guest count must be at least 1",
        )

    # Core Query 1 implementation matching database/queries.sql
    query_sql = text("""
        SELECT
            h.id AS hotel_id,
            h.name AS hotel_name,
            h.city,
            rt.id AS room_type_id,
            rt.name AS room_type_name,
            rt.max_guests,
            rt.base_price,
            COUNT(r.id) AS available_rooms_count
        FROM hotels h
        JOIN room_types rt ON rt.hotel_id = h.id
        JOIN rooms r ON r.room_type_id = rt.id AND r.hotel_id = h.id
        WHERE h.status = 'active'
          -- Explicit casts: psycopg 3 sends untyped NULLs, so Postgres cannot
          -- infer the type of a bare "<param> IS NULL" (AmbiguousParameter error).
          AND (CAST(:hotel_id AS INTEGER) IS NULL OR h.id = CAST(:hotel_id AS INTEGER))
          AND (CAST(:city AS TEXT) IS NULL OR LOWER(h.city) = LOWER(CAST(:city AS TEXT)))
          AND r.status = 'active'
          AND rt.max_guests >= :guests
          AND NOT EXISTS (
              SELECT 1
              FROM booking_rooms br
              JOIN bookings b ON b.id = br.booking_id
              WHERE br.room_id = r.id
                AND b.status IN ('pending', 'confirmed')
                AND b.check_in < :check_out
                AND b.check_out > :check_in
          )
        GROUP BY h.id, h.name, h.city, rt.id, rt.name, rt.max_guests, rt.base_price
        HAVING COUNT(r.id) > 0
        ORDER BY rt.base_price ASC;
    """)

    results = db.execute(
        query_sql,
        {
            "hotel_id": hotel_id,
            "city": city.strip() if city else None,
            "check_in": check_in,
            "check_out": check_out,
            "guests": guests,
        },
    ).mappings().all()

    return [
        AvailableRoomType(
            hotel_id=row["hotel_id"],
            hotel_name=row["hotel_name"],
            city=row["city"],
            room_type_id=row["room_type_id"],
            room_type_name=row["room_type_name"],
            max_guests=row["max_guests"],
            base_price=Decimal(str(row["base_price"])),
            available_rooms_count=row["available_rooms_count"],
        )
        for row in results
    ]


def list_hotel_reviews(db: Session, hotel_id: int) -> dict:
    """Retrieve all verified customer reviews and aggregate rating for a hotel."""
    from app.models.review import Review
    from app.models.user import User

    # Ensure hotel exists
    get_hotel(db, hotel_id)

    reviews_stmt = (
        select(Review, User.full_name)
        .join(User, Review.user_id == User.id)
        .where(Review.hotel_id == hotel_id)
        .order_by(Review.created_at.desc())
    )
    rows = db.execute(reviews_stmt).all()

    items = [
        {
            "id": r.id,
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "user_name": user_name,
        }
        for r, user_name in rows
    ]

    total_reviews = len(items)
    avg_rating = round(sum(i["rating"] for i in items) / total_reviews, 2) if total_reviews > 0 else 0.0

    return {
        "hotel_id": hotel_id,
        "total_reviews": total_reviews,
        "average_rating": avg_rating,
        "reviews": items,
    }

