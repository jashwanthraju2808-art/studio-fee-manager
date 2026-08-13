from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.core.auth import get_current_user
from app.database.dependencies import get_db
from app.models.member import Member
from app.models.user import User
from app.schemas.member import MemberCreate, MemberUpdate, MemberResponse
from app.services.audit_service import log_action

router = APIRouter(prefix="/members", tags=["Members"])


def _calculate_age(dob: date) -> int:
    """Age in whole years from date of birth."""
    today = date.today()
    return today.year - dob.year - (
        1 if (today.month, today.day) < (dob.month, dob.day) else 0
    )


def _base_q(db: Session):
    """Active members with batch eager-loaded."""
    return (
        db.query(Member)
        .options(joinedload(Member.batch))
        .filter(Member.is_active == True)  # noqa: E712
    )


# ── List / search ──────────────────────────────────────────

@router.get("/", response_model=List[MemberResponse])
def get_members(
    batch_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
):
    q = _base_q(db)
    if batch_id:
        q = q.filter(Member.batch_id == batch_id)
    return q.order_by(Member.first_name).all()


@router.get("/search", response_model=List[MemberResponse])
def search_members(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
):
    return (
        _base_q(db)
        .filter(
            Member.first_name.ilike(f"%{q}%")
            | Member.last_name.ilike(f"%{q}%")
            | Member.phone_number.ilike(f"%{q}%")
        )
        .all()
    )


@router.get("/{member_id}", response_model=MemberResponse)
def get_member(member_id: int, db: Session = Depends(get_db)):
    member = _base_q(db).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member


# ── Create ─────────────────────────────────────────────────

@router.post("/", response_model=MemberResponse, status_code=201)
def add_member(
    payload: MemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if db.query(Member).filter(Member.phone_number == payload.phone_number).first():
        raise HTTPException(status_code=400, detail="Phone number already exists")

    data = payload.model_dump()

    # Auto-calculate age from DOB; ignore any client-supplied age
    if data.get("date_of_birth"):
        data["age"] = _calculate_age(data["date_of_birth"])

    new_member = Member(**data)
    db.add(new_member)
    db.flush()

    log_action(
        db,
        username=current_user.username,
        action="CREATE",
        module="Members",
        description=(
            f"Member '{new_member.first_name} {new_member.last_name or ''}' "
            f"(phone: {new_member.phone_number}) created by '{current_user.username}'"
        ),
    )
    db.commit()
    db.refresh(new_member)
    return _base_q(db).filter(Member.id == new_member.id).first()


# ── Update ─────────────────────────────────────────────────

@router.put("/{member_id}", response_model=MemberResponse)
def update_member(
    member_id: int,
    payload: MemberUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = _base_q(db).filter(Member.id == member_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Member not found")

    # Phone uniqueness check (exclude self)
    phone_owner = db.query(Member).filter(
        Member.phone_number == payload.phone_number,
        Member.id != member_id,
    ).first()
    if phone_owner:
        raise HTTPException(status_code=400, detail="Phone number already exists")

    data = payload.model_dump()

    # Auto-calculate age from DOB
    if data.get("date_of_birth"):
        data["age"] = _calculate_age(data["date_of_birth"])

    for field, value in data.items():
        setattr(existing, field, value)

    log_action(
        db,
        username=current_user.username,
        action="UPDATE",
        module="Members",
        description=(
            f"Member '{existing.first_name} {existing.last_name or ''}' "
            f"(id={member_id}) updated by '{current_user.username}'"
        ),
    )
    db.commit()
    return _base_q(db).filter(Member.id == member_id).first()


# ── Deactivate (soft-delete) ───────────────────────────────

@router.delete("/{member_id}")
def delete_member(
    member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    member = db.query(Member).filter(
        Member.id == member_id,
        Member.is_active == True,  # noqa: E712
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    member_name = f"{member.first_name} {member.last_name or ''}".strip()
    member.is_active = False

    log_action(
        db,
        username=current_user.username,
        action="DEACTIVATE",
        module="Members",
        description=(
            f"Member '{member_name}' (id={member_id}, phone={member.phone_number}) "
            f"deactivated by '{current_user.username}'"
        ),
    )
    db.commit()
    return {"message": "Member marked as inactive"}
