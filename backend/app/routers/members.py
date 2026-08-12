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


def _q(db: Session):
    """Base query: active members with batch eager-loaded."""
    return (
        db.query(Member)
        .options(joinedload(Member.batch))
        .filter(Member.is_active == True)  # noqa: E712
    )


@router.get("/", response_model=List[MemberResponse])
def get_members(
    batch_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
):
    q = _q(db)
    if batch_id:
        q = q.filter(Member.batch_id == batch_id)
    return q.all()


@router.get("/search", response_model=List[MemberResponse])
def search_members(q: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    return (
        _q(db)
        .filter(
            Member.first_name.ilike(f"%{q}%")
            | Member.last_name.ilike(f"%{q}%")
            | Member.phone_number.ilike(f"%{q}%")
        )
        .all()
    )


@router.get("/{member_id}", response_model=MemberResponse)
def get_member(member_id: int, db: Session = Depends(get_db)):
    member = _q(db).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member


@router.post("/", response_model=MemberResponse, status_code=201)
def add_member(
    member: MemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if db.query(Member).filter(Member.phone_number == member.phone_number).first():
        raise HTTPException(status_code=400, detail="Phone number already exists")

    new_member = Member(**member.model_dump())
    db.add(new_member)
    db.flush()  # get new_member.id before logging

    log_action(
        db,
        username=current_user.username,
        action="CREATE",
        module="Members",
        description=(
            f"Member '{new_member.first_name} {new_member.last_name}' "
            f"(phone: {new_member.phone_number}) created by '{current_user.username}'"
        ),
    )
    db.commit()
    db.refresh(new_member)
    return _q(db).filter(Member.id == new_member.id).first()


@router.put("/{member_id}", response_model=MemberResponse)
def update_member(
    member_id: int,
    member: MemberUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = _q(db).filter(Member.id == member_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Member not found")

    phone_owner = db.query(Member).filter(
        Member.phone_number == member.phone_number,
        Member.id != member_id,
    ).first()
    if phone_owner:
        raise HTTPException(status_code=400, detail="Phone number already exists")

    for field, value in member.model_dump().items():
        setattr(existing, field, value)

    log_action(
        db,
        username=current_user.username,
        action="UPDATE",
        module="Members",
        description=(
            f"Member '{existing.first_name} {existing.last_name}' (id={member_id}) "
            f"updated by '{current_user.username}'"
        ),
    )
    db.commit()
    return _q(db).filter(Member.id == member_id).first()


@router.delete("/{member_id}")
def delete_member(
    member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    member = db.query(Member).filter(
        Member.id == member_id, Member.is_active == True  # noqa: E712
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    member_name = f"{member.first_name} {member.last_name}"
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
