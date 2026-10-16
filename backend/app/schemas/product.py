from pydantic import BaseModel, Field
from decimal import Decimal
from typing import Optional, List
from datetime import datetime

class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    price: Decimal = Field(gt=0)
    stock: int = Field(ge=0, default=0)
    category_id: int
    is_unlimited_stock: bool = False

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    price: Optional[Decimal] = Field(default=None, gt=0)
    stock: Optional[int] = Field(default=None, ge=0)
    is_active: Optional[bool] = None
    is_unlimited_stock: Optional[bool] = None
    category_id: Optional[int] = None

class ProductOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    price: Decimal
    stock: int
    is_active: bool
    is_unlimited_stock: bool
    category_id: int
    created_at: datetime

    model_config = {"from_attributes": True}

class PaginatedProducts(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[ProductOut]