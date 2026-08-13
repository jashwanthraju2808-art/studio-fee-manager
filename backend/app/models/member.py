from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Member(Base):
    __tablename__ = "members"

    id: Mapped[int] = mapped_column(primary_key=True)

    # ── Core identity ──────────────────────────────────────
    first_name: Mapped[str]           = mapped_column(String(50))
    last_name:  Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # ── Date of birth — age is auto-calculated, not manually entered ──
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    age:           Mapped[Optional[int]]  = mapped_column(Integer, nullable=True)

    # ── Contact ────────────────────────────────────────────
    phone_number: Mapped[str]           = mapped_column(String(15), unique=True)
    email:        Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # ── Physical health ────────────────────────────────────
    height_cm:    Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    weight_kg:    Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    health_notes: Mapped[Optional[str]]     = mapped_column(Text, nullable=True)

    # ── Studio ─────────────────────────────────────────────
    join_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    fee:       Mapped[int]            = mapped_column(Integer)
    is_active: Mapped[bool]           = mapped_column(Boolean, default=True)

    batch_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("batches.id"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ──────────────────────────────────────
    batch: Mapped[Optional["Batch"]] = relationship(           # noqa: F821
        "Batch", back_populates="members"
    )
    payments: Mapped[list["Payment"]] = relationship(          # noqa: F821
        "Payment", back_populates="member", cascade="all, delete-orphan"
    )
    attendances: Mapped[list["Attendance"]] = relationship(    # noqa: F821
        "Attendance", back_populates="member", cascade="all, delete-orphan"
    )
