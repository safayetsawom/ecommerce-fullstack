import pytest


def test_add_to_cart(client, customer_headers, product, variant):
    res = client.post("/cart/items", headers=customer_headers, json={
        "variant_id": variant.id, "quantity": 2,
    })
    assert res.status_code == 201
    body = res.json()
    assert body["total_items"] == 2
    assert float(body["total_price"]) == 20.0


def test_add_twice_merges(client, customer_headers, product, variant):
    client.post("/cart/items", headers=customer_headers, json={"variant_id": variant.id, "quantity": 1})
    res = client.post("/cart/items", headers=customer_headers, json={"variant_id": variant.id, "quantity": 3})
    body = res.json()
    assert len(body["items"]) == 1
    assert body["items"][0]["quantity"] == 4


def test_over_stock_rejected(client, customer_headers, product, variant):
    res = client.post("/cart/items", headers=customer_headers, json={
        "variant_id": variant.id, "quantity": 999,
    })
    assert res.status_code == 400


def test_guest_cart_flow(client, product, variant):
    res = client.post("/cart/guest")
    assert res.status_code == 201
    token = res.json()["guest_token"]

    headers = {"X-Guest-Token": token}
    res = client.post("/cart/items", headers=headers, json={"variant_id": variant.id, "quantity": 1})
    assert res.status_code == 201
    assert res.json()["total_items"] == 1

    res = client.get("/cart/")
    assert res.status_code == 401


def test_cart_isolation(client, customer_headers, admin_headers, product, variant):
    client.post("/cart/items", headers=customer_headers, json={"variant_id": variant.id, "quantity": 1})
    res = client.get("/cart/", headers=admin_headers)
    assert res.json()["total_items"] == 0


def test_add_to_cart_includes_options_text(client, customer_headers, product, variant):
    res = client.post("/cart/items", headers=customer_headers, json={"variant_id": variant.id, "quantity": 1})
    assert res.status_code == 201
    item = res.json()["items"][0]
    assert item["variant_id"] == variant.id
    assert item["product_name"] == "Thing"
    assert item["options_text"] == "Default"


def test_add_to_cart_unknown_variant(client, customer_headers):
    res = client.post("/cart/items", headers=customer_headers, json={"variant_id": 99999, "quantity": 1})
    assert res.status_code == 404