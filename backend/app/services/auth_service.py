
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from fastapi.concurrency import run_in_threadpool
from jose import jwt
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest
from app.security import hash_password, verify_password


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "exp": expire,
    }

    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


async def register_user(db: AsyncSession, data: RegisterRequest) -> dict:
    # 1. Check whether the email already exists
    existing_user = await db.scalar(
        select(User).where(User.email == data.email)
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    # 2. Hash the password. bcrypt is deliberately slow CPU work, so it runs in
    # a thread instead of blocking the event loop for every other request.
    password_hash = await run_in_threadpool(hash_password, data.password)
    user = User(
        full_name=data.full_name,
        email=data.email,
        password_hash=password_hash,
        phone=data.phone,
    )

    # 3. Save the user
    try:
        db.add(user)
        await db.commit()
        await db.refresh(user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    # 4. Generate JWT
    access_token = create_access_token(user.id)

    # 5. Return token and user details
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
    }


async def login_user(db: AsyncSession, data: LoginRequest) -> dict:
    # 1. Find user by email
    user = await db.scalar(
        select(User).where(User.email == data.email)
    )

    # 2. Verify credentials (bcrypt runs in a thread, like hashing above)
    if not user or not await run_in_threadpool(
        verify_password,
        data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Generate JWT
    access_token = create_access_token(user.id)

    # 4. Return token and user
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
    }
