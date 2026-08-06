from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.dependencies import get_db
from app.models.member import Member
from app.schemas.member import MemberCreate, MemberUpdate

router = APIRouter(
    prefix="/members",
    tags=["Members"]
)


# Get all active members
@router.get("/")
def get_members(db: Session = Depends(get_db)):
    return db.query(Member).filter(Member.is_active == True).all()


# Search members
@router.get("/search")
def search_members(
    q: str = Query(...),
    db: Session = Depends(get_db)
):
    return db.query(Member).filter(
        Member.is_active == True,
        (
            Member.first_name.ilike(f"%{q}%") |
            Member.last_name.ilike(f"%{q}%") |
            Member.phone_number.ilike(f"%{q}%")
        )
    ).all()


# Get member by ID
@router.get("/{member_id}")
def get_member(member_id: int, db: Session = Depends(get_db)):
    member = db.query(Member).filter(
        Member.id == member_id,
        Member.is_active == True
    ).first()

    if member is None:
        raise HTTPException(
            status_code=404,
            detail="Member not found"
        )

    return member


# Add member
@router.post("/")
def add_member(member: MemberCreate, db: Session = Depends(get_db)):

    existing_member = db.query(Member).filter(
        Member.phone_number == member.phone_number
    ).first()

    if existing_member:
        raise HTTPException(
            status_code=400,
            detail="Phone number already exists"
        )

    new_member = Member(
        first_name=member.first_name,
        last_name=member.last_name,
        age=member.age,
        phone_number=member.phone_number,
        email=member.email,
        fee=member.fee,
        is_active=True
    )

    db.add(new_member)
    db.commit()
    db.refresh(new_member)

    return {
        "message": "Member added successfully",
        "member": new_member
    }


# Update member
@router.put("/{member_id}")
def update_member(
    member_id: int,
    member: MemberUpdate,
    db: Session = Depends(get_db)
):
    existing_member = db.query(Member).filter(
        Member.id == member_id,
        Member.is_active == True
    ).first()

    if existing_member is None:
        raise HTTPException(
            status_code=404,
            detail="Member not found"
        )

    # Check if another member already has this phone number
    phone_owner = db.query(Member).filter(
        Member.phone_number == member.phone_number,
        Member.id != member_id
    ).first()

    if phone_owner:
        raise HTTPException(
            status_code=400,
            detail="Phone number already exists"
        )

    existing_member.first_name = member.first_name
    existing_member.last_name = member.last_name
    existing_member.age = member.age
    existing_member.phone_number = member.phone_number
    existing_member.email = member.email
    existing_member.fee = member.fee

    db.commit()
    db.refresh(existing_member)

    return {
        "message": "Member updated successfully",
        "member": existing_member
    }


# Soft delete member
@router.delete("/{member_id}")
def delete_member(member_id: int, db: Session = Depends(get_db)):
    member = db.query(Member).filter(
        Member.id == member_id,
        Member.is_active == True
    ).first()

    if member is None:
        raise HTTPException(
            status_code=404,
            detail="Member not found"
        )

    member.is_active = False

    db.commit()

    return {
        "message": "Member marked as inactive"
    }