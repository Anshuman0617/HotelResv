"""Hotel team management: the owner grants, changes and removes manager and
staff roles in hotel_members.

The owner row itself is never changed here. It is created with the hotel
(hotel_service.create_hotel) and stays, so every hotel keeps exactly one owner.
"""

from fastapi import HTTPException, status
from sqlalchemy import case, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.hotel import HotelMember
from app.models.user import User
from app.schemas.member import MemberCreate

ROLE_ORDER = case(
    (HotelMember.role == "owner", 0),
    (HotelMember.role == "manager", 1),
    else_=2,
)


def _member_data(membership: HotelMember, user: User) -> dict:
    return {
        "user_id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": membership.role,
        "joined_at": membership.joined_at,
    }


async def list_members(db: AsyncSession, hotel_id: int) -> list[dict]:
    """Everyone with access to the hotel: owner first, then managers, then staff."""
    rows = (await db.execute(
        select(HotelMember, User)
        .join(User, User.id == HotelMember.user_id)
        .where(HotelMember.hotel_id == hotel_id)
        .order_by(ROLE_ORDER, User.full_name, User.id)
    )).all()
    return [_member_data(membership, user) for membership, user in rows]


async def _get_member(db: AsyncSession, hotel_id: int, user_id: int) -> tuple[HotelMember, User]:
    row = (await db.execute(
        select(HotelMember, User)
        .join(User, User.id == HotelMember.user_id)
        .where(HotelMember.hotel_id == hotel_id, HotelMember.user_id == user_id)
    )).first()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This user is not a member of this hotel",
        )
    return row[0], row[1]


def _refuse_owner(membership: HotelMember) -> None:
    if membership.role == "owner":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The hotel owner's membership can't be changed or removed",
        )


async def add_member(db: AsyncSession, hotel_id: int, data: MemberCreate) -> dict:
    """Give an existing account a manager or staff role at this hotel."""
    # users.email is CITEXT, so this match ignores case.
    user = await db.scalar(select(User).where(User.email == data.email))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account uses this email. Ask them to register first.",
        )

    existing = await db.get(HotelMember, (hotel_id, user.id))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"{user.full_name} already has the {existing.role} role at this hotel",
        )

    membership = HotelMember(hotel_id=hotel_id, user_id=user.id, role=data.role)
    db.add(membership)
    try:
        await db.commit()
    except IntegrityError as exc:
        # Another request added the same person between the check and the insert.
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This user is already a member of this hotel",
        ) from exc
    await db.refresh(membership)
    return _member_data(membership, user)


async def update_member_role(db: AsyncSession, hotel_id: int, user_id: int, role: str) -> dict:
    """Switch a member between manager and staff."""
    membership, user = await _get_member(db, hotel_id, user_id)
    _refuse_owner(membership)
    membership.role = role
    await db.commit()
    return _member_data(membership, user)


async def remove_member(db: AsyncSession, hotel_id: int, user_id: int) -> None:
    """Take away a manager's or staff member's access to this hotel."""
    membership, _ = await _get_member(db, hotel_id, user_id)
    _refuse_owner(membership)
    await db.delete(membership)
    await db.commit()
