import pytest
from pydantic import ValidationError

from app.schemas.auth import LoginRequest, RegisterRequest
from app.security import hash_password, verify_password


def make_request(request_model: type, password: str):
    request_data = {"email": "user@example.com", "password": password}
    if request_model is RegisterRequest:
        request_data["full_name"] = "Test User"
    return request_model(**request_data)


@pytest.mark.parametrize("request_model", [RegisterRequest, LoginRequest])
def test_accepts_valid_password(request_model: type) -> None:
    data = make_request(request_model, "valid-pass-123")
    hashed = hash_password(data.password)

    assert verify_password(data.password, hashed)


@pytest.mark.parametrize("request_model", [RegisterRequest, LoginRequest])
def test_accepts_password_exactly_72_utf8_bytes(request_model: type) -> None:
    password = "a" * 72
    data = make_request(request_model, password)
    hashed = hash_password(data.password)

    assert len(password.encode("utf-8")) == 72
    assert verify_password(password, hashed)


@pytest.mark.parametrize("request_model", [RegisterRequest, LoginRequest])
@pytest.mark.parametrize("password", ["a" * 73, "é" * 37])
def test_rejects_password_over_72_utf8_bytes(
    request_model: type,
    password: str,
) -> None:
    with pytest.raises(ValidationError, match="Password must not exceed 72 UTF-8 bytes"):
        make_request(request_model, password)


def test_hash_password_rejects_overlong_password() -> None:
    with pytest.raises(ValueError, match="Password must not exceed 72 UTF-8 bytes"):
        hash_password("a" * 73)


def test_verify_password_returns_false_for_overlong_password() -> None:
    assert verify_password("a" * 73, "unused-hash") is False
