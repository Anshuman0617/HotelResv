import re
from datetime import date
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy import bindparam, func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.hotel import Hotel, HotelMember
from app.schemas.hotel import HotelCreate, HotelUpdate
from app.schemas.room import AvailableRoomType


async def list_hotels(
    db: AsyncSession,
    city: str | None = None,
    country: str | None = None,
    status_filter: str | None = "active",
    limit: int = 50,
    offset: int = 0,
) -> list[Hotel]:
    """Retrieve hotels with optional exact filters on city, country and status.

    Free-text search goes through search_hotels().
    """
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
    return (await db.scalars(stmt)).all()


# Words that describe almost any listing and would only add noise to matching.
SEARCH_STOPWORDS = {
    "a", "an", "and", "at", "for", "hotel", "hotels", "in", "near", "of",
    "stay", "stays", "the", "to",
}
MAX_SEARCH_TOKENS = 8

# Ranked fuzzy search over active hotels.
#
# Each query word (token) is scored against each hotel as the best of:
#   * 1.0  the word starts a word in name/city/state/country (prefix match),
#   * word_similarity() against name, city, state and country (typos),
#   * word_similarity() against an alias of the hotel's city (bombay),
#   * 0.6  the word starts a word in the description.
# A hotel's score is the sum of its token scores divided by the number of
# tokens. Only hotels matching the most tokens are kept (all of them when
# possible), and of those only ones scoring at least 60% of the best, so one
# strong match is not buried under weak look-alikes.
#
# The candidate step uses the <% operator so idx_hotels_search_text_trgm can
# serve it; :threshold is applied through pg_trgm.word_similarity_threshold.
FUZZY_SEARCH_SQL = text(
    r"""
    WITH tokens AS (
        SELECT t FROM unnest(CAST(:tokens AS TEXT[])) AS u(t)
    ),
    candidates AS (
        SELECT h.id
        FROM hotels h JOIN tokens tk ON tk.t <% h.search_text
        UNION
        SELECT h.id
        FROM hotels h
        JOIN city_aliases a ON lower(a.city) = lower(h.city)
        JOIN tokens tk ON tk.t <% a.alias
    ),
    scored AS (
        SELECT h.id, tk.t,
               GREATEST(
                   CASE WHEN lower(h.name || ' ' || h.city || ' ' || coalesce(h.state, '') || ' ' || h.country)
                             ~ ('\m' || tk.t) THEN 1.0 ELSE 0 END,
                   word_similarity(tk.t, lower(h.name)),
                   word_similarity(tk.t, lower(h.city)),
                   word_similarity(tk.t, lower(coalesce(h.state, ''))),
                   word_similarity(tk.t, lower(h.country)),
                   COALESCE((
                       SELECT MAX(word_similarity(tk.t, a.alias))
                       FROM city_aliases a
                       WHERE lower(a.city) = lower(h.city)
                   ), 0),
                   CASE WHEN lower(coalesce(h.description, '')) ~ ('\m' || tk.t) THEN 0.6 ELSE 0 END
               ) AS score
        FROM hotels h
        JOIN candidates c ON c.id = h.id
        CROSS JOIN tokens tk
        WHERE h.status = :status
          AND (CAST(:city AS TEXT) IS NULL OR lower(h.city) = lower(CAST(:city AS TEXT)))
          AND (CAST(:country AS TEXT) IS NULL OR lower(h.country) = lower(CAST(:country AS TEXT)))
    ),
    per_hotel AS (
        SELECT id,
               COUNT(*) FILTER (WHERE score >= :threshold) AS tokens_matched,
               SUM(score) FILTER (WHERE score >= :threshold) / :token_count AS score
        FROM scored
        GROUP BY id
    ),
    ranked AS (
        SELECT id, tokens_matched, score,
               MAX(tokens_matched) OVER () AS best_matched,
               MAX(score) OVER (PARTITION BY tokens_matched) AS best_score
        FROM per_hotel
        WHERE tokens_matched > 0
    )
    SELECT id, ROUND(score::numeric, 3) AS score
    FROM ranked
    WHERE tokens_matched = best_matched
      AND score >= GREATEST(:threshold, best_score * 0.6)
    ORDER BY score DESC, id
    LIMIT :limit OFFSET :offset
    """
)
SEARCH_THRESHOLD = 0.3


def search_tokens(query: str) -> list[str]:
    """Split a search box query into lower-case words worth matching."""
    words = list(dict.fromkeys(w for w in re.findall(r"\w+", query.casefold()) if len(w) >= 2))
    meaningful = [w for w in words if w not in SEARCH_STOPWORDS]
    # "hotel" on its own should still search for hotels named "... Hotel".
    return (meaningful or words)[:MAX_SEARCH_TOKENS]


async def search_hotels(
    db: AsyncSession,
    query: str,
    city: str | None = None,
    country: str | None = None,
    status_filter: str = "active",
    limit: int = 50,
    offset: int = 0,
) -> list[tuple[Hotel, float]]:
    """Fuzzy, ranked hotel search. Returns (hotel, score) pairs, best first.

    Tolerates typos ("mumbia"), word prefixes ("hyder"), several words in any
    order ("taj mumbai") and old city names ("bombay").
    """
    tokens = search_tokens(query)
    if not tokens:
        return []

    # Applies to the <% operator for the rest of this transaction only.
    await db.execute(
        text("SELECT set_config('pg_trgm.word_similarity_threshold', :t, true)"),
        {"t": str(SEARCH_THRESHOLD)},
    )
    rows = (await db.execute(
        FUZZY_SEARCH_SQL,
        {
            "tokens": tokens,
            "token_count": len(tokens),
            "threshold": SEARCH_THRESHOLD,
            "status": status_filter,
            "city": city.strip() if city else None,
            "country": country.strip() if country else None,
            "limit": limit,
            "offset": offset,
        },
    )).all()
    if not rows:
        return []

    scores = {row.id: float(row.score) for row in rows}
    hotels = (await db.scalars(
        select(Hotel).options(selectinload(Hotel.room_types)).where(Hotel.id.in_(scores))
    )).all()
    by_id = {hotel.id: hotel for hotel in hotels}
    return [(by_id[hotel_id], score) for hotel_id, score in scores.items() if hotel_id in by_id]


async def get_hotel(db: AsyncSession, hotel_id: int) -> Hotel:
    """Retrieve a single hotel with room types loaded."""
    hotel = await db.scalar(
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


async def create_hotel(db: AsyncSession, user_id: int, data: HotelCreate) -> Hotel:
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
    await db.flush()

    # Automatically grant the creator owner membership
    membership = HotelMember(
        hotel_id=hotel.id,
        user_id=user_id,
        role="owner",
    )
    db.add(membership)

    try:
        await db.commit()
        await db.refresh(hotel)
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Could not create hotel due to database constraint",
        ) from exc

    return hotel


async def update_hotel(db: AsyncSession, hotel_id: int, data: HotelUpdate) -> Hotel:
    """Update hotel profile details."""
    hotel = await get_hotel(db, hotel_id)

    updates = data.model_dump(exclude_unset=True)
    for field, val in updates.items():
        if isinstance(val, str):
            val = val.strip()
        setattr(hotel, field, val)

    try:
        await db.commit()
        await db.refresh(hotel)
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Integrity error updating hotel",
        ) from exc

    return hotel


async def search_availability(
    db: AsyncSession,
    hotel_id: int | None = None,
    city: str | None = None,
    hotel_ids: list[int] | None = None,
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
    # The hotel_ids clause is a fixed string added only when a list is given;
    # the ids themselves are bound as an expanding parameter (IN (?, ?, ...)).
    hotel_ids_clause = "AND h.id IN :hotel_ids" if hotel_ids else ""
    query_sql = text(f"""
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
          {hotel_ids_clause}
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
    params = {
        "hotel_id": hotel_id,
        "city": city.strip() if city else None,
        "check_in": check_in,
        "check_out": check_out,
        "guests": guests,
    }
    if hotel_ids:
        query_sql = query_sql.bindparams(bindparam("hotel_ids", expanding=True))
        params["hotel_ids"] = hotel_ids

    results = (await db.execute(query_sql, params)).mappings().all()

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


async def list_hotel_reviews(db: AsyncSession, hotel_id: int) -> dict:
    """Retrieve all verified customer reviews and aggregate rating for a hotel."""
    from app.models.review import Review
    from app.models.user import User

    # Ensure hotel exists
    await get_hotel(db, hotel_id)

    reviews_stmt = (
        select(Review, User.full_name)
        .join(User, Review.user_id == User.id)
        .where(Review.hotel_id == hotel_id)
        .order_by(Review.created_at.desc())
    )
    rows = (await db.execute(reviews_stmt)).all()

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


async def list_member_hotels(db: AsyncSession, user_id: int) -> list[tuple[Hotel, str]]:
    """Hotels the user belongs to through hotel_members, with their role."""
    rows = (await db.execute(
        select(Hotel, HotelMember.role)
        .join(HotelMember, HotelMember.hotel_id == Hotel.id)
        .where(HotelMember.user_id == user_id)
        .order_by(Hotel.name, Hotel.id)
    )).all()
    return [(hotel, role) for hotel, role in rows]
