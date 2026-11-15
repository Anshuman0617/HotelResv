from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.hotel import HotelSummary
from app.services import hotel_service

router = APIRouter(prefix="/api/manager", tags=["Manager"])


@router.get("/hotels")
async def my_hotels(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, Any]:
    """Hotels the signed-in user is an owner, manager or staff member of."""
    data = [
        {**HotelSummary.model_validate(hotel).model_dump(mode="json"), "role": role}
        for hotel, role in await hotel_service.list_member_hotels(db, user.id)
    ]
    return {"success": True, "message": "Member hotels retrieved", "data": data}
