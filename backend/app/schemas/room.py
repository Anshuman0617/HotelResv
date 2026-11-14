from datetime import datetime
from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

RoomStatus = Literal["active", "maintenance", "inactive"]


class RoomTypeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    max_guests: int = Field(..., gt=0, le=20)
    base_price: Decimal = Field(..., ge=0)


class RoomTypeCreate(RoomTypeBase):
    pass


class RoomTypeUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = None
    max_guests: int | None = Field(None, gt=0, le=20)
    base_price: Decimal | None = Field(None, ge=0)


class RoomTypeResponse(RoomTypeBase):
    id: int
    hotel_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RoomBase(BaseModel):
    room_number: str = Field(..., min_length=1, max_length=20)
    floor: int | None = None
    status: RoomStatus = "active"


class RoomCreate(RoomBase):
    room_type_id: int


class RoomStatusUpdate(BaseModel):
    status: RoomStatus


class RoomResponse(RoomBase):
    id: int
    hotel_id: int
    room_type_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AvailableRoomType(BaseModel):
    hotel_id: int
    hotel_name: str
    city: str
    room_type_id: int
    room_type_name: str
    max_guests: int
    base_price: Decimal
    available_rooms_count: int

