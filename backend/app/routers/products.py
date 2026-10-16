from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional

from app.database import get_db
from app.models.product import Product
from app.models.category import Category
from app.models.user import User
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut, PaginatedProducts
from app.routers.auth import get_current_admin

router = APIRouter(prefix="/products", tags=["products"])


@router.post("/", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    category = db.query(Category).filter(Category.id == product_in.category_id).first()
    if not category:
        raise HTTPException(status_code=400, detail="Category does not exist")

    product = Product(**product_in.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/", response_model=PaginatedProducts)
def list_products(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None, description="Search by name (partial, case-insensitive)"),
    category_id: Optional[int] = Query(None),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
):
    query = db.query(Product).filter(Product.is_active == True)

    if q:
        query = query.filter(Product.name.ilike(f"%{q}%"))
    if category_id is not None:
        query = query.filter(Product.category_id == category_id)
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)

    total = query.count()
    items = (
        query.order_by(Product.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {"total": total, "page": page, "page_size": page_size, "items": items}


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.patch("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    product_in: ProductUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    updates = product_in.model_dump(exclude_unset=True)

    if "category_id" in updates:
        category = db.query(Category).filter(Category.id == updates["category_id"]).first()
        if not category:
            raise HTTPException(status_code=400, detail="Category does not exist")

    for field, value in updates.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    try:
        db.delete(product)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Cannot delete this product — it appears in existing orders. Use 'Hide' to deactivate it instead.",
        )
    return None