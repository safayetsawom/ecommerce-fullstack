import pytest


def test_checkout_decrements_stock(client, customer_headers, product, variant, db):
    client.post("/cart/items", headers=customer_headers, json={"variant_id": variant.id, "quantity": 3})
    res = client.post("/orders/", headers=customer_headers, json={
        "shipping_address": "123 Main St",
        "shipping_phone": "+8801700000000",
    })
    assert res.status_code == 201
    order = res.json()
    assert order["status"] == "pending"
    assert float(order["total_price"]) == 30.0

    # Cart is now empty
    assert client.get("/cart/", headers=customer_headers).json()["items"] == []

    # Variant stock went down by 3
    db.refresh(variant)
    assert variant.stock == 2


def test_empty_cart_rejected(client, customer_headers):
    res = client.post("/orders/", headers=customer_headers, json={
        "shipping_address": "123 Main St",
        "shipping_phone": "+8801700000000",
    })
    assert res.status_code == 400


def test_order_history(client, customer_headers, product, variant):
    client.post("/cart/items", headers=customer_headers, json={"variant_id": variant.id, "quantity": 1})
    client.post("/orders/", headers=customer_headers, json={
        "shipping_address": "Somewhere",
        "shipping_phone": "+8801700000000",
    })

    res = client.get("/orders/me", headers=customer_headers)
    assert res.status_code == 200
    assert len(res.json()) == 1


def test_order_snapshots_options_text(client, customer_headers, product, variant):
    client.post("/cart/items", headers=customer_headers, json={"variant_id": variant.id, "quantity": 1})
    res = client.post("/orders/", headers=customer_headers, json={
        "shipping_address": "Somewhere",
        "shipping_phone": "+8801700000000",
    })
    order = res.json()
    assert order["items"][0]["options_text"] == "Default"
    assert order["items"][0]["variant_id"] == variant.id


def test_admin_can_update_status(client, customer_headers, admin_headers, product, variant):
    client.post("/cart/items", headers=customer_headers, json={"variant_id": variant.id, "quantity": 1})
    order_id = client.post("/orders/", headers=customer_headers, json={
        "shipping_address": "Somewhere",
        "shipping_phone": "+8801700000000",
    }).json()["id"]

    res = client.patch(f"/orders/{order_id}/status", headers=admin_headers, json={"status": "shipped"})
    assert res.status_code == 200
    assert res.json()["status"] == "shipped"

    res = client.patch(f"/orders/{order_id}/status", headers=admin_headers, json={"status": "banana"})
    assert res.status_code == 400


def test_customer_cannot_see_others_order(client, customer_headers, admin_headers, product, variant):
    client.post("/cart/items", headers=admin_headers, json={"variant_id": variant.id, "quantity": 1})
    admin_order_id = client.post("/orders/", headers=admin_headers, json={
        "shipping_address": "Admin St",
        "shipping_phone": "+8801700000000",
    }).json()["id"]

    res = client.get(f"/orders/{admin_order_id}", headers=customer_headers)
    assert res.status_code == 403


def test_guest_order_flow(client, product, variant):
    res = client.post("/cart/guest")
    token = res.json()["guest_token"]
    headers = {"X-Guest-Token": token}

    client.post("/cart/items", headers=headers, json={"variant_id": variant.id, "quantity": 2})

    res = client.post("/orders/guest", json={
        "guest_token": token,
        "guest_email": "guest@test.com",
        "shipping_phone": "+8801700000000",
        "shipping_address": "123 Guest Lane",
    })
    assert res.status_code == 201
    order = res.json()
    assert order["guest_email"] == "guest@test.com"
    assert float(order["total_price"]) == 20.0

    res = client.get(f"/orders/guest/{token}")
    assert res.status_code == 200
    assert res.json()["id"] == order["id"]


def test_guest_order_without_email(client, product, variant):
    """Guest checkout should work without an email — only phone + address required."""
    res = client.post("/cart/guest")
    token = res.json()["guest_token"]
    headers = {"X-Guest-Token": token}

    client.post("/cart/items", headers=headers, json={"variant_id": variant.id, "quantity": 1})

    res = client.post("/orders/guest", json={
        "guest_token": token,
        "shipping_phone": "+8801700000000",
        "shipping_address": "123 Guest Lane",
    })
    assert res.status_code == 201
    assert res.json()["guest_email"] is None


def test_guest_invalid_phone(client, product, variant):
    res = client.post("/cart/guest")
    token = res.json()["guest_token"]

    res = client.post("/orders/guest", json={
        "guest_token": token,
        "shipping_phone": "abc",
        "shipping_address": "123 Guest Lane",
    })
    assert res.status_code == 422