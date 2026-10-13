def test_register_and_login(client):
    # Register
    res = client.post("/auth/register", json={
        "email": "new@test.com",
        "password": "secret123",
        "full_name": "New User",
    })
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "new@test.com"
    assert data["role"] == "customer"
    assert "hashed_password" not in data
    assert "password" not in data

    # Login
    res = client.post("/auth/login", data={
        "username": "new@test.com",
        "password": "secret123",
    })
    assert res.status_code == 200
    assert "access_token" in res.json()


def test_login_wrong_password(client, customer_user):
    res = client.post("/auth/login", data={
        "username": customer_user.email,
        "password": "wrong",
    })
    assert res.status_code == 401


def test_duplicate_email_rejected(client):
    client.post("/auth/register", json={"email": "dup@test.com", "password": "secret123"})
    res = client.post("/auth/register", json={"email": "dup@test.com", "password": "secret123"})
    assert res.status_code == 400


def test_me_requires_token(client):
    res = client.get("/auth/me")
    assert res.status_code == 401


def test_me_with_token(client, customer_headers, customer_user):
    res = client.get("/auth/me", headers=customer_headers)
    assert res.status_code == 200
    assert res.json()["email"] == customer_user.email