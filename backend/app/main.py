from typing import Any
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.routers.auth import router as auth_router
from app.routers.booking import router as booking_router
from app.routers.hotels import router as hotels_router
from app.routers.reports import router as reports_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Database-driven Hotel Booking System REST API (FastAPI + PostgreSQL).",
)
app.include_router(auth_router)
app.include_router(hotels_router)
app.include_router(booking_router)
app.include_router(reports_router)

origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def api_response(data: Any = None, message: str = "Operation successful", success: bool = True) -> dict[str, Any]:
    """Standardized team API response envelope."""
    return {
        "success": success,
        "message": message,
        "data": data if data is not None else {},
    }


@app.get("/api/health", tags=["Health"])
def health_check(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Verify API and PostgreSQL database connectivity."""
    db.execute(text("SELECT 1"))
    return api_response(data={"status": "healthy", "database": "connected"}, message="Service is healthy")
