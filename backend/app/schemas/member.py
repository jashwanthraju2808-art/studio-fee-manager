from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, field_validator, model_validator


def _calculate_age(dob: date) -> int:
    """Calculate age in whole years from a date of birth."""
    today = date.today()
    return today.year - dob.year - (
        1 if (today.month, today.day) < (dob.month, dob.day) else 0
    )


class MemberCreate(BaseModel):
    first_name:    str
    last_name:     Optional[str] = None
    date_of_birth: Optional[date] = None
    # age is NOT accepted from client — always computed from date_of_birth
    phone_number:  str
    email:         Optional[str] = None
    height_cm:     Optional[Decimal] = None
    weight_kg:     Optional[Decimal] = None
    health_notes:  Optional[str] = None
    join_date:     Optional[date] = None
    fee:           int
    batch_id:      Optional[int] = None

    @field_validator("email", mode="before")
    @classmethod
    def empty_email_to_none(cls, v):
        if isinstance(v, str) and not v.strip():
            return None
        return v

    @field_validator("last_name", "health_notes", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        if isinstance(v, str) and not v.strip():
            return None
        return v


class MemberUpdate(MemberCreate):
    """Identical to MemberCreate — separate class kept for future divergence."""
    pass


class BatchInfo(BaseModel):
    id: int
    name: str
    start_time: str
    end_time: str

    model_config = {"from_attributes": True}


class MemberResponse(BaseModel):
    id:            int
    first_name:    str
    last_name:     Optional[str] = None
    date_of_birth: Optional[date] = None
    age:           Optional[int] = None
    phone_number:  str
    email:         Optional[str] = None
    height_cm:     Optional[Decimal] = None
    weight_kg:     Optional[Decimal] = None
    health_notes:  Optional[str] = None
    join_date:     Optional[date] = None
    fee:           int
    is_active:     bool
    batch_id:      Optional[int] = None
    batch_name:    Optional[str] = None
    batch:         Optional[BatchInfo] = None   # full batch object for start_time on frontend
    created_at:    datetime

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, **kwargs):
        instance = super().model_validate(obj, **kwargs)
        # Pydantic reads the `batch` relationship automatically via from_attributes.
        # Additionally populate batch_name as a flat convenience field.
        if hasattr(obj, "batch") and obj.batch:
            instance.batch_name = obj.batch.name
        return instance
