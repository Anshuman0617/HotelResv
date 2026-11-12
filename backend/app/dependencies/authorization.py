
from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.hotel import HotelMember
from app.models.user import User


VALID_HOTEL_ROLES = {"owner", "manager", "staff"}

def require_hotel_access():
    def check_membership(
        hotel_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> HotelMember:

        membership = db.scalar(
            select(HotelMember).where(
                HotelMember.hotel_id == hotel_id,
                HotelMember.user_id == current_user.id,
            )
        )

        if membership is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this hotel",
            )

        return membership

    return check_membership


def require_hotel_role(allowed_roles: list[str]):
    if not allowed_roles or not set(allowed_roles).issubset(VALID_HOTEL_ROLES):
        raise ValueError("Invalid hotel roles specified")

    def check_role(
        membership: HotelMember = Depends(require_hotel_access()),
    ) -> HotelMember:

        if membership.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )

        return membership

    return check_role