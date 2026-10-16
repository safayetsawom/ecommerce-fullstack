from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime, Text, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint(
            "(user_id IS NOT NULL AND guest_token IS NULL) OR "
            "(user_id IS NULL AND guest_token IS NOT NULL)",
            name="ck_order_owner",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    guest_token = Column(String(64), nullable=True, index=True, unique=True)
    guest_email = Column(String, nullable=True)

    shipping_phone = Column(String, nullable=False)          # ← was guest_phone, now required

    status = Column(String, nullable=False, default="pending", index=True)
    total_price = Column(Numeric(10, 2), nullable=False)
    shipping_address = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    product_name = Column(String, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    quantity = Column(Integer, nullable=False)

    order = relationship("Order", back_populates="items")