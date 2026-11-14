from datetime import date
from typing import Literal
from pydantic import BaseModel, Field, model_validator


class RoomRequest(BaseModel):
    room_type_id: int = Field(gt=0)
    quantity: int = Field(gt=0, le=100)
    guests_per_room: int = Field(gt=0)


class BookingRequest(BaseModel):
    hotel_id: int = Field(gt=0)
    check_in: date
    check_out: date
    rooms: list[RoomRequest] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def validate_request(self):
        if self.check_in < date.today() or self.check_out <= self.check_in:
            raise ValueError("Check-in must be today or later and check-out must be after check-in")
        if len({room.room_type_id for room in self.rooms}) != len(self.rooms):
            raise ValueError("Each room type must appear only once")
        if sum(room.quantity for room in self.rooms) > 100:
            raise ValueError("A booking may contain at most 100 rooms")
        if sum(room.quantity * room.guests_per_room for room in self.rooms) > 32767:
            raise ValueError("Too many guests")
        return self


class PaymentRequest(BaseModel):
    outcome: Literal["successful", "failed"]


class ReviewRequest(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str | None = None
