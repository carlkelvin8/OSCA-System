"""
pytest configuration and shared fixtures.
Uses an in-memory SQLite for speed, or a real test PostgreSQL DB.
"""
import asyncio
import os
from typing import AsyncGenerator

import pytest
import pytest_asyncio
import redis.asyncio as aioredis
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.core.dependencies import get_redis
from app.core.security import create_access_token, hash_password
from app.database import Base, get_db
from app.main import app
from app.models.user import User, UserRole

# Use an isolated test database.
# TEST_DATABASE_URL can be overridden via environment variable so the same
# conftest works both inside the Docker network (host=postgres) and locally
# (host=localhost).
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://osca_user:osca_test_password@postgres:5432/osca_test",
)



@pytest_asyncio.fixture(scope="function")
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        # Drop tables first
        await conn.run_sync(Base.metadata.drop_all)
        # Drop any leftover PostgreSQL ENUM types (SQLAlchemy doesn't always clean these up).
        # This prevents 'type already exists' errors on re-create.
        for enum_name in (
            "activity_type_enum",
            "scan_type_enum",
            "scan_result_enum",
            "userrole",
        ):
            await conn.execute(
                text(f"DROP TYPE IF EXISTS {enum_name} CASCADE")
            )
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    session_factory = async_sessionmaker(test_engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        # Truncate all tables after each test to ensure perfect data isolation
        await session.rollback()
        async with test_engine.begin() as conn:
            for table in reversed(Base.metadata.sorted_tables):
                await conn.execute(text(f"TRUNCATE {table.name} CASCADE;"))



@pytest_asyncio.fixture(scope="function", autouse=False)
async def redis_client() -> AsyncGenerator[aioredis.Redis, None]:
    """Fresh Redis client per test — avoids the global singleton's event-loop conflict."""
    r = aioredis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
    )
    yield r
    await r.aclose()


@pytest_asyncio.fixture(scope="function", autouse=True)
async def flush_rate_limits() -> None:
    """
    Autouse: Reset login rate-limit keys in Redis before every test.
    HTTPX ASGITransport sends requests with client IP = 127.0.0.1 inside FastAPI.
    Prevents lockout state from prior tests/runs bleeding into assertions.
    """
    r = aioredis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
    await r.delete("login_attempts:127.0.0.1")
    await r.delete("login_lockout:127.0.0.1")
    yield
    await r.aclose()


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession, redis_client: aioredis.Redis) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    async def override_get_redis():
        return redis_client

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_redis] = override_get_redis

    # Provide a lightweight mock FR service on app.state so endpoints that
    # check biometric consent (before calling FR) work in tests.
    class _MockFRService:
        async def enroll_face(self, *args, **kwargs):
            raise RuntimeError("FR model not available in test environment")

        async def identify_face(self, *args, **kwargs):
            raise RuntimeError("FR model not available in test environment")

    app.state.fr_service = _MockFRService()

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as c:
        yield c

    app.dependency_overrides.clear()
    if hasattr(app.state, "fr_service"):
        del app.state.fr_service



@pytest_asyncio.fixture(scope="function")
async def admin_user(db_session: AsyncSession) -> User:
    user = User(
        email="admin@test.com",
        hashed_password=hash_password("TestAdmin123!"),
        first_name="Test",
        last_name="Admin",
        role=UserRole.ADMIN,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture(scope="function")
async def student_user(db_session: AsyncSession) -> User:
    user = User(
        email="student@test.com",
        hashed_password=hash_password("TestStudent123!"),
        first_name="Test",
        last_name="Student",
        student_id="2024-12345",
        role=UserRole.STUDENT,
        is_active=True,
        biometric_consent=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
def admin_token(admin_user: User) -> str:
    return create_access_token(str(admin_user.id), admin_user.role.value)


@pytest_asyncio.fixture
def student_token(student_user: User) -> str:
    return create_access_token(str(student_user.id), student_user.role.value)


@pytest_asyncio.fixture
def admin_headers(admin_token: str) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}


@pytest_asyncio.fixture
def student_headers(student_token: str) -> dict:
    return {"Authorization": f"Bearer {student_token}"}
