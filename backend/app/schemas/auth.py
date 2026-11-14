from pydantic import BaseModel, EmailStr, Field, field_validator


def validate_password_byte_length(password: str) -> str:
    if len(password.encode("utf-8")) > 72:
        raise ValueError("Password must not exceed 72 UTF-8 bytes")
    return password


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8)
    phone: str | None = Field(default=None, max_length=25)

    _validate_password_length = field_validator("password")(
        validate_password_byte_length
    )


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    phone: str | None

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    _validate_password_length = field_validator("password")(
        validate_password_byte_length
    )


class GoogleOAuthRequest(BaseModel):
    id_token: str


    _validate_password_length = field_validator("password")(
        validate_password_byte_length
    )


class GoogleOAuthRequest(BaseModel):
    id_token: str