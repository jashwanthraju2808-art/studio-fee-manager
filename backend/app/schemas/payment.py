from datetime import date

from pydantic import BaseModel


class PaymentCreate(BaseModel):
    member_id: int
    amount: int
    payment_date: date


class PaymentResponse(BaseModel):
    id: int
    member_id: int
    amount: int
    payment_date: date

    class Config:
        from_attributes = True