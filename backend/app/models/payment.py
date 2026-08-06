from datetime import date

from sqlalchemy import ForeignKey, Integer, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)

    member_id: Mapped[int] = mapped_column(
        ForeignKey("members.id")
    )

    amount: Mapped[int] = mapped_column(Integer)

    payment_date: Mapped[date] = mapped_column(Date)

    member = relationship("Member")