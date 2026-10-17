import pytest


def test_admin_can_create_product(client, admin_headers, category):
    res = client.post("/products/", headers=admin_headers, json={
        "name": "Widget",
        "description": "A widget",
        "price": "9.99",
        "category_id": category.id,
        "is_unlimited_stock": False,
    })
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Widget"
    assert float(data["price"]) == 9.99
    # No options → one default variant created
    assert len(data["variants"]) == 1
    assert data["variants"][0]["options_text"] == "Default"


def test_product_with_options_creates_variants(client, admin_headers, category):
    res = client.post("/products/", headers=admin_headers, json={
        "name": "Tee",
        "price": "20.00",
        "category_id": category.id,
        "options": [
            {
                "name": "Size",
                "position": 0,
                "values": [
                    {"value": "S", "position": 0},
                    {"value": "M", "position": 1},
                    {"value": "L", "position": 2},
                ],
            }
        ],
    })
    assert res.status_code == 201
    data = res.json()
    assert len(data["variants"]) == 3
    labels = sorted(v["options_text"] for v in data["variants"])
    assert labels == ["L", "M", "S"]


def test_product_with_two_options(client, admin_headers, category):
    """Shirt sizes × colors → cartesian product of variants."""
    res = client.post("/products/", headers=admin_headers, json={
        "name": "Shirt",
        "price": "30.00",
        "category_id": category.id,
        "options": [
            {
                "name": "Size",
                "position": 0,
                "values": [
                    {"value": "S", "position": 0},
                    {"value": "M", "position": 1},
                ],
            },
            {
                "name": "Color",
                "position": 1,
                "values": [
                    {"value": "Black", "position": 0},
                    {"value": "White", "position": 1},
                ],
            },
        ],
    })
    assert res.status_code == 201
    data = res.json()
    assert len(data["variants"]) == 4
    labels = sorted(v["options_text"] for v in data["variants"])
    assert labels == ["M / Black", "M / White", "S / Black", "S / White"]


def test_customer_cannot_create_product(client, customer_headers, category):
    res = client.post("/products/", headers=customer_headers, json={
        "name": "Widget",
        "price": "9.99",
        "category_id": category.id,
    })
    assert res.status_code == 403


def test_anonymous_cannot_create_product(client, category):
    res = client.post("/products/", json={
        "name": "Widget",
        "price": "9.99",
        "category_id": category.id,
    })
    assert res.status_code == 401


def test_list_products_is_public(client, admin_headers, category):
    client.post("/products/", headers=admin_headers, json={
        "name": "Public Item", "price": "5.00", "category_id": category.id,
    })
    res = client.get("/products/")
    assert res.status_code == 200
    body = res.json()
    assert body["total"] >= 1
    assert any(p["name"] == "Public Item" for p in body["items"])


def test_search_filter(client, admin_headers, category):
    for name in ["Apple", "Banana", "Cherry"]:
        client.post("/products/", headers=admin_headers, json={
            "name": name, "price": "1.00", "category_id": category.id,
        })
    res = client.get("/products/?q=an")
    assert res.status_code == 200
    names = [p["name"] for p in res.json()["items"]]
    assert "Banana" in names
    assert "Apple" not in names


def test_invalid_price_rejected(client, admin_headers, category):
    res = client.post("/products/", headers=admin_headers, json={
        "name": "Bad", "price": "-5", "category_id": category.id,
    })
    assert res.status_code == 422


def test_admin_can_update_variant_stock(client, admin_headers, category):
    # Create a product with one variant
    create = client.post("/products/", headers=admin_headers, json={
        "name": "Stocked", "price": "12.00", "category_id": category.id,
    })
    product = create.json()
    variant_id = product["variants"][0]["id"]

    res = client.patch(
        f"/products/{product['id']}/variants/{variant_id}",
        headers=admin_headers,
        json={"stock": 77},
    )
    assert res.status_code == 200
    updated = res.json()
    assert updated["variants"][0]["stock"] == 77