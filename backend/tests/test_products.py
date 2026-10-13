import pytest


@pytest.fixture
def category(db):
    from app.models.category import Category
    c = Category(name="Test Cat", slug="test-cat")
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def test_admin_can_create_product(client, admin_headers, category):
    res = client.post("/products/", headers=admin_headers, json={
        "name": "Widget",
        "description": "A widget",
        "price": "9.99",
        "stock": 10,
        "category_id": category.id,
        "is_unlimited_stock": False,
    })
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Widget"
    assert float(data["price"]) == 9.99


def test_customer_cannot_create_product(client, customer_headers, category):
    res = client.post("/products/", headers=customer_headers, json={
        "name": "Widget",
        "price": "9.99",
        "stock": 10,
        "category_id": category.id,
    })
    assert res.status_code == 403


def test_anonymous_cannot_create_product(client, category):
    res = client.post("/products/", json={
        "name": "Widget",
        "price": "9.99",
        "stock": 10,
        "category_id": category.id,
    })
    assert res.status_code == 401


def test_list_products_is_public(client, admin_headers, category):
    client.post("/products/", headers=admin_headers, json={
        "name": "Public Item", "price": "5.00", "stock": 3, "category_id": category.id,
    })
    res = client.get("/products/")
    assert res.status_code == 200
    body = res.json()
    assert body["total"] >= 1
    assert any(p["name"] == "Public Item" for p in body["items"])


def test_search_filter(client, admin_headers, category):
    for name in ["Apple", "Banana", "Cherry"]:
        client.post("/products/", headers=admin_headers, json={
            "name": name, "price": "1.00", "stock": 5, "category_id": category.id,
        })
    res = client.get("/products/?q=an")
    assert res.status_code == 200
    names = [p["name"] for p in res.json()["items"]]
    assert "Banana" in names
    assert "Apple" not in names


def test_invalid_price_rejected(client, admin_headers, category):
    res = client.post("/products/", headers=admin_headers, json={
        "name": "Bad", "price": "-5", "stock": 1, "category_id": category.id,
    })
    assert res.status_code == 422