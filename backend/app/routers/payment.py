from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.dependencies import get_db
from app.models.payment import Payment
from app.schemas.payment import PaymentCreate

router = APIRouter(
    prefix="/payments",
    tags=["Payments"]
)


@router.get("/")
def get_payments(db: Session = Depends(get_db)):
    return db.query(Payment).all()


@router.post("/")
def add_payment(payment: PaymentCreate, db: Session = Depends(get_db)):
    new_payment = Payment(
        member_id=payment.member_id,
        amount=payment.amount,
        payment_date=payment.payment_date
    )

    db.add(new_payment)
    db.commit()
    db.refresh(new_payment)

    return {
        "message": "Payment recorded successfully",
        "payment": new_payment
    }