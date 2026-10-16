from pydantic import BaseModel, Field
from decimal import Decimal
from typing import Optional, List
from datetime import datetime


# ---------- Options ----------

class ProductOptionValueIn(BaseModel):
    value: str = Field(min_length=1, max_length=50)
    position: int = 0


class ProductOptionValueOut(BaseModel):
    id: int
    value: str
    position: int

    model_config = {"from_attributes": True}


class ProductOptionIn(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    position: int = 0
    values: List[ProductOptionValueIn]


class ProductOptionOut(BaseModel):
    id: int
    name: str
    position: int
    values: List[ProductOptionValueOut]

    model_config = {"from_attributes": True}


# ---------- Variants ----------

class ProductVariantOut(BaseModel):
    id: int
    stock: int
    is_active: bool
    options_text: Optional[str] = None

    model_config = {"from_attributes": True}


# ---------- Product: create ----------

class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    price: Decimal = Field(gt=0)
    category_id: int
    is_unlimited_stock: bool = False
    image_url: Optional[str] = Field(default=None, max_length=500)
    options: List[ProductOptionIn] = []


# ---------- Product: update ----------

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    price: Optional[Decimal] = Field(default=None, gt=0)
    is_active: Optional[bool] = None
    is_unlimited_stock: Optional[bool] = None
    category_id: Optional[int] = None
    image_url: Optional[str] = Field(default=None, max_length=500)
    options: Optional[List[ProductOptionIn]] = None


# ---------- Product: read ----------

class ProductOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    price: Decimal
    is_active: bool
    is_unlimited_stock: bool
    image_url: Optional[str]
    category_id: int
    created_at: datetime
    options: List[ProductOptionOut] = []
    variants: List[ProductVariantOut] = []

    model_config = {"from_attributes": True}


class PaginatedProducts(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[ProductOut]