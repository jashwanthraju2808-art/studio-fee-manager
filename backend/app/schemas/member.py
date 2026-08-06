from pydantic import BaseModel
from typing import Optional


class MemberCreate(BaseModel):
    first_name: str
    last_name: str
    age: int
    phone_number: str
    email: Optional[str] = None
    fee: int


class MemberUpdate(BaseModel):
    first_name: str
    last_name: str
    age: int
    phone_number: str
    email: Optional[str] = None
    fee: int