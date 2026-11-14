from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.room import RoomTypeResponse

HotelStatus = Literal["pending", "active", "suspended"]


class HotelBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=180)
    description: str | None = None
    address_line: str = Field(..., min_length=1, max_length=255)
    city: str = Field(..., min_length=1, max_length=100)
    state: str | None = Field(None, max_length=100)
    country: str = Field(..., min_length=1, max_length=100)
    postal_code: str | None = Field(None, max_length=20)
    timezone: str = Field(default="Asia/Kolkata", max_length=64)


class HotelCreate(HotelBase):
    pass


class HotelUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=180)
    description: str | None = None
    address_line: str | None = Field(None, min_length=1, max_length=255)
    city: str | None = Field(None, min_length=1, max_length=100)
    state: str | None = Field(None, max_length=100)
    country: str | None = Field(None, min_length=1, max_length=100)
    postal_code: str | None = Field(None, max_length=20)
    timezone: str | None = Field(None, max_length=64)
    status: HotelStatus | None = None


class HotelResponse(HotelBase):
    id: int
    status: HotelStatus
    registered_by: int
    created_at: datetime
    room_types: list[RoomTypeResponse] = []

    model_config = ConfigDict(from_attributes=True)


class HotelSummary(HotelBase):
    id: int
    status: HotelStatus
    registered_by: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

