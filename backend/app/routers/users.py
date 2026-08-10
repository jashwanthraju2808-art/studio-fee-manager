from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.auth import hash_password, require_admin
from app.database.dependencies import get_db
from app.models.user import User

router = APIRouter(prefix="/users", tags=["User Management"])


class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True


class CreateUserRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6, max_length=100)
    role: str = "staff"


class UpdateUserRequest(BaseModel):
    role: str | None = None
    is_active: bool | None = None


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=6, max_length=100)


@router.get("/", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return db.query(User).order_by(User.id).all()


@router.post("/", response_model=UserResponse)
def create_user(
    body: CreateUserRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if body.role not in ("admin", "staff"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be admin or staff",
        )

    existing = db.query(User).filter(
        User.username == body.username
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists",
        )

    user = User(
        username=body.username,
        hashed_password=hash_password(body.password),
        role=body.role,
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    body: UpdateUserRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if body.role is not None:
        if body.role not in ("admin", "staff"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Role must be admin or staff",
            )

        user.role = body.role

    if body.is_active is not None:
        # Prevent admin from accidentally disabling themselves
        if user.id == admin.id and body.is_active is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot deactivate your own account",
            )

        user.is_active = body.is_active

    db.commit()
    db.refresh(user)

    return user


@router.post("/{user_id}/reset-password")
def reset_password(
    user_id: int,
    body: ResetPasswordRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.hashed_password = hash_password(body.new_password)

    db.commit()

    return {"message": f"Password reset successfully for {user.username}"}