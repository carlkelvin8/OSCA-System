"""
Attendance endpoint tests.
Covers: session creation, attendance records listing.
Note: Face scan tests require InsightFace models — use integration test environment.
"""
import pytest
from httpx import AsyncClient

from app.models.user import User


@pytest.mark.asyncio
class TestSessions:
    async def test_create_session_as_admin(
        self, client: AsyncClient, admin_user: User, admin_headers: dict
    ):
        response = await client.post(
            "/api/v1/attendance/sessions",
            headers=admin_headers,
            json={
                "name": "Basketball Morning Practice",
                "activity_type": "practice",
                "sport_or_art": "Basketball",
                "venue": "Main Gymnasium",
                "scheduled_start": "2026-03-01T06:00:00+08:00",
                "scheduled_end": "2026-03-01T09:00:00+08:00",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Basketball Morning Practice"
        assert data["activity_type"] == "practice"
        assert data["attendance_count"] == 0

    async def test_create_session_invalid_end_before_start(
        self, client: AsyncClient, admin_headers: dict
    ):
        response = await client.post(
            "/api/v1/attendance/sessions",
            headers=admin_headers,
            json={
                "name": "Invalid Session",
                "activity_type": "practice",
                "scheduled_start": "2026-03-01T09:00:00+08:00",
                "scheduled_end": "2026-03-01T06:00:00+08:00",  # Before start
            },
        )
        assert response.status_code == 422

    async def test_list_sessions(
        self, client: AsyncClient, admin_headers: dict
    ):
        response = await client.get("/api/v1/attendance/sessions", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data

    async def test_get_attendance_records(
        self, client: AsyncClient, student_user: User, student_headers: dict
    ):
        response = await client.get(
            "/api/v1/attendance/records",
            headers=student_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data

    async def test_enroll_without_consent_fails(
        self, client: AsyncClient, admin_user: User, admin_headers: dict,
        db_session, student_user: User
    ):
        """Face enrollment must be refused without biometric consent."""
        # student_user has biometric_consent=True from fixture — create one without
        from app.models.user import UserRole
        from app.core.security import hash_password

        no_consent_user = User(
            email="noconsent@test.com",
            hashed_password=hash_password("Test123!"),
            first_name="No",
            last_name="Consent",
            role=UserRole.STUDENT,
            is_active=True,
            biometric_consent=False,
        )
        db_session.add(no_consent_user)
        await db_session.commit()
        await db_session.refresh(no_consent_user)

        response = await client.post(
            "/api/v1/attendance/enroll",
            headers=admin_headers,
            json={
                "user_id": str(no_consent_user.id),
                "images_base64": ["aW52YWxpZA=="] * 5,  # dummy base64
            },
        )
        assert response.status_code == 400
        assert "consent" in response.json()["detail"].lower()
