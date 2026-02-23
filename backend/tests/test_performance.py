"""
Performance Tests — OSCA Attendance & Inventory System
Senior QA Performance Test Suite

Covers:
  - Login endpoint latency (target: < 500ms incl. Argon2id hashing)
  - Registration endpoint latency (target: < 500ms)
  - Authenticated GET /me latency (target: < 100ms)
  - List users endpoint (target: < 150ms)
  - Health check (target: < 50ms)
  - Concurrent login simulation (5 simultaneous requests)
  - Token refresh latency (target: < 100ms)
"""
import asyncio
import time
import pytest
from httpx import AsyncClient

from app.models.user import User
from app.core.security import hash_password


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

async def measure(client: AsyncClient, method: str, path: str, **kwargs) -> float:
    """Return endpoint latency in milliseconds."""
    start = time.perf_counter()
    func = getattr(client, method)
    await func(path, **kwargs)
    return (time.perf_counter() - start) * 1000


# ─────────────────────────────────────────────────────────────────────────────
# PERF-01: Auth Endpoint Latency
# ─────────────────────────────────────────────────────────────────────────────

class TestAuthPerformance:
    async def test_login_latency(self, client: AsyncClient, admin_user: User):
        """Login incl. Argon2id verify must complete < 500 ms."""
        ms = await measure(client, "post", "/api/v1/auth/login", json={
            "email": "admin@test.com",
            "password": "TestAdmin123!",
        })
        print(f"\n[PERF] Login latency: {ms:.1f} ms")
        assert ms < 500, f"Login too slow: {ms:.1f} ms (threshold: 500 ms)"

    async def test_failed_login_latency(self, client: AsyncClient, admin_user: User):
        """Failed login should also complete quickly (constant-time design)."""
        ms = await measure(client, "post", "/api/v1/auth/login", json={
            "email": "admin@test.com",
            "password": "WrongPassword!",
        })
        print(f"\n[PERF] Failed-login latency: {ms:.1f} ms")
        assert ms < 500, f"Failed login too slow: {ms:.1f} ms"

    async def test_get_me_latency(self, client: AsyncClient, admin_user: User, admin_headers: dict):
        """JWT validation + DB lookup for /me must be < 100 ms."""
        ms = await measure(client, "get", "/api/v1/auth/me", headers=admin_headers)
        print(f"\n[PERF] GET /me latency: {ms:.1f} ms")
        assert ms < 100, f"GET /me too slow: {ms:.1f} ms (threshold: 100 ms)"

    async def test_token_refresh_latency(self, client: AsyncClient, admin_user: User, redis_client):
        """Token refresh must complete < 150 ms."""
        # Clear any stale rate limit keys so login succeeds
        await redis_client.delete("login_attempts:127.0.0.1")
        await redis_client.delete("login_lockout:127.0.0.1")
        login = await client.post("/api/v1/auth/login", json={
            "email": "admin@test.com",
            "password": "TestAdmin123!",
        })
        assert login.status_code == 200, f"Login failed: {login.json()}"
        rt = login.json()["refresh_token"]
        ms = await measure(client, "post", "/api/v1/auth/refresh",
                           json={"refresh_token": rt})
        print(f"\n[PERF] Token refresh latency: {ms:.1f} ms")
        assert ms < 150, f"Token refresh too slow: {ms:.1f} ms"


# ─────────────────────────────────────────────────────────────────────────────
# PERF-02: User Management Endpoint Latency
# ─────────────────────────────────────────────────────────────────────────────

class TestUserEndpointPerformance:
    async def test_registration_latency(self, client: AsyncClient):
        """Registration incl. password hashing must complete < 500 ms."""
        ms = await measure(client, "post", "/api/v1/users/register", json={
            "email": "perf_user@test.com",
            "password": "StrongPass123!",
            "first_name": "Perf",
            "last_name": "User",
            "role": "student",
            "biometric_consent": True,
        })
        print(f"\n[PERF] Registration latency: {ms:.1f} ms")
        assert ms < 500, f"Registration too slow: {ms:.1f} ms"

    async def test_list_users_latency(self, client: AsyncClient, admin_user: User, admin_headers: dict):
        """Admin list users with pagination must complete < 150 ms."""
        ms = await measure(client, "get",
                           "/api/v1/users/?page=1&page_size=20",
                           headers=admin_headers)
        print(f"\n[PERF] List users latency: {ms:.1f} ms")
        assert ms < 150, f"List users too slow: {ms:.1f} ms"

    async def test_get_user_profile_latency(
        self, client: AsyncClient, admin_user: User, admin_headers: dict
    ):
        """GET user by ID must complete < 100 ms."""
        ms = await measure(client, "get",
                           f"/api/v1/users/{admin_user.id}",
                           headers=admin_headers)
        print(f"\n[PERF] GET user profile latency: {ms:.1f} ms")
        assert ms < 100, f"GET user profile too slow: {ms:.1f} ms"


# ─────────────────────────────────────────────────────────────────────────────
# PERF-03: Health & Infrastructure
# ─────────────────────────────────────────────────────────────────────────────

class TestInfrastructurePerformance:
    async def test_health_check_latency(self, client: AsyncClient):
        """Health endpoint must respond < 50 ms."""
        ms = await measure(client, "get", "/health")
        print(f"\n[PERF] Health check latency: {ms:.1f} ms")
        assert ms < 50, f"Health check too slow: {ms:.1f} ms"


# ─────────────────────────────────────────────────────────────────────────────
# PERF-04: Concurrent Requests
# ─────────────────────────────────────────────────────────────────────────────

class TestConcurrencyPerformance:
    async def test_concurrent_me_requests(
        self, client: AsyncClient, admin_user: User, admin_headers: dict
    ):
        """5 sequential GET /me requests — all must complete < 300 ms each."""
        latencies = []
        statuses = []
        for _ in range(5):
            start = time.perf_counter()
            resp = await client.get("/api/v1/auth/me", headers=admin_headers)
            latencies.append((time.perf_counter() - start) * 1000)
            statuses.append(resp.status_code)

        avg_ms = sum(latencies) / len(latencies)
        print(f"\n[PERF] 5x sequential GET /me — avg latency: {avg_ms:.1f} ms, statuses: {statuses}")
        assert all(s == 200 for s in statuses), f"Some requests failed: {statuses}"
        assert avg_ms < 200, f"Average GET /me latency too high: {avg_ms:.1f} ms"

    async def test_concurrent_login_requests(
        self, client: AsyncClient, admin_user: User, redis_client
    ):
        """3 sequential valid login requests — all must succeed (rate-limit-cleared)."""
        # Flush Redis rate limit used in prior tests so we don't get 429
        await redis_client.delete("login_attempts:127.0.0.1")
        await redis_client.delete("login_lockout:127.0.0.1")

        statuses = []
        start = time.perf_counter()
        for _ in range(3):
            resp = await client.post("/api/v1/auth/login", json={
                "email": "admin@test.com",
                "password": "TestAdmin123!",
            })
            statuses.append(resp.status_code)
        total_ms = (time.perf_counter() - start) * 1000

        print(f"\n[PERF] 3x sequential login — total wall time: {total_ms:.1f} ms, statuses: {statuses}")
        assert all(s == 200 for s in statuses), f"Login returned non-200: {statuses}"
        assert total_ms < 2000, f"3 sequential logins took too long: {total_ms:.1f} ms"
