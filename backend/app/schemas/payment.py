from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel

PaymentStatus = Literal["paid", "not_paid"]


class PaymentCreate(BaseModel):
    member_id:    int
    amount:       int
    month:        str           # "YYYY-MM"
    payment_date: date
    note:         Optional[str]    = None
    status:       PaymentStatus    = "paid"


class PaymentResponse(BaseModel):
    id:           int
    member_id:    int
    amount:       int
    month:        str
    payment_date: date
    note:         Optional[str]    = None
    status:       str              = "paid"
    created_at:   datetime

    model_config = {"from_attributes": True}
