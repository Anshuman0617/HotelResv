from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from sqlalchemy import BigInteger, CHAR, CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.booking import Booking


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_payments_amount_pos"),
        CheckConstraint(
            "status IN ('initiated', 'successful', 'failed', 'refunded')",
            name="ck_payments_status",
        ),
        Index("idx_payments_booking_id", "booking_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    booking_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=False,
    )
    provider: Mapped[str] = mapped_column(String(40), nullable=False)
    provider_reference: Mapped[str | None] = mapped_column(
        String(160),
        unique=True,
        nullable=True,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(
        CHAR(3),
        nullable=False,
        default="INR",
        server_default="INR",
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relationships
    booking: Mapped["Booking"] = relationship("Booking", back_populates="payments")
