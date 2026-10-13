import os
import pytest

# Must be set BEFORE importing app.config / app.database
# os.environ["DATABASE_URL"] = "postgresql+psycopg://postgres:2306@localhost:5432/ecommerce_test"
# os.environ["SECRET_KEY"] = "supersecretkey"

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://postgres:2306@localhost:5432/ecommerce_test",
)
os.environ.setdefault("SECRET_KEY", "test-secret-key")

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app import models  # noqa: F401  — register models on Base
from app.main import app
from app.core.security import hash_password
from app.models.user import User


TEST_DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def reset_db():
    """Drop and recreate all tables before every test."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def db():
    """A DB session for tests that need to write directly."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    """TestClient with get_db overridden to use the test session."""
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
    """Create and return an admin user (also commits it)."""
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
    """Create and return a normal customer."""
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
    """Log in as admin and return the bearer token."""
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