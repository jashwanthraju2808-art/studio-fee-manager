from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


class PaymentCreate(BaseModel):
    member_id: int
    amount: int
    month: str          # "YYYY-MM"
    payment_date: date
    note: Optional[str] = None


class PaymentResponse(BaseModel):
    id: int
    member_id: int
    amount: int
    month: str
    payment_date: date
    note: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
