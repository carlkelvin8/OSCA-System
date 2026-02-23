"""SQLAlchemy models — import all here so Alembic can discover them."""
from app.models.user import User, UserRole
from app.models.attendance import (
    Session,
    AttendanceRecord,
    FaceEmbedding,
    ScanAttempt,
)
from app.models.inventory import (
    Equipment,
    EquipmentCategory,
    EquipmentCondition,
    BorrowingID,
    BorrowTransaction,
    BorrowTransactionItem,
    TransactionStatus,
)
from app.models.audit import AuditLog

__all__ = [
    "User", "UserRole",
    "Session", "AttendanceRecord", "FaceEmbedding", "ScanAttempt",
    "Equipment", "EquipmentCategory", "EquipmentCondition",
    "BorrowingID", "BorrowTransaction", "BorrowTransactionItem", "TransactionStatus",
    "AuditLog",
]
