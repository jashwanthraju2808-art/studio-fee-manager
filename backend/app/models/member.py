from sqlalchemy import String, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class Member(Base):
    __tablename__ = "members"

    id: Mapped[int] = mapped_column(primary_key=True)

    first_name: Mapped[str] = mapped_column(String(50))
    last_name: Mapped[str] = mapped_column(String(50))
    age: Mapped[int] = mapped_column(Integer)

    phone_number: Mapped[str] = mapped_column(
        String(15),
        unique=True
    )

    email: Mapped[str] = mapped_column(
        String(100),
        nullable=True
    )

    fee: Mapped[int] = mapped_column(Integer)

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True
    )