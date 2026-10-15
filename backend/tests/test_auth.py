import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    payload = {
        "email": "student1@learnloop.edu",
        "password": "Password123!",
        "full_name": "Alice Johnson"
    }
    response = await client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "student1@learnloop.edu"
    assert data["user"]["full_name"] == "Alice Johnson"
    assert "access_token" in response.headers.get("set-cookie", "")

@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    payload = {
        "email": "duplicate@learnloop.edu",
        "password": "Password123!",
        "full_name": "Bob Smith"
    }
    res1 = await client.post("/api/auth/register", json=payload)
    assert res1.status_code == 201

    # Attempt to register identical email
    res2 = await client.post("/api/auth/register", json=payload)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"]

@pytest.mark.asyncio
async def test_register_validation(client: AsyncClient):
    # Password too short (< 6 chars)
    payload = {
        "email": "short@learnloop.edu",
        "password": "123",
        "full_name": "Short Pass"
    }
    res = await client.post("/api/auth/register", json=payload)
    assert res.status_code == 422

@pytest.mark.asyncio
async def test_login_success_and_failure(client: AsyncClient):
    reg_payload = {
        "email": "carol@learnloop.edu",
        "password": "SecurePassword123",
        "full_name": "Carol Danvers"
    }
    reg_res = await client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code == 201

    # Successful login
    login_res = await client.post("/api/auth/login", json={
        "email": "carol@learnloop.edu",
        "password": "SecurePassword123"
    })
    assert login_res.status_code == 200
    data = login_res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "carol@learnloop.edu"

    # Invalid password
    bad_pw_res = await client.post("/api/auth/login", json={
        "email": "carol@learnloop.edu",
        "password": "WrongPassword!"
    })
    assert bad_pw_res.status_code == 401

    # Nonexistent user
    nonexistent_res = await client.post("/api/auth/login", json={
        "email": "nobody@learnloop.edu",
        "password": "Password123!"
    })
    assert nonexistent_res.status_code == 401

@pytest.mark.asyncio
async def test_get_current_user_profile(client: AsyncClient):
    reg_payload = {
        "email": "david@learnloop.edu",
        "password": "Password123!",
        "full_name": "David Banner"
    }
    reg_res = await client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    token = reg_res.json()["access_token"]

    # 1. Test profile retrieval via HTTP-only cookie automatically saved in client
    cookie_res = await client.get("/api/auth/me")
    assert cookie_res.status_code == 200
    assert cookie_res.json()["email"] == "david@learnloop.edu"

    # 2. Test profile retrieval via explicit Authorization header with cleared cookies
    client.cookies.clear()
    header_res = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert header_res.status_code == 200
    assert header_res.json()["email"] == "david@learnloop.edu"

    # 3. Test unauthenticated request when both header and cookie are absent
    client.cookies.clear()
    unauth_res = await client.get("/api/auth/me")
    assert unauth_res.status_code == 401

@pytest.mark.asyncio
async def test_account_isolation(client: AsyncClient):
    """Verify that multiple registered students remain completely isolated."""
    # Register Student A
    res_a = await client.post("/api/auth/register", json={
        "email": "student_a@learnloop.edu",
        "password": "PasswordA123!",
        "full_name": "Student Alpha"
    })
    assert res_a.status_code == 201
    token_a = res_a.json()["access_token"]
    user_a_id = res_a.json()["user"]["id"]

    # Clear cookies before registering Student B
    client.cookies.clear()

    # Register Student B
    res_b = await client.post("/api/auth/register", json={
        "email": "student_b@learnloop.edu",
        "password": "PasswordB123!",
        "full_name": "Student Beta"
    })
    assert res_b.status_code == 201
    token_b = res_b.json()["access_token"]
    user_b_id = res_b.json()["user"]["id"]

    # Verify separate IDs
    assert user_a_id != user_b_id

    # Check Student A profile with explicit token A
    client.cookies.clear()
    profile_a = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_a}"})
    assert profile_a.status_code == 200
    assert profile_a.json()["id"] == user_a_id
    assert profile_a.json()["email"] == "student_a@learnloop.edu"

    # Check Student B profile with explicit token B
    profile_b = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_b}"})
    assert profile_b.status_code == 200
    assert profile_b.json()["id"] == user_b_id
    assert profile_b.json()["email"] == "student_b@learnloop.edu"

@pytest.mark.asyncio
async def test_logout(client: AsyncClient):
    res = await client.post("/api/auth/logout")
    assert res.status_code == 200
    assert "Successfully logged out" in res.json()["message"]
