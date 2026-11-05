"""
Database tables.
"""
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    nickname: Mapped[str] = mapped_column(String(40))
    role: Mapped[str] = mapped_column(String(20), default="consumer")  # consumer | vendor | admin
    trust_score: Mapped[int] = mapped_column(Integer, default=50)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Area(Base):
    __tablename__ = "areas"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(60), unique=True)
    name_bn: Mapped[str] = mapped_column(String(60))


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(60), unique=True)
    name_bn: Mapped[str] = mapped_column(String(60))
    category: Mapped[str] = mapped_column(String(30))
    unit: Mapped[str] = mapped_column(String(20))  # kg, litre, dozen

    official_prices: Mapped[list["OfficialPrice"]] = relationship(back_populates="product")


class OfficialPrice(Base):
    """Government reference range (TCB daily Dhaka market price)."""

    __tablename__ = "official_prices"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    min_price: Mapped[float] = mapped_column(Float)
    max_price: Mapped[float] = mapped_column(Float)
    source: Mapped[str] = mapped_column(String(80), default="TCB (sample data)")
    recorded_on: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    product: Mapped[Product] = relationship(back_populates="official_prices")


class PriceSubmission(Base):
    __tablename__ = "price_submissions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    area_id: Mapped[int] = mapped_column(ForeignKey("areas.id"), index=True)
    vendor_location: Mapped[str | None] = mapped_column(String(80), nullable=True)
    price: Mapped[float] = mapped_column(Float)
    # accepted | flagged | rejected  (set by the outlier filter)
    status: Mapped[str] = mapped_column(String(12), index=True)
    reason: Mapped[str] = mapped_column(String(200), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)

    user: Mapped[User] = relationship()
    product: Mapped[Product] = relationship()
    area: Mapped[Area] = relationship()
