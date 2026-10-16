from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from typing import Optional
from itertools import product as cartesian_product

from app.database import get_db
from app.models.product import Product
from app.models.category import Category
from app.models.user import User
from app.models.product_option import ProductOption, ProductOptionValue
from app.models.product_variant import ProductVariant, ProductVariantOptionValue
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductOut, PaginatedProducts,
    ProductOptionIn,
)
from app.routers.auth import get_current_admin

router = APIRouter(prefix="/products", tags=["products"])


# ---------- helpers ----------

def _variant_options_text(variant: ProductVariant) -> str:
    """
    Build a human-readable label for a variant — e.g. "M / Black" or "S / 32 / Black".
    Reads through the join table to the option values, ordered by the parent option's position.
    """
    pairs = []
    for link in variant.option_values:
        ov = link.option_value
        opt = ov.option
        pairs.append((opt.position, opt.name, ov.value))
    pairs.sort(key=lambda x: x[0])
    return " / ".join(v for _, _, v in pairs) if pairs else "Default"


def _serialize_variant(variant: ProductVariant) -> dict:
    return {
        "id": variant.id,
        "stock": variant.stock,
        "is_active": variant.is_active,
        "options_text": _variant_options_text(variant),
    }


def _serialize_product(product: Product) -> dict:
    return {
        "id": product.id,
        "name": product.name,
        "description": product.description,
        "price": product.price,
        "is_active": product.is_active,
        "is_unlimited_stock": product.is_unlimited_stock,
        "image_url": product.image_url,
        "category_id": product.category_id,
        "created_at": product.created_at,
        "options": product.options,
        "variants": [_serialize_variant(v) for v in product.variants],
    }


def _apply_options(product: Product, options_in: list[ProductOptionIn]) -> None:
    """
    Replace all options on a product with the given definitions, then regenerate variants.

    Rules:
      - Existing options are wiped (cascade removes their values).
      - New options + values are inserted.
      - The cartesian product of all option values becomes the set of variants.
      - Existing variants that match a generated combination keep their stock.
      - A product with NO options gets exactly one default variant.
    """
    # Snapshot existing stock keyed by the set of option-value strings,
    # so we can preserve it across the regeneration.
    existing_stock: dict[tuple[str, ...], int] = {}
    for v in product.variants:
        key = tuple(sorted(link.option_value.value for link in v.option_values))
        existing_stock[key] = v.stock

    # Wipe old options (cascades to values, and to variant-option-value links)
    for old in list(product.options):
        product.options.remove(old)

    # Wipe old variants too — they'll be regenerated
    for old in list(product.variants):
        product.variants.remove(old)

    # We need ids for options before creating variants — flush after inserting
    new_options = []
    for opt_in in options_in:
        opt = ProductOption(name=opt_in.name, position=opt_in.position)
        for val_in in opt_in.values:
            opt.values.append(ProductOptionValue(value=val_in.value, position=val_in.position))
        product.options.append(opt)
        new_options.append(opt)

    # No options → create one default variant
    if not new_options:
        product.variants.append(ProductVariant(stock=existing_stock.get((), 0), is_active=True))
        return

    # Cartesian product of every option's values
    value_lists = [list(opt.values) for opt in new_options]
    for combo in cartesian_product(*value_lists):
        key = tuple(sorted(v.value for v in combo))
        stock = existing_stock.get(key, 0)
        variant = ProductVariant(stock=stock, is_active=True)
        for ov in combo:
            variant.option_values.append(ProductVariantOptionValue(option_value=ov))
        product.variants.append(variant)


# ---------- endpoints ----------

@router.post("/", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    category = db.query(Category).filter(Category.id == product_in.category_id).first()
    if not category:
        raise HTTPException(status_code=400, detail="Category does not exist")

    data = product_in.model_dump(exclude={"options"})
    product = Product(**data)
    db.add(product)

    _apply_options(product, product_in.options)

    db.commit()
    db.refresh(product)
    return _serialize_product(product)


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
    query = (
        db.query(Product)
        .options(
            joinedload(Product.options).joinedload(ProductOption.values),
            joinedload(Product.variants).joinedload(ProductVariant.option_values)
                .joinedload(ProductVariantOptionValue.option_value)
                .joinedload(ProductOptionValue.option),
        )
        .filter(Product.is_active == True)
    )

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

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [_serialize_product(p) for p in items],
    }


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = (
        db.query(Product)
        .options(
            joinedload(Product.options).joinedload(ProductOption.values),
            joinedload(Product.variants).joinedload(ProductVariant.option_values)
                .joinedload(ProductVariantOptionValue.option_value)
                .joinedload(ProductOptionValue.option),
        )
        .filter(Product.id == product_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return _serialize_product(product)


@router.patch("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    product_in: ProductUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    product = (
        db.query(Product)
        .options(
            joinedload(Product.options).joinedload(ProductOption.values),
            joinedload(Product.variants).joinedload(ProductVariant.option_values)
                .joinedload(ProductVariantOptionValue.option_value),
        )
        .filter(Product.id == product_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    updates = product_in.model_dump(exclude_unset=True)

    if "category_id" in updates:
        category = db.query(Category).filter(Category.id == updates["category_id"]).first()
        if not category:
            raise HTTPException(status_code=400, detail="Category does not exist")

    # Options are handled separately — they trigger variant regeneration
    options_update = updates.pop("options", None)

    for field, value in updates.items():
        setattr(product, field, value)

    if options_update is not None:
        # Convert plain dicts back to pydantic models
        parsed = [ProductOptionIn(**o) for o in options_update]
        _apply_options(product, parsed)

    db.commit()
    db.refresh(product)
    return _serialize_product(product)


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