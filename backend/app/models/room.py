from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.booking import BookingRoom
    from app.models.hotel import Hotel


class RoomType(Base):
    __tablename__ = "room_types"
    __table_args__ = (
        UniqueConstraint("hotel_id", "name", name="uq_room_types_hotel_name"),
        UniqueConstraint("id", "hotel_id", name="uq_room_types_id_hotel"),
        CheckConstraint("max_guests > 0", name="ck_room_types_max_guests_pos"),
        CheckConstraint("base_price >= 0", name="ck_room_types_base_price_nonneg"),
        Index("idx_room_types_hotel_id", "hotel_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    hotel_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("hotels.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    max_guests: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    base_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relationships
    hotel: Mapped["Hotel"] = relationship("Hotel", back_populates="room_types")
    rooms: Mapped[list["Room"]] = relationship(
        "Room",
        back_populates="room_type",
        foreign_keys="Room.room_type_id",
    )
    booking_rooms: Mapped[list["BookingRoom"]] = relationship(
        "BookingRoom",
        back_populates="room_type",
        foreign_keys="BookingRoom.room_type_id",
    )


class Room(Base):
    __tablename__ = "rooms"
    __table_args__ = (
        UniqueConstraint("hotel_id", "room_number", name="uq_rooms_hotel_room_number"),
        UniqueConstraint("id", "room_type_id", name="uq_rooms_id_room_type"),
        ForeignKeyConstraint(
            ["room_type_id", "hotel_id"],
            ["room_types.id", "room_types.hotel_id"],
            name="fk_rooms_room_type_hotel_match",
            ondelete="RESTRICT",
        ),
        CheckConstraint(
            "status IN ('active', 'maintenance', 'inactive')",
            name="ck_rooms_status",
        ),
        Index("idx_rooms_hotel_type_status", "hotel_id", "room_type_id", "status"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    hotel_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("hotels.id", ondelete="CASCADE"),
        nullable=False,
    )
    room_type_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("room_types.id", ondelete="RESTRICT"),
        nullable=False,
    )
    room_number: Mapped[str] = mapped_column(String(20), nullable=False)
    floor: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="active",
        server_default="active",
    )

    # Relationships
    hotel: Mapped["Hotel"] = relationship(
        "Hotel",
        back_populates="rooms",
        foreign_keys=[hotel_id],
        overlaps="room_type,rooms",
    )
    room_type: Mapped["RoomType"] = relationship(
        "RoomType",
        back_populates="rooms",
        foreign_keys=[room_type_id],
        overlaps="hotel,rooms",
    )
    booking_rooms: Mapped[list["BookingRoom"]] = relationship(
        "BookingRoom",
        back_populates="room",
        foreign_keys="BookingRoom.room_id",
    )
