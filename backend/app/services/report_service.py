"""
Report generation service.
PDF: WeasyPrint (HTML → PDF, professional layout)
XLSX: openpyxl (formatted spreadsheet with column widths, headers)
"""
import io
from datetime import UTC, datetime

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attendance import AttendanceRecord, Session
from app.models.inventory import BorrowTransaction, Equipment, TransactionStatus
from app.models.user import User


HEADER_FILL = PatternFill("solid", fgColor="1E3A5F")   # OSCA navy blue
HEADER_FONT = Font(color="FFFFFF", bold=True)
ALT_FILL = PatternFill("solid", fgColor="EBF0F7")


class ReportService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Attendance PDF ─────────────────────────────────────────────────────────

    async def generate_attendance_pdf(
        self,
        sport_or_art: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> bytes:
        records = await self._fetch_attendance_records(sport_or_art, date_from, date_to)
        html = self._render_attendance_html(records, sport_or_art, date_from, date_to)
        return self._html_to_pdf(html)

    async def generate_attendance_xlsx(
        self,
        sport_or_art: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> bytes:
        records = await self._fetch_attendance_records(sport_or_art, date_from, date_to)
        return self._build_attendance_xlsx(records)

    # ── Inventory PDF ──────────────────────────────────────────────────────────

    async def generate_inventory_pdf(self) -> bytes:
        equipment = await self._fetch_all_equipment()
        html = self._render_inventory_html(equipment)
        return self._html_to_pdf(html)

    async def generate_inventory_xlsx(self) -> bytes:
        equipment = await self._fetch_all_equipment()
        return self._build_inventory_xlsx(equipment)

    # ── Dashboard Summary ──────────────────────────────────────────────────────

    async def get_dashboard_summary(self) -> dict:
        # Total students
        total_students = (await self.db.execute(
            select(func.count(User.id)).where(User.role == "student", User.is_active == True)
        )).scalar_one()

        # Enrolled with face
        face_enrolled = (await self.db.execute(
            select(func.count(User.id)).where(
                User.role == "student", User.is_active == True, User.is_face_enrolled == True
            )
        )).scalar_one()

        # Today's attendance
        today = datetime.now(UTC).date()
        today_attendance = (await self.db.execute(
            select(func.count(AttendanceRecord.id)).where(
                func.date(AttendanceRecord.time_in) == today
            )
        )).scalar_one()

        # Equipment stats
        total_equipment = (await self.db.execute(
            select(func.sum(Equipment.total_quantity)).where(Equipment.is_active == True)
        )).scalar_one() or 0

        borrowed_equipment = (await self.db.execute(
            select(func.sum(Equipment.total_quantity - Equipment.available_quantity)).where(
                Equipment.is_active == True
            )
        )).scalar_one() or 0

        # Overdue transactions
        overdue_count = (await self.db.execute(
            select(func.count(BorrowTransaction.id)).where(
                BorrowTransaction.status == TransactionStatus.OVERDUE
            )
        )).scalar_one()

        return {
            "students": {
                "total": total_students,
                "face_enrolled": face_enrolled,
                "enrollment_rate": round(face_enrolled / total_students * 100, 1) if total_students else 0,
            },
            "attendance": {
                "today": today_attendance,
            },
            "equipment": {
                "total": int(total_equipment),
                "borrowed": int(borrowed_equipment),
                "available": int(total_equipment - borrowed_equipment),
            },
            "transactions": {
                "overdue": overdue_count,
            },
            "generated_at": datetime.now(UTC).isoformat(),
        }

    # ── Private Helpers ────────────────────────────────────────────────────────

    async def _fetch_attendance_records(
        self,
        sport_or_art: str | None,
        date_from: datetime | None,
        date_to: datetime | None,
    ) -> list[dict]:
        query = (
            select(AttendanceRecord, User, Session)
            .join(User, AttendanceRecord.student_id == User.id)
            .join(Session, AttendanceRecord.session_id == Session.id)
        )
        if sport_or_art:
            query = query.where(Session.sport_or_art == sport_or_art)
        if date_from:
            query = query.where(AttendanceRecord.time_in >= date_from)
        if date_to:
            query = query.where(AttendanceRecord.time_in <= date_to)
        query = query.order_by(AttendanceRecord.time_in.desc())

        result = await self.db.execute(query)
        rows = []
        for record, user, session in result.all():
            rows.append({
                "student_name": user.full_name,
                "student_id": user.student_id,
                "session_name": session.name,
                "sport_or_art": session.sport_or_art,
                "activity_type": session.activity_type.value,
                "time_in": record.time_in,
                "time_out": record.time_out,
                "duration_minutes": record.duration_minutes,
                "confidence": record.time_in_confidence,
                "is_complete": record.is_complete,
            })
        return rows

    async def _fetch_all_equipment(self) -> list[dict]:
        result = await self.db.execute(
            select(Equipment).where(Equipment.is_active == True).order_by(Equipment.category, Equipment.name)
        )
        equipment = result.scalars().all()
        return [
            {
                "name": e.name,
                "category": e.category.value,
                "condition": e.condition.value,
                "barcode": e.barcode,
                "total_quantity": e.total_quantity,
                "available_quantity": e.available_quantity,
                "borrowed_quantity": e.total_quantity - e.available_quantity,
                "storage_location": e.storage_location,
                "sport_or_art": e.sport_or_art,
            }
            for e in equipment
        ]

    def _render_attendance_html(self, records: list[dict], sport_or_art, date_from, date_to) -> str:
        rows_html = ""
        for i, r in enumerate(records):
            bg = "#EBF0F7" if i % 2 == 0 else "#FFFFFF"
            time_in = r["time_in"].strftime("%Y-%m-%d %H:%M") if r["time_in"] else "-"
            time_out = r["time_out"].strftime("%H:%M") if r["time_out"] else "-"
            duration = f"{r['duration_minutes']} min" if r["duration_minutes"] else "-"
            rows_html += f"""
            <tr style="background:{bg}">
                <td>{r['student_name']}</td>
                <td>{r['student_id'] or '-'}</td>
                <td>{r['session_name']}</td>
                <td>{r['sport_or_art'] or '-'}</td>
                <td>{r['activity_type']}</td>
                <td>{time_in}</td>
                <td>{time_out}</td>
                <td>{duration}</td>
                <td>{'✓' if r['is_complete'] else '⏳'}</td>
            </tr>"""

        filter_info = f"Sport/Art: {sport_or_art or 'All'} | Period: {date_from or 'All'} – {date_to or 'All'}"
        return f"""
        <!DOCTYPE html><html><head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; font-size: 10pt; margin: 20px; }}
            h1 {{ color: #1E3A5F; }} h2 {{ color: #666; font-size: 10pt; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
            th {{ background: #1E3A5F; color: white; padding: 6px 8px; text-align: left; font-size: 9pt; }}
            td {{ padding: 5px 8px; border-bottom: 1px solid #DDD; font-size: 9pt; }}
            .footer {{ margin-top: 20px; font-size: 8pt; color: #999; }}
        </style></head><body>
        <h1>NAAP-Villamor OSCA — Attendance Report</h1>
        <h2>{filter_info}</h2>
        <p>Total records: {len(records)} | Generated: {datetime.now(UTC).strftime('%Y-%m-%d %H:%M UTC')}</p>
        <table>
        <tr>
            <th>Student Name</th><th>Student ID</th><th>Session</th><th>Sport/Art</th>
            <th>Activity</th><th>Time In</th><th>Time Out</th><th>Duration</th><th>Complete</th>
        </tr>
        {rows_html}
        </table>
        <div class="footer">
            OSCA Attendance & Inventory Management System v2.0 — Confidential
        </div>
        </body></html>"""

    def _render_inventory_html(self, equipment: list[dict]) -> str:
        rows_html = ""
        for i, e in enumerate(equipment):
            bg = "#EBF0F7" if i % 2 == 0 else "#FFFFFF"
            rows_html += f"""
            <tr style="background:{bg}">
                <td>{e['name']}</td><td>{e['category']}</td><td>{e['condition']}</td>
                <td>{e['barcode']}</td><td>{e['total_quantity']}</td>
                <td>{e['available_quantity']}</td><td>{e['borrowed_quantity']}</td>
                <td>{e['storage_location'] or '-'}</td><td>{e['sport_or_art'] or '-'}</td>
            </tr>"""

        return f"""
        <!DOCTYPE html><html><head><meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; font-size: 10pt; margin: 20px; }}
            h1 {{ color: #1E3A5F; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
            th {{ background: #1E3A5F; color: white; padding: 6px 8px; text-align: left; }}
            td {{ padding: 5px 8px; border-bottom: 1px solid #DDD; font-size: 9pt; }}
        </style></head><body>
        <h1>NAAP-Villamor OSCA — Equipment Inventory Report</h1>
        <p>Total items: {len(equipment)} | Generated: {datetime.now(UTC).strftime('%Y-%m-%d %H:%M UTC')}</p>
        <table>
        <tr>
            <th>Equipment Name</th><th>Category</th><th>Condition</th><th>Barcode</th>
            <th>Total Qty</th><th>Available</th><th>Borrowed</th><th>Location</th><th>Sport/Art</th>
        </tr>
        {rows_html}
        </table>
        </body></html>"""

    def _html_to_pdf(self, html: str) -> bytes:
        from weasyprint import HTML
        buffer = io.BytesIO()
        HTML(string=html).write_pdf(buffer)
        return buffer.getvalue()

    def _build_attendance_xlsx(self, records: list[dict]) -> bytes:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Attendance Report"

        headers = ["Student Name", "Student ID", "Session", "Sport/Art",
                   "Activity", "Time In", "Time Out", "Duration (min)", "Complete"]
        self._write_header_row(ws, headers)

        for i, r in enumerate(records, start=2):
            row_fill = ALT_FILL if i % 2 == 0 else None
            values = [
                r["student_name"], r["student_id"], r["session_name"],
                r["sport_or_art"], r["activity_type"],
                r["time_in"], r["time_out"], r["duration_minutes"],
                "Yes" if r["is_complete"] else "No",
            ]
            for col, val in enumerate(values, start=1):
                cell = ws.cell(row=i, column=col, value=val)
                if row_fill:
                    cell.fill = row_fill

        self._auto_column_width(ws)
        buffer = io.BytesIO()
        wb.save(buffer)
        return buffer.getvalue()

    def _build_inventory_xlsx(self, equipment: list[dict]) -> bytes:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Inventory Report"

        headers = ["Equipment Name", "Category", "Condition", "Barcode",
                   "Total Qty", "Available", "Borrowed", "Location", "Sport/Art"]
        self._write_header_row(ws, headers)

        for i, e in enumerate(equipment, start=2):
            values = [
                e["name"], e["category"], e["condition"], e["barcode"],
                e["total_quantity"], e["available_quantity"], e["borrowed_quantity"],
                e["storage_location"], e["sport_or_art"],
            ]
            row_fill = ALT_FILL if i % 2 == 0 else None
            for col, val in enumerate(values, start=1):
                cell = ws.cell(row=i, column=col, value=val)
                if row_fill:
                    cell.fill = row_fill

        self._auto_column_width(ws)
        buffer = io.BytesIO()
        wb.save(buffer)
        return buffer.getvalue()

    def _write_header_row(self, ws, headers: list[str]) -> None:
        for col, header in enumerate(headers, start=1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = HEADER_FONT
            cell.fill = HEADER_FILL
            cell.alignment = Alignment(horizontal="center", vertical="center")
        ws.row_dimensions[1].height = 20

    def _auto_column_width(self, ws) -> None:
        for column in ws.columns:
            max_len = max((len(str(cell.value or "")) for cell in column), default=10)
            ws.column_dimensions[column[0].column_letter].width = min(max_len + 4, 50)
