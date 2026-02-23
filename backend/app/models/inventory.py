"""
Inventory models: Equipment, BorrowingID, BorrowTransaction.
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class EquipmentCategory(str, enum.Enum):
    BALLS = "balls"
    RACKETS = "rackets"
    NETS = "nets"
    PROTECTIVE_GEAR = "protective_gear"
    UNIFORMS = "uniforms"
    TRAINING_AIDS = "training_aids"
    ELECTRONIC = "electronic"
    CULTURAL = "cultural"           # Musical instruments, costumes, etc.
    STORAGE_UNIT = "storage_unit"   # Non-labelable → barcode on container
    OTHER = "other"


class EquipmentCondition(str, enum.Enum):
    NEW = "new"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"
    FOR_REPAIR = "for_repair"
    CONDEMNED = "condemned"


class TransactionStatus(str, enum.Enum):
    ACTIVE = "active"           # Currently borrowed
    RETURNED = "returned"       # All items returned
    OVERDUE = "overdue"         # Past expected_return and not returned
    PARTIAL_RETURN = "partial_return"  # Some items returned


class Equipment(Base):
    """
    Physical equipment managed by OSCA.
    Each piece gets a Code-128 barcode printed via Zebra GK420d.
    """
    __tablename__ = "equipment"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[EquipmentCategory] = mapped_column(
        Enum(EquipmentCategory, name="equipment_category_enum"), nullable=False
    )
    condition: Mapped[EquipmentCondition] = mapped_column(
        Enum(EquipmentCondition, name="equipment_condition_enum"),
        nullable=False,
        default=EquipmentCondition.GOOD,
    )

    # Barcode (Code-128 standard)
    barcode: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    barcode_image_key: Mapped[str | None] = mapped_column(
        String(500), nullable=True,
        comment="MinIO object key for printed barcode label image"
    )

    # Quantity tracking
    total_quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    available_quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Location
    storage_location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    sport_or_art: Mapped[str | None] = mapped_column(
        String(100), nullable=True,
        comment="Which sport/art this equipment belongs to"
    )

    # Metadata
    acquisition_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    acquisition_cost: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    # Relationships
    transaction_items: Mapped[list["BorrowTransactionItem"]] = relationship(
        "BorrowTransactionItem", back_populates="equipment"
    )
    created_by: Mapped["User"] = relationship("User", foreign_keys=[created_by_id])  # noqa: F821

    __table_args__ = (
        Index("ix_equipment_category", "category"),
        Index("ix_equipment_sport", "sport_or_art"),
        Index("ix_equipment_active", "is_active"),
    )

    def __repr__(self) -> str:
        return f"<Equipment {self.barcode}: {self.name}>"


class BorrowingID(Base):
    """
    Physical QR Code card issued to PE Instructors.
    Printed via Zebra GK420d on destructible vinyl labels.
    """
    __tablename__ = "borrowing_ids"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    instructor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, unique=True
    )
    qr_code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    qr_image_key: Mapped[str | None] = mapped_column(
        String(500), nullable=True,
        comment="MinIO key for the printable QR Code image"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    instructor: Mapped["User"] = relationship("User", back_populates="borrowing_id")  # noqa: F821
    transactions: Mapped[list["BorrowTransaction"]] = relationship(
        "BorrowTransaction", back_populates="borrowing_id_record"
    )


class BorrowTransaction(Base):
    """
    A borrowing session initiated by a PE Instructor.
    One transaction can include multiple equipment items.
    """
    __tablename__ = "borrow_transactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # PE Instructor who borrowed
    borrowing_id_record_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("borrowing_ids.id"), nullable=False
    )
    instructor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    # Who processed the transaction
    processed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )

    status: Mapped[TransactionStatus] = mapped_column(
        Enum(TransactionStatus, name="transaction_status_enum"),
        nullable=False,
        default=TransactionStatus.ACTIVE,
    )

    borrowed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    expected_return: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    returned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Overdue notification tracking
    overdue_notified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    overdue_notified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    borrowing_id_record: Mapped["BorrowingID"] = relationship(
        "BorrowingID", back_populates="transactions"
    )
    instructor: Mapped["User"] = relationship("User", foreign_keys=[instructor_id])  # noqa: F821
    processed_by: Mapped["User | None"] = relationship(  # noqa: F821
        "User", foreign_keys=[processed_by_id]
    )
    items: Mapped[list["BorrowTransactionItem"]] = relationship(
        "BorrowTransactionItem", back_populates="transaction", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_transactions_instructor", "instructor_id"),
        Index("ix_transactions_status", "status"),
        Index("ix_transactions_expected_return", "expected_return"),
    )


class BorrowTransactionItem(Base):
    """Line item: one equipment unit in one borrow transaction."""
    __tablename__ = "borrow_transaction_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("borrow_transactions.id", ondelete="CASCADE"),
        nullable=False
    )
    equipment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("equipment.id"), nullable=False
    )
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_returned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    returned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    return_condition: Mapped[EquipmentCondition | None] = mapped_column(
        Enum(EquipmentCondition, name="equipment_condition_enum"), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Relationships
    transaction: Mapped["BorrowTransaction"] = relationship(
        "BorrowTransaction", back_populates="items"
    )
    equipment: Mapped["Equipment"] = relationship("Equipment", back_populates="transaction_items")

    __table_args__ = (
        Index("ix_transaction_items_transaction", "transaction_id"),
        Index("ix_transaction_items_equipment", "equipment_id"),
    )
