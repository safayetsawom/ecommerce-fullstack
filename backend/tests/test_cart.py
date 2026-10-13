import pytest


@pytest.fixture
def product(db):
    from app.models.category import Category
    from app.models.product import Product
    c = Category(name="Cat", slug="cat")
    db.add(c)
    db.commit()
    db.refresh(c)
    p = Product(name="Thing", price="10.00", stock=5, category_id=c.id)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def test_add_to_cart(client, customer_headers, product):
    res = client.post("/cart/items", headers=customer_headers, json={
        "product_id": product.id, "quantity": 2,
    })
    assert res.status_code == 201
    body = res.json()
    assert body["total_items"] == 2
    assert float(body["total_price"]) == 20.0


def test_add_twice_merges(client, customer_headers, product):
    client.post("/cart/items", headers=customer_headers, json={"product_id": product.id, "quantity": 1})
    res = client.post("/cart/items", headers=customer_headers, json={"product_id": product.id, "quantity": 3})
    body = res.json()
    assert len(body["items"]) == 1
    assert body["items"][0]["quantity"] == 4


def test_over_stock_rejected(client, customer_headers, product):
    res = client.post("/cart/items", headers=customer_headers, json={
        "product_id": product.id, "quantity": 999,
    })
    assert res.status_code == 400


def test_guest_cart_flow(client, product):
    # Get a guest token
    res = client.post("/cart/guest")
    assert res.status_code == 201
    token = res.json()["guest_token"]

    headers = {"X-Guest-Token": token}
    res = client.post("/cart/items", headers=headers, json={"product_id": product.id, "quantity": 1})
    assert res.status_code == 201
    assert res.json()["total_items"] == 1

    # No token → 401
    res = client.get("/cart/")
    assert res.status_code == 401


def test_cart_isolation(client, customer_headers, admin_headers, product):
    client.post("/cart/items", headers=customer_headers, json={"product_id": product.id, "quantity": 1})
    # Admin's cart is separate
    res = client.get("/cart/", headers=admin_headers)
    assert res.json()["total_items"] == 0