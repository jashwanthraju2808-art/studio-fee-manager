from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.auth import get_current_user
from app.database.dependencies import get_db
from app.models.member import Member
from app.models.payment import Payment
from app.models.user import User
from app.schemas.payment import PaymentCreate, PaymentResponse
from app.services.audit_service import log_action

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get("/", response_model=List[PaymentResponse])
def get_payments(db: Session = Depends(get_db)):
    return db.query(Payment).order_by(Payment.payment_date.desc()).all()


@router.get("/member/{member_id}", response_model=List[PaymentResponse])
def get_payments_by_member(member_id: int, db: Session = Depends(get_db)):
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return (
        db.query(Payment)
        .filter(Payment.member_id == member_id)
        .order_by(Payment.payment_date.desc())
        .all()
    )


@router.get("/month/{month}", response_model=List[PaymentResponse])
def get_payments_by_month(month: str, db: Session = Depends(get_db)):
    """month format: YYYY-MM  e.g. 2026-08"""
    return (
        db.query(Payment)
        .filter(Payment.month == month)
        .order_by(Payment.payment_date.desc())
        .all()
    )


@router.post("/", response_model=PaymentResponse, status_code=201)
def add_payment(
    payment: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    member = db.query(Member).filter(
        Member.id == payment.member_id,
        Member.is_active == True  # noqa: E712
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Active member not found")

    new_payment = Payment(
        member_id=payment.member_id,
        amount=payment.amount,
        month=payment.month,
        payment_date=payment.payment_date,
        note=payment.note,
    )
    db.add(new_payment)
    db.flush()  # get new_payment.id

    log_action(
        db,
        username=current_user.username,
        action="CREATE",
        module="Payments",
        description=(
            f"Payment of ₹{payment.amount} recorded for member "
            f"'{member.first_name} {member.last_name}' (month: {payment.month}) "
            f"by '{current_user.username}'"
        ),
    )
    db.commit()
    db.refresh(new_payment)
    return new_payment


@router.delete("/{payment_id}", status_code=200)
def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    member = db.query(Member).filter(Member.id == payment.member_id).first()
    member_name = f"{member.first_name} {member.last_name}" if member else f"id={payment.member_id}"

    log_action(
        db,
        username=current_user.username,
        action="DELETE",
        module="Payments",
        description=(
            f"Payment (id={payment_id}) of ₹{payment.amount} for member "
            f"'{member_name}' (month: {payment.month}) deleted by '{current_user.username}'"
        ),
    )
    db.delete(payment)
    db.commit()
    return {"message": "Payment deleted"}


@router.put("/{payment_id}", response_model=PaymentResponse)
def update_payment(
    payment_id: int,
    payment: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(Payment).filter(Payment.id == payment_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Payment not found")

    member = db.query(Member).filter(
        Member.id == payment.member_id,
        Member.is_active == True  # noqa: E712
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Active member not found")

    existing.member_id    = payment.member_id
    existing.amount       = payment.amount
    existing.month        = payment.month
    existing.payment_date = payment.payment_date
    existing.note         = payment.note

    log_action(
        db,
        username=current_user.username,
        action="UPDATE",
        module="Payments",
        description=(
            f"Payment (id={payment_id}) updated to ₹{payment.amount} for member "
            f"'{member.first_name} {member.last_name}' (month: {payment.month}) "
            f"by '{current_user.username}'"
        ),
    )
    db.commit()
    db.refresh(existing)
    return existing
