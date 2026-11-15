from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import BigInteger, CheckConstraint, Computed, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.booking import Booking
    from app.models.review import Review
    from app.models.room import Room, RoomType
    from app.models.user import User


SEARCH_TEXT_SQL = (
    "lower(name || ' ' || city || ' ' || coalesce(state, '') || ' ' "
    "|| country || ' ' || coalesce(description, ''))"
)


class Hotel(Base):
    __tablename__ = "hotels"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'active', 'suspended')",
            name="ck_hotels_status",
        ),
        Index("idx_hotels_city_status", "city", "status"),
        # Trigram index for fuzzy search (needs the pg_trgm extension).
        Index(
            "idx_hotels_search_text_trgm",
            "search_text",
            postgresql_using="gin",
            postgresql_ops={"search_text": "gin_trgm_ops"},
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    address_line: Mapped[str] = mapped_column(String(255), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str] = mapped_column(String(100), nullable=False)
    postal_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="Asia/Kolkata")
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",
        server_default="pending",
    )
    registered_by: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    # Lower-cased text the fuzzy search matches against. Generated and stored
    # by PostgreSQL, so it can never drift from the columns it is built from.
    search_text: Mapped[str] = mapped_column(
        Text,
        Computed(SEARCH_TEXT_SQL, persisted=True),
        nullable=False,
    )

    # Relationships
    registrant: Mapped["User"] = relationship(
        "User",
        back_populates="registered_hotels",
        foreign_keys=[registered_by],
    )
    members: Mapped[list["HotelMember"]] = relationship(
        "HotelMember",
        back_populates="hotel",
        cascade="all, delete-orphan",
    )
    room_types: Mapped[list["RoomType"]] = relationship(
        "RoomType",
        back_populates="hotel",
        cascade="all, delete-orphan",
    )
    rooms: Mapped[list["Room"]] = relationship(
        "Room",
        back_populates="hotel",
        cascade="all, delete-orphan",
    )
    reviews: Mapped[list["Review"]] = relationship(
        "Review",
        back_populates="hotel",
    )
    bookings: Mapped[list["Booking"]] = relationship(
        "Booking",
        back_populates="hotel",
    )


class HotelMember(Base):
    __tablename__ = "hotel_members"
    __table_args__ = (
        CheckConstraint(
            "role IN ('owner', 'manager', 'staff')",
            name="ck_hotel_members_role",
        ),
    )

    hotel_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("hotels.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relationships
    hotel: Mapped["Hotel"] = relationship("Hotel", back_populates="members")
    user: Mapped["User"] = relationship("User", back_populates="hotel_memberships")


class CityAlias(Base):
    """Other names for a city (Bombay -> Mumbai), so search finds old or
    alternative spellings that share too few letters for fuzzy matching."""

    __tablename__ = "city_aliases"
    __table_args__ = (
        CheckConstraint("alias = lower(alias)", name="ck_city_aliases_lowercase"),
    )

    alias: Mapped[str] = mapped_column(String(100), primary_key=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
