from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


class MemberCreate(BaseModel):
    first_name: str
    last_name: str
    age: int
    phone_number: str
    email: Optional[str] = None
    fee: int
    batch_id: Optional[int] = None

    @field_validator("email", mode="before")
    @classmethod
    def empty_email_to_none(cls, v):
        if isinstance(v, str) and not v.strip():
            return None
        return v


class MemberUpdate(BaseModel):
    first_name: str
    last_name: str
    age: int
    phone_number: str
    email: Optional[str] = None
    fee: int
    batch_id: Optional[int] = None

    @field_validator("email", mode="before")
    @classmethod
    def empty_email_to_none(cls, v):
        if isinstance(v, str) and not v.strip():
            return None
        return v


class MemberResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    age: int
    phone_number: str
    email: Optional[str] = None
    fee: int
    is_active: bool
    batch_id: Optional[int] = None
    batch_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, **kwargs):
        data = super().model_validate(obj, **kwargs)
        if hasattr(obj, "batch") and obj.batch:
            data.batch_name = obj.batch.name
        return data
