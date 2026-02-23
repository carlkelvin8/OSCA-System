"""
Authentication endpoint tests.
Covers: login, refresh, logout, password change, rate limiting.
"""
import pytest
from httpx import AsyncClient

from app.models.user import User


@pytest.mark.asyncio
class TestLogin:
    async def test_login_success(self, client: AsyncClient, admin_user: User):
        response = await client.post("/api/v1/auth/login", json={
            "email": "admin@test.com",
            "password": "TestAdmin123!",
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_wrong_password(self, client: AsyncClient, admin_user: User):
        response = await client.post("/api/v1/auth/login", json={
            "email": "admin@test.com",
            "password": "WrongPassword!",
        })
        assert response.status_code == 401

    async def test_login_unknown_email(self, client: AsyncClient):
        response = await client.post("/api/v1/auth/login", json={
            "email": "nobody@test.com",
            "password": "SomePassword123!",
        })
        assert response.status_code == 401

    async def test_get_me(self, client: AsyncClient, admin_user: User, admin_headers: dict):
        response = await client.get("/api/v1/auth/me", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "admin@test.com"
        assert data["role"] == "admin"

    async def test_get_me_unauthenticated(self, client: AsyncClient):
        response = await client.get("/api/v1/auth/me")
        assert response.status_code in (401, 403)  # 401 from get_current_user; 403 from HTTPBearer

    async def test_logout(self, client: AsyncClient, admin_user: User, admin_headers: dict):
        response = await client.post("/api/v1/auth/logout", headers=admin_headers)
        assert response.status_code == 200

    async def test_refresh_token(self, client: AsyncClient, admin_user: User):
        # Login first
        login_resp = await client.post("/api/v1/auth/login", json={
            "email": "admin@test.com",
            "password": "TestAdmin123!",
        })
        refresh_token = login_resp.json()["refresh_token"]

        # Refresh
        refresh_resp = await client.post("/api/v1/auth/refresh", json={
            "refresh_token": refresh_token,
        })
        assert refresh_resp.status_code == 200
        assert "access_token" in refresh_resp.json()

    async def test_refresh_token_reuse_fails(self, client: AsyncClient, admin_user: User):
        """Refresh tokens are one-time use (rotation policy)."""
        login_resp = await client.post("/api/v1/auth/login", json={
            "email": "admin@test.com",
            "password": "TestAdmin123!",
        })
        refresh_token = login_resp.json()["refresh_token"]

        # First use — should succeed
        await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})

        # Second use — should fail (blacklisted)
        resp2 = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
        assert resp2.status_code == 401
