"""Central API v1 router — assembles all sub-routers."""
from fastapi import APIRouter

from app.api.v1 import auth, users, attendance, inventory, reports

api_router = APIRouter()

api_router.include_router(auth.router,       prefix="/auth",       tags=["Authentication"])
api_router.include_router(users.router,      prefix="/users",      tags=["Users"])
api_router.include_router(attendance.router, prefix="/attendance",  tags=["Attendance"])
api_router.include_router(inventory.router,  prefix="/inventory",   tags=["Inventory"])
api_router.include_router(reports.router,    prefix="/reports",     tags=["Reports"])
