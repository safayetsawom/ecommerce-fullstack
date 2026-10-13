from pydantic import BaseModel, Field, EmailStr, field_validator
from decimal import Decimal
from typing import List, Optional
from datetime import datetime

VALID_STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"]
PHONE_REGEX = r"^\+?[0-9]{7,15}$"

class OrderCreate(BaseModel):
    shipping_address: str = Field(min_length=5, max_length=500)

class GuestOrderCreate(BaseModel):
    guest_token: str = Field(min_length=8, max_length=64)
    guest_email: EmailStr
    guest_phone: str
    shipping_address: str = Field(min_length=5, max_length=500)

    @field_validator("guest_phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        import re
        digits_only = re.sub(r"[\s\-()]", "", v)
        if not re.match(PHONE_REGEX, digits_only):
            raise ValueError("Invalid phone number")
        return digits_only

class OrderItemOut(BaseModel):
    id: int
    product_id: Optional[int]
    product_name: str
    unit_price: Decimal
    quantity: int
    subtotal: Decimal

    model_config = {"from_attributes": True}

class OrderOut(BaseModel):
    id: int
    user_id: Optional[int]
    guest_email: Optional[str]
    guest_phone: Optional[str]
    status: str
    total_price: Decimal
    shipping_address: str
    created_at: datetime
    items: List[OrderItemOut]

    model_config = {"from_attributes": True}

class OrderStatusUpdate(BaseModel):
    status: str

class PaginatedOrders(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[OrderOut]