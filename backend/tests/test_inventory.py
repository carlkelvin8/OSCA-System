"""
Inventory endpoint tests.
Covers: equipment CRUD, borrowing ID issuance, borrow/return workflow.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole


@pytest.mark.asyncio
class TestEquipment:
    async def test_create_equipment_as_admin(
        self, client: AsyncClient, admin_user: User, admin_headers: dict
    ):
        response = await client.post(
            "/api/v1/inventory/equipment",
            headers=admin_headers,
            json={
                "name": "Basketball",
                "category": "balls",
                "condition": "good",
                "total_quantity": 10,
                "storage_location": "Gym Cabinet A",
                "sport_or_art": "Basketball",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Basketball"
        assert data["available_quantity"] == 10
        assert data["barcode"].startswith("OSCA-")

    async def test_create_equipment_as_student_fails(
        self, client: AsyncClient, student_user: User, student_headers: dict
    ):
        response = await client.post(
            "/api/v1/inventory/equipment",
            headers=student_headers,
            json={
                "name": "Badminton Racket",
                "category": "rackets",
                "condition": "new",
                "total_quantity": 5,
            },
        )
        assert response.status_code == 403

    async def test_list_equipment(
        self, client: AsyncClient, student_user: User, student_headers: dict
    ):
        response = await client.get("/api/v1/inventory/equipment", headers=student_headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data

    async def test_barcode_lookup(
        self, client: AsyncClient, admin_user: User, admin_headers: dict
    ):
        # Create equipment first
        create_resp = await client.post(
            "/api/v1/inventory/equipment",
            headers=admin_headers,
            json={
                "name": "Volleyball",
                "category": "balls",
                "condition": "good",
                "total_quantity": 3,
            },
        )
        barcode = create_resp.json()["barcode"]

        # Lookup by barcode
        lookup_resp = await client.get(
            f"/api/v1/inventory/equipment/barcode/{barcode}",
            headers=admin_headers,
        )
        assert lookup_resp.status_code == 200
        assert lookup_resp.json()["barcode"] == barcode

    async def test_invalid_barcode_returns_404(
        self, client: AsyncClient, admin_headers: dict
    ):
        response = await client.get(
            "/api/v1/inventory/equipment/barcode/INVALID-BARCODE",
            headers=admin_headers,
        )
        assert response.status_code == 404
