"""Request/response shapes. Pydantic validates every incoming request
automatically, and FastAPI returns a clear 422 error if something is wrong."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserCreate(BaseModel):
    nickname: str = Field(min_length=2, max_length=40, examples=["Arif"])

    @field_validator("nickname")
    @classmethod
    def strip(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Nickname must have at least 2 characters")
        return v


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nickname: str
    role: str
    trust_score: int


class AreaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    name_bn: str


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    name_bn: str
    category: str
    unit: str


class OfficialPriceOut(BaseModel):
    product_id: int
    product_name: str
    unit: str
    min_price: float
    max_price: float
    source: str
    recorded_on: datetime


class PriceSubmit(BaseModel):
    user_id: int = Field(gt=0, examples=[1])
    product_id: int = Field(gt=0, examples=[1])
    area_id: int = Field(gt=0, examples=[1])
    price: float = Field(gt=0, le=10000, description="Price in Taka per product unit", examples=[58])
    vendor_location: str | None = Field(default=None, max_length=80, examples=["Mirpur 1 kacha bazar"])

    @field_validator("price")
    @classmethod
    def round_price(cls, v: float) -> float:
        return round(v, 2)

    @field_validator("vendor_location")
    @classmethod
    def blank_to_none(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        return v or None


class SubmissionOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    product_name_bn: str
    unit: str
    area_id: int
    area_name: str
    vendor_location: str | None
    price: float
    status: str
    reason: str
    reporter: str
    created_at: datetime


class SubmitResult(BaseModel):
    submission: SubmissionOut
    z_score: float | None
    trust_score: int


class AreaRange(BaseModel):
    area_id: int
    area_name: str
    area_name_bn: str
    min_price: float
    max_price: float
    median_price: float
    reports: int
    last_reported: datetime
    vs_official_pct: float | None = Field(description="Median vs official midpoint, in %")


class PriceFeed(BaseModel):
    product: ProductOut
    official: OfficialPriceOut | None
    days: int
    cheapest_area_id: int | None
    areas: list[AreaRange]


class TrendPoint(BaseModel):
    date: str
    median_price: float | None
    reports: int


class OverviewRow(BaseModel):
    product: ProductOut
    official_min: float | None
    official_max: float | None
    community_median: float | None
    vs_official_pct: float | None
    cheapest_area: str | None
    reports: int


class ErrorOut(BaseModel):
    detail: str
