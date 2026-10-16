from sqlalchemy import Column, Integer, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    stock = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)

    product = relationship("Product", back_populates="variants")
    option_values = relationship(
        "ProductVariantOptionValue",
        back_populates="variant",
        cascade="all, delete-orphan",
    )


class ProductVariantOptionValue(Base):
    __tablename__ = "product_variant_option_values"
    __table_args__ = (
        UniqueConstraint("variant_id", "option_value_id", name="uq_variant_option_value"),
    )

    id = Column(Integer, primary_key=True, index=True)
    variant_id = Column(
        Integer,
        ForeignKey("product_variants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    option_value_id = Column(
        Integer,
        ForeignKey("product_option_values.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    variant = relationship("ProductVariant", back_populates="option_values")
    option_value = relationship("ProductOptionValue")