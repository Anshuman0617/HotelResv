from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    PROJECT_NAME: str = "Hotel Booking System API"
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/hotel_booking"
    JWT_SECRET_KEY: str = "change-this-secret-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    CORS_ORIGINS: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=(str(ROOT_DIR / ".env"), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
