from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session, joinedload
from decimal import Decimal
import uuid
from typing import Optional

from app.database import get_db
from app.models.cart import CartItem
from app.models.product import Product
from app.models.product_variant import ProductVariant, ProductVariantOptionValue
from app.models.product_option import ProductOptionValue, ProductOption
from app.models.user import User
from app.schemas.cart import CartItemAdd, CartItemUpdate, CartOut, GuestCartCreate
from app.core.security import decode_access_token

router = APIRouter(prefix="/cart", tags=["cart"])

GUEST_HEADER = "X-Guest-Token"


def has_enough_stock(product: Product, variant: ProductVariant, requested_qty: int) -> bool:
    if product.is_unlimited_stock:
        return True
    return variant.stock >= requested_qty


def _get_owner(db: Session, token: Optional[str], guest_token: Optional[str]) -> dict:
    if token:
        payload = decode_access_token(token)
        if payload is None:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        email = payload.get("sub")
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return {"user_id": user.id, "guest_token": None, "user": user}
    if guest_token:
        return {"user_id": None, "guest_token": guest_token, "user": None}
    raise HTTPException(status_code=401, detail="Authentication or guest token required")


def _owner_filter(query, owner: dict):
    if owner["user_id"] is not None:
        return query.filter(CartItem.user_id == owner["user_id"])
    return query.filter(CartItem.guest_token == owner["guest_token"])


def _extract_token(authorization: Optional[str]) -> Optional[str]:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization.split(" ", 1)[1]
    return None


def _variant_options_text(variant: ProductVariant) -> str:
    """Build a human-readable label like 'M / Black' from a variant's option values."""
    pairs = []
    for link in variant.option_values:
        ov = link.option_value
        opt = ov.option
        pairs.append((opt.position, ov.value))
    pairs.sort(key=lambda x: x[0])
    return " / ".join(v for _, v in pairs) if pairs else "Default"


def _build_cart(db: Session, owner: dict) -> dict:
    q = db.query(CartItem).options(
        joinedload(CartItem.variant)
            .joinedload(ProductVariant.product),
        joinedload(CartItem.variant)
            .joinedload(ProductVariant.option_values)
            .joinedload(ProductVariantOptionValue.option_value)
            .joinedload(ProductOptionValue.option),
    )
    q = _owner_filter(q, owner)
    items = q.order_by(CartItem.id).all()

    out_items = []
    total_price = Decimal("0")
    total_items = 0

    for item in items:
        variant = item.variant
        product = variant.product
        subtotal = product.price * item.quantity
        total_price += subtotal
        total_items += item.quantity
        out_items.append({
            "id": item.id,
            "variant_id": variant.id,
            "product_id": product.id,
            "product_name": product.name,
            "product_image_url": product.image_url,
            "options_text": _variant_options_text(variant),
            "unit_price": product.price,
            "quantity": item.quantity,
            "subtotal": subtotal,
            "added_at": item.added_at,
        })

    return {"items": out_items, "total_items": total_items, "total_price": total_price}


@router.post("/guest", response_model=GuestCartCreate, status_code=status.HTTP_201_CREATED)
def create_guest_cart():
    return {"guest_token": uuid.uuid4().hex}


@router.get("/", response_model=CartOut)
def get_cart(
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
    x_guest_token: Optional[str] = Header(None, alias=GUEST_HEADER),
):
    owner = _get_owner(db, _extract_token(authorization), x_guest_token)
    return _build_cart(db, owner)


@router.post("/items", response_model=CartOut, status_code=status.HTTP_201_CREATED)
def add_to_cart(
    payload: CartItemAdd,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
    x_guest_token: Optional[str] = Header(None, alias=GUEST_HEADER),
):
    owner = _get_owner(db, _extract_token(authorization), x_guest_token)

    variant = (
        db.query(ProductVariant)
        .options(joinedload(ProductVariant.product))
        .filter(ProductVariant.id == payload.variant_id)
        .first()
    )
    if not variant or not variant.product.is_active or not variant.is_active:
        raise HTTPException(status_code=404, detail="Variant not available")

    existing = _owner_filter(
        db.query(CartItem), owner
    ).filter(CartItem.variant_id == variant.id).first()

    new_qty = payload.quantity + (existing.quantity if existing else 0)
    if not has_enough_stock(variant.product, variant, new_qty):
        raise HTTPException(status_code=400, detail=f"Only {variant.stock} in stock")

    if existing:
        existing.quantity = new_qty
    else:
        db.add(CartItem(
            user_id=owner["user_id"],
            guest_token=owner["guest_token"],
            variant_id=variant.id,
            quantity=payload.quantity,
        ))
    db.commit()
    return _build_cart(db, owner)


@router.patch("/items/{item_id}", response_model=CartOut)
def update_cart_item(
    item_id: int,
    payload: CartItemUpdate,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
    x_guest_token: Optional[str] = Header(None, alias=GUEST_HEADER),
):
    owner = _get_owner(db, _extract_token(authorization), x_guest_token)

    item = (
        _owner_filter(db.query(CartItem), owner)
        .options(
            joinedload(CartItem.variant).joinedload(ProductVariant.product)
        )
        .filter(CartItem.id == item_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    if not has_enough_stock(item.variant.product, item.variant, payload.quantity):
        raise HTTPException(status_code=400, detail=f"Only {item.variant.stock} in stock")

    item.quantity = payload.quantity
    db.commit()
    return _build_cart(db, owner)


@router.delete("/items/{item_id}", response_model=CartOut)
def remove_cart_item(
    item_id: int,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
    x_guest_token: Optional[str] = Header(None, alias=GUEST_HEADER),
):
    owner = _get_owner(db, _extract_token(authorization), x_guest_token)

    item = _owner_filter(db.query(CartItem), owner).filter(CartItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    db.delete(item)
    db.commit()
    return _build_cart(db, owner)


@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
def clear_cart(
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
    x_guest_token: Optional[str] = Header(None, alias=GUEST_HEADER),
):
    owner = _get_owner(db, _extract_token(authorization), x_guest_token)
    _owner_filter(db.query(CartItem), owner).delete(synchronize_session=False)
    db.commit()
    return None