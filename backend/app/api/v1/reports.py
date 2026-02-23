"""
Report generation endpoints: attendance PDF/XLSX, inventory PDF/XLSX.
"""
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.core.dependencies import CurrentUser, NotStudent, get_db
from app.schemas.attendance import AttendanceReportFilter
from app.services.report_service import ReportService
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.get(
    "/attendance/pdf",
    summary="Generate attendance report PDF",
    response_class=StreamingResponse,
)
async def attendance_pdf(
    _user: NotStudent,
    db: Annotated[AsyncSession, Depends(get_db)],
    sport_or_art: str | None = Query(None),
    session_id: str | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
) -> StreamingResponse:
    report_service = ReportService(db)
    pdf_bytes = await report_service.generate_attendance_pdf(
        sport_or_art=sport_or_art,
        date_from=date_from,
        date_to=date_to,
    )
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=attendance_report.pdf"},
    )


@router.get(
    "/attendance/xlsx",
    summary="Export attendance report XLSX",
    response_class=StreamingResponse,
)
async def attendance_xlsx(
    _user: NotStudent,
    db: Annotated[AsyncSession, Depends(get_db)],
    sport_or_art: str | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
) -> StreamingResponse:
    report_service = ReportService(db)
    xlsx_bytes = await report_service.generate_attendance_xlsx(
        sport_or_art=sport_or_art,
        date_from=date_from,
        date_to=date_to,
    )
    return StreamingResponse(
        iter([xlsx_bytes]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=attendance_report.xlsx"},
    )


@router.get(
    "/inventory/pdf",
    summary="Generate inventory report PDF",
    response_class=StreamingResponse,
)
async def inventory_pdf(
    _user: NotStudent,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StreamingResponse:
    report_service = ReportService(db)
    pdf_bytes = await report_service.generate_inventory_pdf()
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=inventory_report.pdf"},
    )


@router.get(
    "/inventory/xlsx",
    summary="Export inventory report XLSX",
    response_class=StreamingResponse,
)
async def inventory_xlsx(
    _user: NotStudent,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StreamingResponse:
    report_service = ReportService(db)
    xlsx_bytes = await report_service.generate_inventory_xlsx()
    return StreamingResponse(
        iter([xlsx_bytes]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=inventory_report.xlsx"},
    )


@router.get(
    "/dashboard/summary",
    summary="Dashboard summary data",
)
async def dashboard_summary(
    _user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    report_service = ReportService(db)
    return await report_service.get_dashboard_summary()
