from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr

# Roles an owner can grant. "owner" is set once, when the hotel is registered.
GrantableRole = Literal["manager", "staff"]


class MemberCreate(BaseModel):
    email: EmailStr
    role: GrantableRole


class MemberRoleUpdate(BaseModel):
    role: GrantableRole


class MemberResponse(BaseModel):
    user_id: int
    full_name: str
    email: EmailStr
    role: Literal["owner", "manager", "staff"]
    joined_at: datetime
