from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Member(Base):
    __tablename__ = "members"

    id: Mapped[int] = mapped_column(primary_key=True)

    first_name: Mapped[str] = mapped_column(String(50))
    last_name: Mapped[str] = mapped_column(String(50))
    age: Mapped[int] = mapped_column(Integer)

    phone_number: Mapped[str] = mapped_column(String(15), unique=True)
    email: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    fee: Mapped[int] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    batch_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("batches.id"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    batch: Mapped[Optional["Batch"]] = relationship(        # noqa: F821
        "Batch", back_populates="members"
    )
    payments: Mapped[list["Payment"]] = relationship(       # noqa: F821
        "Payment", back_populates="member", cascade="all, delete-orphan"
    )
    attendances: Mapped[list["Attendance"]] = relationship( # noqa: F821
        "Attendance", back_populates="member", cascade="all, delete-orphan"
    )
