from fastapi import APIRouter, Depends, HTTPException, status, Query, Header
from sqlalchemy.orm import Session, joinedload
from decimal import Decimal
from typing import Optional
import uuid

from app.database import get_db
from app.models.order import Order, OrderItem
from app.models.cart import CartItem
from app.models.product import Product
from app.models.user import User
from app.schemas.order import (
    OrderCreate, GuestOrderCreate, OrderOut, OrderStatusUpdate,
    PaginatedOrders, VALID_STATUSES,
)
from app.routers.auth import get_current_user, get_current_admin

router = APIRouter(prefix="/orders", tags=["orders"])

GUEST_HEADER = "X-Guest-Token"

def _serialize_order(order: Order) -> dict:
    items = []
    for item in order.items:
        items.append({
            "id": item.id,
            "product_id": item.product_id,
            "product_name": item.product_name,
            "unit_price": item.unit_price,
            "quantity": item.quantity,
            "subtotal": item.unit_price * item.quantity,
        })
    return {
        "id": order.id,
        "user_id": order.user_id,
        "guest_email": order.guest_email,
        "shipping_phone": order.shipping_phone,
        "status": order.status,
        "total_price": order.total_price,
        "shipping_address": order.shipping_address,
        "created_at": order.created_at,
        "items": items,
    }
def _has_enough_stock(product: Product, qty: int) -> bool:
    if product.is_unlimited_stock:
        return True
    return product.stock >= qty


def _checkout(
    db: Session,
    *,
    cart_items,
    user_id: Optional[int],
    guest_token: Optional[str],
    guest_email: Optional[str],
    shipping_phone: str,
    shipping_address: str,
) -> Order:
    for item in cart_items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product or not product.is_active:
            raise HTTPException(status_code=400, detail=f"Product {item.product_id} unavailable")
        if not _has_enough_stock(product, item.quantity):
            raise HTTPException(
                status_code=400,
                detail=f"Only {product.stock} of '{product.name}' in stock",
            )

    order = Order(
        user_id=user_id,
        guest_token=guest_token,
        guest_email=guest_email,
        shipping_phone=shipping_phone,
        status="pending",
        total_price=Decimal("0"),
        shipping_address=shipping_address,
    )
    db.add(order)
    db.flush()

    total = Decimal("0")
    for item in cart_items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        subtotal = product.price * item.quantity
        total += subtotal
        db.add(OrderItem(
            order_id=order.id,
            product_id=product.id,
            product_name=product.name,
            unit_price=product.price,
            quantity=item.quantity,
        ))
        if not product.is_unlimited_stock:
            product.stock -= item.quantity

    order.total_price = total

    if user_id is not None:
        db.query(CartItem).filter(CartItem.user_id == user_id).delete(synchronize_session=False)
    else:
        db.query(CartItem).filter(CartItem.guest_token == guest_token).delete(synchronize_session=False)

    db.commit()
    db.refresh(order)
    return order
@router.post("/", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    cart_items = db.query(CartItem).filter(CartItem.user_id == user.id).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    order = _checkout(
        db,
        cart_items=cart_items,
        user_id=user.id,
        guest_token=None,
        guest_email=None,
        shipping_phone=payload.shipping_phone,
        shipping_address=payload.shipping_address,
    )
    return _serialize_order(order)


@router.post("/guest", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_guest_order(
    payload: GuestOrderCreate,
    db: Session = Depends(get_db),
):
    cart_items = db.query(CartItem).filter(CartItem.guest_token == payload.guest_token).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="Guest cart is empty or token invalid")

    order = _checkout(
        db,
        cart_items=cart_items,
        user_id=None,
        guest_token=payload.guest_token,
        guest_email=payload.guest_email,
        shipping_phone=payload.shipping_phone,
        shipping_address=payload.shipping_address,
    )
    return _serialize_order(order)

@router.get("/guest/{guest_token}", response_model=OrderOut)
def get_guest_order(guest_token: str, db: Session = Depends(get_db)):
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.guest_token == guest_token)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return _serialize_order(order)


@router.get("/me", response_model=list[OrderOut])
def list_my_orders(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    orders = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.user_id == user.id)
        .order_by(Order.id.desc())
        .all()
    )
    return [_serialize_order(o) for o in orders]


@router.get("/", response_model=PaginatedOrders)
def list_all_orders(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
):
    query = db.query(Order).options(joinedload(Order.items))
    if status_filter:
        query = query.filter(Order.status == status_filter)

    total = query.count()
    orders = (
        query.order_by(Order.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [_serialize_order(o) for o in orders],
    }


@router.get("/{order_id}", response_model=OrderOut)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.user_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")

    return _serialize_order(order)


@router.patch("/{order_id}/status", response_model=OrderOut)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    if payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Allowed: {VALID_STATUSES}")

    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = payload.status
    db.commit()
    db.refresh(order)
    return _serialize_order(order)