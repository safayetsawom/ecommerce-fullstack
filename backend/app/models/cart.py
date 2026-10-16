from sqlalchemy import Column, Integer, ForeignKey, DateTime, String, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class CartItem(Base):
    __tablename__ = "cart_items"
    __table_args__ = (
        UniqueConstraint("user_id", "variant_id", name="uq_user_variant_cart"),
        UniqueConstraint("guest_token", "variant_id", name="uq_guest_variant_cart"),
        CheckConstraint(
            "(user_id IS NOT NULL AND guest_token IS NULL) OR "
            "(user_id IS NULL AND guest_token IS NOT NULL)",
            name="ck_cartitem_owner",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    guest_token = Column(String(64), nullable=True, index=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False, default=1)
    added_at = Column(DateTime(timezone=True), server_default=func.now())

    variant = relationship("ProductVariant")