import pytest

from tests.conftest import admin_headers, client, customer_headers


@pytest.fixture
def product(db):
    from app.models.category import Category
    from app.models.product import Product
    c = Category(name="Cat", slug="cat")
    db.add(c)
    db.commit()
    db.refresh(c)
    p = Product(name="Orderable", price="25.00", stock=10, category_id=c.id)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def test_checkout_decrements_stock(client, customer_headers, product, db):
    client.post("/cart/items", headers=customer_headers, json={"product_id": product.id, "quantity": 3})
    res = client.post("/orders/", headers=customer_headers, json={"shipping_address": "123 Main St"})
    assert res.status_code == 201
    order = res.json()
    assert order["status"] == "pending"
    assert float(order["total_price"]) == 75.0

    # Cart is now empty
    assert client.get("/cart/", headers=customer_headers).json()["items"] == []

    # Stock went down by 3
    db.refresh(product)
    assert product.stock == 7


def test_empty_cart_rejected(client, customer_headers):
    res = client.post("/orders/", headers=customer_headers, json={"shipping_address": "123 Main St"})
    assert res.status_code == 400


def test_order_history(client, customer_headers, product):
    client.post("/cart/items", headers=customer_headers, json={"product_id": product.id, "quantity": 1})
    client.post("/orders/", headers=customer_headers, json={"shipping_address": "Somewhere"})

    res = client.get("/orders/me", headers=customer_headers)
    assert res.status_code == 200
    assert len(res.json()) == 1


def test_admin_can_update_status(client, customer_headers, admin_headers, product):
    client.post("/cart/items", headers=customer_headers, json={"product_id": product.id, "quantity": 1})
    order_id = client.post("/orders/", headers=customer_headers, json={"shipping_address": "Somewhere"}).json()["id"]
    res = client.patch(f"/orders/{order_id}/status", headers=admin_headers, json={"status": "shipped"})
    assert res.status_code == 200
    assert res.json()["status"] == "shipped"

    # Invalid status rejected
    res = client.patch(f"/orders/{order_id}/status", headers=admin_headers, json={"status": "banana"})
    assert res.status_code == 400


def test_customer_cannot_see_others_order(client, customer_headers, admin_headers, product, db):
    # Admin places an order
    client.post("/cart/items", headers=admin_headers, json={"product_id": product.id, "quantity": 1})
    admin_order_id = client.post("/orders/", headers=admin_headers, json={"shipping_address": "Admin St"}).json()["id"]

    # Customer tries to fetch it
    res = client.get(f"/orders/{admin_order_id}", headers=customer_headers)
    assert res.status_code == 403


def test_guest_order_flow(client, product):
    res = client.post("/cart/guest")
    token = res.json()["guest_token"]
    headers = {"X-Guest-Token": token}

    client.post("/cart/items", headers=headers, json={"product_id": product.id, "quantity": 2})

    res = client.post("/orders/guest", json={
        "guest_token": token,
        "guest_email": "guest@test.com",
        "guest_phone": "+8801700000000",
        "shipping_address": "123 Guest Lane",
    })
    assert res.status_code == 201
    order = res.json()
    assert order["guest_email"] == "guest@test.com"
    assert float(order["total_price"]) == 50.0

    # Retrieve by token
    res = client.get(f"/orders/guest/{token}")
    assert res.status_code == 200
    assert res.json()["id"] == order["id"]


def test_guest_invalid_phone(client, product):
    res = client.post("/cart/guest")
    token = res.json()["guest_token"]

    res = client.post("/orders/guest", json={
        "guest_token": token,
        "guest_email": "guest@test.com",
        "guest_phone": "abc",
        "shipping_address": "123 Guest Lane",
    })
    assert res.status_code == 422