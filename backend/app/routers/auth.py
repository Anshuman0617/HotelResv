
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.auth import RegisterRequest, LoginRequest
from app.services.auth_service import register_user, login_user
from app.dependencies.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db),
):
    result = register_user(db, data)

    return {
    "success": True,
    "message": "Registration successful",
    "data": {
        "access_token": result["access_token"],
        "token_type": result["token_type"],
        "user": {
            "id": result["user"].id,
            "full_name": result["user"].full_name,
            "email": result["user"].email,
            "phone": result["user"].phone,
        },
    },
}
    
@router.post("/login")
def login(
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    result = login_user(db, data)

    return {
        "success": True,
        "message": "Login successful",
        "data": {
            "access_token": result["access_token"],
            "token_type": result["token_type"],
            "user": {
                "id": result["user"].id,
                "full_name": result["user"].full_name,
                "email": result["user"].email,
                "phone": result["user"].phone,
            },
        },
    }
    
@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "success": True,
        "message": "User retrieved successfully",
        "data": {
            "id": current_user.id,
            "full_name": current_user.full_name,
            "email": current_user.email,
            "phone": current_user.phone,
        },
    }