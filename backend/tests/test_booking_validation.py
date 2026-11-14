from datetime import date, timedelta
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.schemas.booking import BookingRequest, PaymentRequest, ReviewRequest


def payload():
    return {"hotel_id": 1, "check_in": date.today() + timedelta(days=1), "check_out": date.today() + timedelta(days=2), "rooms": [{"room_type_id": 1, "quantity": 1, "guests_per_room": 2}]}


def test_valid_and_invalid_dates_and_duplicates():
    data = payload()
    assert BookingRequest(**data).rooms[0].quantity == 1
    data["check_out"] = data["check_in"]
    with pytest.raises(ValidationError):
        BookingRequest(**data)
    data = payload()
    data["rooms"].append(data["rooms"][0])
    with pytest.raises(ValidationError):
        BookingRequest(**data)


def test_payment_and_review_inputs():
    assert PaymentRequest(outcome="failed").outcome == "failed"
    with pytest.raises(ValidationError):
        PaymentRequest(outcome="refunded")
    with pytest.raises(ValidationError):
        ReviewRequest(rating=6)
