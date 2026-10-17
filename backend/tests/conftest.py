import os
import pytest

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://postgres:2306@localhost:5432/ecommerce_test",
)
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("CLOUDINARY_CLOUD_NAME", "test-cloud")
os.environ.setdefault("CLOUDINARY_API_KEY", "test-key")
os.environ.setdefault("CLOUDINARY_API_SECRET", "test-secret")

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app import models  # noqa: F401
from app.main import app
from app.core.security import hash_password
from app.models.user import User


TEST_DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def admin_user(db):
    user = User(
        email="admin@test.com",
        hashed_password=hash_password("adminpass"),
        full_name="Admin",
        role="admin",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def customer_user(db):
    user = User(
        email="customer@test.com",
        hashed_password=hash_password("customerpass"),
        full_name="Customer",
        role="customer",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def admin_token(client, admin_user):
    res = client.post("/auth/login", data={
        "username": admin_user.email,
        "password": "adminpass",
    })
    return res.json()["access_token"]


@pytest.fixture
def customer_token(client, customer_user):
    res = client.post("/auth/login", data={
        "username": customer_user.email,
        "password": "customerpass",
    })
    return res.json()["access_token"]


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def customer_headers(customer_token):
    return {"Authorization": f"Bearer {customer_token}"}


# ---------- shared product + variant fixtures ----------

@pytest.fixture
def category(db):
    from app.models.category import Category
    c = Category(name="Test Cat", slug="test-cat")
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@pytest.fixture
def product(db, category):
    """
    A product with no options and one default variant carrying stock=5.
    """
    from app.models.product import Product
    from app.models.product_variant import ProductVariant

    p = Product(name="Thing", price="10.00", category_id=category.id)
    db.add(p)
    db.flush()

    v = ProductVariant(product_id=p.id, stock=5, is_active=True)
    db.add(v)
    db.commit()
    db.refresh(p)
    db.refresh(v)
    return p


@pytest.fixture
def variant(db, product):
    from app.models.product_variant import ProductVariant
    return db.query(ProductVariant).filter(ProductVariant.product_id == product.id).first()