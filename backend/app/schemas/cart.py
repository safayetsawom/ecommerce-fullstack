from pydantic import BaseModel, Field
from decimal import Decimal
from typing import List, Optional
from datetime import datetime


class CartItemAdd(BaseModel):
    variant_id: int
    quantity: int = Field(ge=1, default=1)


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=1)


class CartItemOut(BaseModel):
    id: int
    variant_id: int
    product_id: int
    product_name: str
    product_image_url: Optional[str] = None
    options_text: Optional[str] = None
    unit_price: Decimal
    quantity: int
    subtotal: Decimal
    added_at: datetime


class CartOut(BaseModel):
    items: List[CartItemOut]
    total_items: int
    total_price: Decimal


class GuestCartCreate(BaseModel):
    guest_token: str