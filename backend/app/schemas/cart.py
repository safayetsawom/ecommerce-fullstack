from pydantic import BaseModel, Field
from decimal import Decimal
from typing import List
from datetime import datetime

class CartItemAdd(BaseModel):
    product_id: int
    quantity: int = Field(ge=1, default=1)

class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=1)

class CartItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    unit_price: Decimal
    quantity: int
    subtotal: Decimal
    added_at: datetime

class CartOut(BaseModel):
    items: List[CartItemOut]
    total_items: int
    total_price: Decimal

class GuestCartCreate(BaseModel):
    """Returned to the client the first time they act as a guest."""
    guest_token: str