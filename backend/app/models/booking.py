from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Numeric,
    SmallInteger,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.payment import Payment
    from app.models.review import Review
    from app.models.room import Room, RoomType
    from app.models.user import User


class Booking(Base):
    __tablename__ = "bookings"
    __table_args__ = (
        CheckConstraint("check_out > check_in", name="ck_bookings_valid_dates"),
        CheckConstraint("guest_count > 0", name="ck_bookings_guest_count_pos"),
        CheckConstraint(
            "status IN ('pending', 'confirmed', 'cancelled', 'completed')",
            name="ck_bookings_status",
        ),
        Index("idx_bookings_user_checkin", "user_id", "check_in"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    check_in: Mapped[date] = mapped_column(Date, nullable=False)
    check_out: Mapped[date] = mapped_column(Date, nullable=False)
    guest_count: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",
        server_default="pending",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="bookings")
    booking_rooms: Mapped[list["BookingRoom"]] = relationship(
        "BookingRoom",
        back_populates="booking",
        cascade="all, delete-orphan",
    )
    payments: Mapped[list["Payment"]] = relationship(
        "Payment",
        back_populates="booking",
        cascade="all, delete-orphan",
    )
    review: Mapped["Review | None"] = relationship(
        "Review",
        back_populates="booking",
        uselist=False,
    )


class BookingRoom(Base):
    __tablename__ = "booking_rooms"
    __table_args__ = (
        ForeignKeyConstraint(
            ["room_id", "room_type_id"],
            ["rooms.id", "rooms.room_type_id"],
            name="fk_booking_rooms_room_type_match",
            ondelete="RESTRICT",
        ),
        CheckConstraint("nightly_rate >= 0", name="ck_booking_rooms_nightly_rate_nonneg"),
        CheckConstraint("guest_count > 0", name="ck_booking_rooms_guest_count_pos"),
        Index("idx_booking_rooms_booking_id", "booking_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    booking_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=False,
    )
    room_type_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("room_types.id", ondelete="RESTRICT"),
        nullable=False,
    )
    room_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("rooms.id", ondelete="SET NULL"),
        nullable=True,
    )
    nightly_rate: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    guest_count: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relationships
    booking: Mapped["Booking"] = relationship("Booking", back_populates="booking_rooms")
    room_type: Mapped["RoomType"] = relationship(
        "RoomType",
        back_populates="booking_rooms",
        foreign_keys=[room_type_id],
        overlaps="room,booking_rooms",
    )
    room: Mapped["Room | None"] = relationship(
        "Room",
        back_populates="booking_rooms",
        foreign_keys=[room_id],
        overlaps="room_type,booking_rooms",
    )
