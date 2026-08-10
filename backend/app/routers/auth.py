from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.auth import verify_password, create_access_token, get_current_user
from app.database.dependencies import get_db
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Auth"])


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    username: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/login", response_model=TokenResponse)
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(
        User.username == form.username,
        User.is_active == True,  # noqa: E712
    ).first()

    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token({"sub": user.username})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        username=user.username,
    )


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "role": current_user.role,
    }


@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    from app.core.auth import hash_password
    current_user.hashed_password = hash_password(body.new_password)
    db.commit()
    return {"message": "Password changed successfully"}

class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: str = "staff"


class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool


def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


@router.get("/users", response_model=list[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return db.query(User).order_by(User.id).all()


@router.post("/users", response_model=UserResponse)
def create_user(
    body: CreateUserRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    username = body.username.strip()

    if not username:
        raise HTTPException(
            status_code=400,
            detail="Username is required",
        )

    if len(body.password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters",
        )

    if body.role not in ("admin", "staff"):
        raise HTTPException(
            status_code=400,
            detail="Role must be admin or staff",
        )

    existing = db.query(User).filter(User.username == username).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Username already exists",
        )

    from app.core.auth import hash_password

    user = User(
        username=username,
        hashed_password=hash_password(body.password),
        role=body.role,
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@router.put("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    if user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot deactivate your own account",
        )

    user.is_active = not user.is_active
    db.commit()

    return {
        "message": "User status updated",
        "is_active": user.is_active,
    }


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    if user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own account",
        )

    db.delete(user)
    db.commit()

    return {"message": "User deleted successfully"}
