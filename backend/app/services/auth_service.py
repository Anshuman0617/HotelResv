
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from jose import jwt
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

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


def register_user(db: Session, data: RegisterRequest) -> dict:
    # 1. Check whether the email already exists
    existing_user = db.scalar(
        select(User).where(User.email == data.email)
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    # 2. Hash the password
    user = User(
        full_name=data.full_name,
        email=data.email,
        password_hash=hash_password(data.password),
        phone=data.phone,
    )

    # 3. Save the user
    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
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


def login_user(db: Session, data: LoginRequest) -> dict:
    # 1. Find user by email
    user = db.scalar(
        select(User).where(User.email == data.email)
    )

    # 2. Verify credentials
    if not user or not verify_password(
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
