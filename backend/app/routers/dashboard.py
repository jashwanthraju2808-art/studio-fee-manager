from datetime import date, timedelta
from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.dependencies import get_db
from app.models.member import Member
from app.models.payment import Payment

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


class UnpaidMember(BaseModel):
    id: int
    first_name: str
    last_name: str
    phone_number: str
    fee: int


class RecentPayment(BaseModel):
    id: int
    member_id: int
    member_name: str
    amount: int
    month: str
    payment_date: date


class MonthSummary(BaseModel):
    month: str
    collected: int


class DashboardResponse(BaseModel):
    total_active_members: int
    current_month: str
    total_collected_this_month: int
    total_expected_this_month: int
    pending_this_month: int
    unpaid_members: List[UnpaidMember]
    recent_payments: List[RecentPayment]
    monthly_summary: List[MonthSummary]


@router.get("/", response_model=DashboardResponse)
def get_dashboard(db: Session = Depends(get_db)):
    today = date.today()
    current_month = today.strftime("%Y-%m")

    total_active = db.query(func.count(Member.id)).filter(
        Member.is_active == True  # noqa: E712
    ).scalar() or 0

    total_collected = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.month == current_month
    ).scalar() or 0

    total_expected = db.query(func.coalesce(func.sum(Member.fee), 0)).filter(
        Member.is_active == True  # noqa: E712
    ).scalar() or 0

    pending = total_expected - total_collected

    # Members who have NOT paid this month
    paid_member_ids = (
        db.query(Payment.member_id).filter(Payment.month == current_month).subquery()
    )
    unpaid_rows = (
        db.query(Member)
        .filter(
            Member.is_active == True,  # noqa: E712
            ~Member.id.in_(paid_member_ids),
        )
        .order_by(Member.first_name)
        .all()
    )
    unpaid_members = [
        UnpaidMember(
            id=m.id,
            first_name=m.first_name,
            last_name=m.last_name,
            phone_number=m.phone_number,
            fee=m.fee,
        )
        for m in unpaid_rows
    ]

    # Recent 10 payments
    recent_rows = (
        db.query(Payment)
        .join(Member, Payment.member_id == Member.id)
        .order_by(Payment.payment_date.desc(), Payment.id.desc())
        .limit(10)
        .all()
    )
    recent_payments = [
        RecentPayment(
            id=p.id,
            member_id=p.member_id,
            member_name=f"{p.member.first_name} {p.member.last_name}",
            amount=p.amount,
            month=p.month,
            payment_date=p.payment_date,
        )
        for p in recent_rows
    ]

    # 6-month rolling summary
    monthly_summary = []
    for i in range(5, -1, -1):
        # Walk back i months from today
        first_of_month = today.replace(day=1)
        target = date(
            first_of_month.year + (first_of_month.month - i - 1) // 12,
            ((first_of_month.month - i - 1) % 12) + 1,
            1,
        )
        label = target.strftime("%Y-%m")
        collected = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
            Payment.month == label
        ).scalar() or 0
        monthly_summary.append(MonthSummary(month=label, collected=collected))

    return DashboardResponse(
        total_active_members=total_active,
        current_month=current_month,
        total_collected_this_month=total_collected,
        total_expected_this_month=total_expected,
        pending_this_month=pending,
        unpaid_members=unpaid_members,
        recent_payments=recent_payments,
        monthly_summary=monthly_summary,
    )
