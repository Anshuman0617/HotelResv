from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import BigInteger, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import CITEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.booking import Booking
    from app.models.hotel import Hotel, HotelMember
    from app.models.review import Review


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(CITEXT, unique=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(25), nullable=True)
    google_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relationships
    registered_hotels: Mapped[list["Hotel"]] = relationship(
        "Hotel",
        back_populates="registrant",
        foreign_keys="Hotel.registered_by",
    )
    hotel_memberships: Mapped[list["HotelMember"]] = relationship(
        "HotelMember",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    bookings: Mapped[list["Booking"]] = relationship(
        "Booking",
        back_populates="user",
    )
    reviews: Mapped[list["Review"]] = relationship(
        "Review",
        back_populates="user",
    )
