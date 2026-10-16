from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from decimal import Decimal
import uuid
from typing import Optional

from app.database import get_db
from app.models.cart import CartItem
from app.models.product import Product
from app.models.user import User
from app.schemas.cart import CartItemAdd, CartItemUpdate, CartOut, GuestCartCreate
from app.routers.auth import get_current_user

router = APIRouter(prefix="/cart", tags=["cart"])

GUEST_HEADER = "X-Guest-Token"


def has_enough_stock(product: Product, requested_qty: int) -> bool:
    if product.is_unlimited_stock:
        return True
    return product.stock >= requested_qty


def _get_owner(
    db: Session,
    token: Optional[str],
    guest_token: Optional[str],
) -> dict:
    """
    Returns {'user_id': X, 'guest_token': None} for authed users,
    or {'user_id': None, 'guest_token': Y} for guests.
    Raises 401 if neither is present.
    """
    if token:
        # Resolve user from token
        from app.core.security import decode_access_token
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


def _build_cart(db: Session, owner: dict) -> dict:
    q = db.query(CartItem)
    q = _owner_filter(q, owner)
    items = q.order_by(CartItem.id).all()

    out_items = []
    total_price = Decimal("0")
    total_items = 0

    for item in items:
        subtotal = item.product.price * item.quantity
        total_price += subtotal
        total_items += item.quantity
        out_items.append({
            "id": item.id,
            "product_id": item.product_id,
            "product_name": item.product.name,
            "unit_price": item.product.price,
            "quantity": item.quantity,
            "subtotal": subtotal,
            "added_at": item.added_at,
        })

    return {"items": out_items, "total_items": total_items, "total_price": total_price}


@router.post("/guest", response_model=GuestCartCreate, status_code=status.HTTP_201_CREATED)
def create_guest_cart():
    """Generate a fresh guest token. Client stores it and sends it as X-Guest-Token."""
    return {"guest_token": uuid.uuid4().hex}


@router.get("/", response_model=CartOut)
def get_cart(
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
    x_guest_token: Optional[str] = Header(None, alias=GUEST_HEADER),
):
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]
    owner = _get_owner(db, token, x_guest_token)
    return _build_cart(db, owner)


@router.post("/items", response_model=CartOut, status_code=status.HTTP_201_CREATED)
def add_to_cart(
    payload: CartItemAdd,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
    x_guest_token: Optional[str] = Header(None, alias=GUEST_HEADER),
):
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]
    owner = _get_owner(db, token, x_guest_token)

    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not available")

    existing_q = db.query(CartItem)
    existing_q = _owner_filter(existing_q, owner).filter(CartItem.product_id == product.id)
    existing = existing_q.first()

    new_qty = payload.quantity + (existing.quantity if existing else 0)
    if not has_enough_stock(product, new_qty):
        raise HTTPException(status_code=400, detail=f"Only {product.stock} in stock")

    if existing:
        existing.quantity = new_qty
    else:
        db.add(CartItem(
            user_id=owner["user_id"],
            guest_token=owner["guest_token"],
            product_id=product.id,
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
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]
    owner = _get_owner(db, token, x_guest_token)

    q = db.query(CartItem)
    q = _owner_filter(q, owner).filter(CartItem.id == item_id)
    item = q.first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    if not has_enough_stock(item.product, payload.quantity):
        raise HTTPException(status_code=400, detail=f"Only {item.product.stock} in stock")

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
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]
    owner = _get_owner(db, token, x_guest_token)

    q = db.query(CartItem)
    q = _owner_filter(q, owner).filter(CartItem.id == item_id)
    item = q.first()
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
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]
    owner = _get_owner(db, token, x_guest_token)

    q = db.query(CartItem)
    q = _owner_filter(q, owner)
    q.delete(synchronize_session=False)
    db.commit()
    return None