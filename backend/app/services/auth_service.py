
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


def google_oauth_login(db: Session, id_token_str: str) -> dict:
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests
    from app.config import settings

    if not settings.GOOGLE_CLIENT_ID:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="Google OAuth is not configured")

    try:
        idinfo = id_token.verify_oauth2_token(
            id_token_str,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {exc}")

    google_id = idinfo["sub"]
    email = idinfo.get("email", "")
    full_name = idinfo.get("name", email.split("@")[0])

    # Find by google_id first, then by email
    user = db.scalar(select(User).where(User.google_id == google_id))
    if user is None:
        user = db.scalar(select(User).where(User.email == email))

    if user is None:
        # Create new user
        user = User(
            full_name=full_name,
            email=email,
            password_hash=None,
            google_id=google_id,
        )
        try:
            db.add(user)
            db.commit()
            db.refresh(user)
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=409, detail="Email already registered")
    elif user.google_id is None:
        # Link existing email account to Google
        user.google_id = google_id
        db.commit()
        db.refresh(user)

    access_token = create_access_token(user.id)
    return {"access_token": access_token, "token_type": "bearer", "user": user}
