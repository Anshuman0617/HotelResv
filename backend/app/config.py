from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    PROJECT_NAME: str = "Hotel Booking System API"
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/hotel_booking"

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60, gt=0, le=1440)
    CORS_ORIGINS: str = "http://localhost:3000"
    GOOGLE_CLIENT_ID: str = ""

    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def validate_jwt_secret(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters")

        placeholder_check = normalized.casefold()
        if placeholder_check.startswith(
            (
                "change-this-secret-in-production",
                "your-secret-key",
                "replace-me",
                "<replace-with-a-secret-of-at-least-32-characters>",
                "replace-with-a-secret-of-at-least-32-characters",
                "<replace_with_a_real_secret_at_least_32_characters>",
                "replace_with_a_real_secret_at_least_32_characters",
                "your-secret-here",
                "secret",
            )
        ):
            raise ValueError("JWT_SECRET_KEY cannot be a placeholder")

        return normalized

    model_config = SettingsConfigDict(
        env_file=(str(ROOT_DIR / ".env"), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
