from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class ProductOption(Base):
    __tablename__ = "product_options"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String, nullable=False)
    position = Column(Integer, nullable=False, default=0)

    values = relationship(
        "ProductOptionValue",
        back_populates="option",
        cascade="all, delete-orphan",
        order_by="ProductOptionValue.position",
    )


class ProductOptionValue(Base):
    __tablename__ = "product_option_values"

    id = Column(Integer, primary_key=True, index=True)
    option_id = Column(
        Integer,
        ForeignKey("product_options.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    value = Column(String, nullable=False)
    position = Column(Integer, nullable=False, default=0)

    option = relationship("ProductOption", back_populates="values")