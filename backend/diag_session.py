"""Diagnostic script to inspect 422 body for session create endpoint."""
import asyncio, sys

async def main():
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from sqlalchemy import text
    from app.database import Base, get_db
    from app.core.security import create_access_token, hash_password
    from app.core.dependencies import get_redis
    from app.models.user import User, UserRole
    from app.main import app
    import redis.asyncio as aioredis
    from httpx import AsyncClient, ASGITransport

    engine = create_async_engine(
        'postgresql+asyncpg://osca_user:OSCA_Init2026!@postgres:5432/osca_test', echo=False
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        for e in ['activity_type_enum', 'scan_type_enum', 'scan_result_enum', 'userrole']:
            await conn.execute(text(f'DROP TYPE IF EXISTS {e} CASCADE'))
        await conn.run_sync(Base.metadata.create_all)

    sm = async_sessionmaker(engine, expire_on_commit=False)
    async with sm() as db:
        u = User(
            email='a@t.com', hashed_password=hash_password('T123!'),
            first_name='A', last_name='B', role=UserRole.ADMIN, is_active=True
        )
        db.add(u)
        await db.commit()
        await db.refresh(u)
        token = create_access_token(str(u.id), u.role.value)
        r = aioredis.from_url(
            'redis://:OSCA_Init2026!@redis:6379/0', encoding='utf-8', decode_responses=True
        )

        class Mock:
            async def enroll_face(self, *a, **k): pass
            async def identify_face(self, *a, **k): pass

        app.state.fr_service = Mock()

        async def odb():
            yield db

        async def or_():
            return r

        app.dependency_overrides[get_db] = odb
        app.dependency_overrides[get_redis] = or_

        async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as c:
            rsp = await c.post(
                '/api/v1/attendance/sessions',
                headers={'Authorization': f'Bearer {token}'},
                json={
                    'name': 'Test',
                    'activity_type': 'practice',
                    'sport_or_art': 'Basketball',
                    'venue': 'Gym',
                    'scheduled_start': '2026-03-01T06:00:00+08:00',
                    'scheduled_end': '2026-03-01T09:00:00+08:00',
                }
            )
            with open('/tmp/body.txt', 'w') as f:
                f.write(f'STATUS: {rsp.status_code}\n')
                f.write(rsp.text)
            print(f'STATUS: {rsp.status_code}')
            print(f'Written to /tmp/body.txt')

        await r.aclose()
    await engine.dispose()


asyncio.run(main())
