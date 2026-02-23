"""
Inventory endpoints: equipment CRUD, borrowing IDs, borrow/return workflow.
"""
import uuid
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import AdminOnly, CurrentUser, StaffOnly, get_db
from app.core.exceptions import ConflictError, NotFoundError
from app.models.audit import AuditLog
from app.models.inventory import (
    BorrowingID,
    BorrowTransaction,
    BorrowTransactionItem,
    Equipment,
    EquipmentCategory,
    TransactionStatus,
)
from app.models.user import User, UserRole
from app.schemas.common import MessageResponse, PaginatedResponse
from app.schemas.inventory import (
    BorrowingIDRead,
    BorrowTransactionCreate,
    BorrowTransactionRead,
    BorrowTransactionItemRead,
    EquipmentCreate,
    EquipmentRead,
    EquipmentUpdate,
    ReturnRequest,
)
from app.services.barcode_service import BarcodeService
from app.services.storage_service import StorageService

router = APIRouter()
logger = structlog.get_logger(__name__)


# ── Equipment ─────────────────────────────────────────────────────────────────

@router.post(
    "/equipment",
    response_model=EquipmentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Register new equipment (Admin)",
)
async def create_equipment(
    body: EquipmentCreate,
    current_user: AdminOnly,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EquipmentRead:
    barcode_value = BarcodeService.generate_code128_value()
    barcode_img_bytes = BarcodeService.render_code128(barcode_value)

    storage = StorageService()
    img_key = await storage.upload_barcode_image(barcode_value, barcode_img_bytes)

    equipment = Equipment(
        **body.model_dump(),
        barcode=barcode_value,
        barcode_image_key=img_key,
        available_quantity=body.total_quantity,
        created_by_id=current_user.id,
    )
    db.add(equipment)
    db.add(AuditLog(
        user_id=current_user.id,
        action="EQUIPMENT_CREATED",
        resource_type="Equipment",
        status="success",
        details={"barcode": barcode_value, "name": body.name},
    ))
    await db.commit()
    await db.refresh(equipment)
    return EquipmentRead.model_validate(equipment)


@router.get("/equipment", response_model=PaginatedResponse[EquipmentRead], summary="List equipment")
async def list_equipment(
    _user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: EquipmentCategory | None = Query(None),
    sport_or_art: str | None = Query(None),
    available_only: bool = Query(False),
    search: str | None = Query(None),
) -> PaginatedResponse[EquipmentRead]:
    query = select(Equipment).where(Equipment.is_active == True)
    if category:
        query = query.where(Equipment.category == category)
    if sport_or_art:
        query = query.where(Equipment.sport_or_art == sport_or_art)
    if available_only:
        query = query.where(Equipment.available_quantity > 0)
    if search:
        like = f"%{search}%"
        query = query.where(Equipment.name.ilike(like) | Equipment.barcode.ilike(like))

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    query = query.offset((page - 1) * page_size).limit(page_size).order_by(Equipment.name)
    equipment = (await db.execute(query)).scalars().all()

    return PaginatedResponse(
        items=[EquipmentRead.model_validate(e) for e in equipment],
        total=total, page=page, page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.get("/equipment/{equipment_id}", response_model=EquipmentRead)
async def get_equipment(
    equipment_id: uuid.UUID,
    _user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EquipmentRead:
    result = await db.execute(select(Equipment).where(Equipment.id == equipment_id))
    eq = result.scalar_one_or_none()
    if not eq:
        raise NotFoundError("Equipment", str(equipment_id))
    return EquipmentRead.model_validate(eq)


@router.get("/equipment/barcode/{barcode}", response_model=EquipmentRead, summary="Lookup by barcode scan")
async def get_equipment_by_barcode(
    barcode: str,
    _user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EquipmentRead:
    result = await db.execute(select(Equipment).where(Equipment.barcode == barcode))
    eq = result.scalar_one_or_none()
    if not eq:
        raise NotFoundError("Equipment", barcode)
    return EquipmentRead.model_validate(eq)


@router.patch("/equipment/{equipment_id}", response_model=EquipmentRead, summary="Update equipment (Admin)")
async def update_equipment(
    equipment_id: uuid.UUID,
    body: EquipmentUpdate,
    _admin: AdminOnly,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EquipmentRead:
    result = await db.execute(select(Equipment).where(Equipment.id == equipment_id))
    eq = result.scalar_one_or_none()
    if not eq:
        raise NotFoundError("Equipment", str(equipment_id))

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(eq, field, value)

    await db.commit()
    await db.refresh(eq)
    return EquipmentRead.model_validate(eq)


# ── Borrowing ID ──────────────────────────────────────────────────────────────

@router.post(
    "/borrowing-ids/{instructor_id}",
    response_model=BorrowingIDRead,
    status_code=status.HTTP_201_CREATED,
    summary="Issue a Borrowing ID card to a PE Instructor (Admin)",
)
async def issue_borrowing_id(
    instructor_id: uuid.UUID,
    _admin: AdminOnly,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> BorrowingIDRead:
    result = await db.execute(select(User).where(User.id == instructor_id))
    instructor = result.scalar_one_or_none()
    if not instructor:
        raise NotFoundError("User", str(instructor_id))
    if instructor.role != UserRole.PE_INSTRUCTOR:
        raise ConflictError("Borrowing IDs are only issued to PE Instructors")

    existing = await db.execute(select(BorrowingID).where(BorrowingID.instructor_id == instructor_id))
    if existing.scalar_one_or_none():
        raise ConflictError("Instructor already has a Borrowing ID")

    qr_value = BarcodeService.generate_qr_value(str(instructor_id))
    qr_img_bytes = BarcodeService.render_qr(qr_value)

    storage = StorageService()
    qr_key = await storage.upload_qr_image(qr_value, qr_img_bytes)

    bid = BorrowingID(
        instructor_id=instructor_id,
        qr_code=qr_value,
        qr_image_key=qr_key,
    )
    db.add(bid)
    await db.commit()
    await db.refresh(bid)

    result_schema = BorrowingIDRead.model_validate(bid)
    result_schema.instructor_name = instructor.full_name
    return result_schema


# ── Borrow / Return Workflow ───────────────────────────────────────────────────

@router.post(
    "/borrow",
    response_model=BorrowTransactionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Initiate equipment borrowing (PE Instructor)",
)
async def borrow_equipment(
    body: BorrowTransactionCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> BorrowTransactionRead:
    # Step 1: Validate Borrowing ID QR
    bid_result = await db.execute(
        select(BorrowingID).where(BorrowingID.qr_code == body.borrowing_id_qr, BorrowingID.is_active == True)
    )
    bid = bid_result.scalar_one_or_none()
    if not bid:
        raise NotFoundError("Borrowing ID", body.borrowing_id_qr)

    # Step 2: Check eligibility — no active overdue transactions
    overdue_check = await db.execute(
        select(BorrowTransaction).where(
            BorrowTransaction.instructor_id == bid.instructor_id,
            BorrowTransaction.status.in_([TransactionStatus.ACTIVE, TransactionStatus.OVERDUE]),
        )
    )
    if overdue_check.scalar_one_or_none():
        raise ConflictError("Instructor has an active or overdue borrow transaction. Return items first.")

    # Step 3: Validate and reserve equipment
    transaction = BorrowTransaction(
        borrowing_id_record_id=bid.id,
        instructor_id=bid.instructor_id,
        expected_return=body.expected_return,
        notes=body.notes,
        processed_by_id=current_user.id,
    )
    db.add(transaction)

    for item_req in body.items:
        eq_result = await db.execute(
            select(Equipment).where(Equipment.barcode == item_req.equipment_barcode, Equipment.is_active == True)
        )
        eq = eq_result.scalar_one_or_none()
        if not eq:
            raise NotFoundError("Equipment barcode", item_req.equipment_barcode)
        if eq.available_quantity < item_req.quantity:
            raise ConflictError(f"Insufficient quantity for {eq.name}. Available: {eq.available_quantity}")

        eq.available_quantity -= item_req.quantity
        tx_item = BorrowTransactionItem(
            transaction=transaction,
            equipment_id=eq.id,
            quantity=item_req.quantity,
        )
        db.add(tx_item)

    db.add(AuditLog(
        user_id=current_user.id,
        action="EQUIPMENT_BORROWED",
        resource_type="BorrowTransaction",
        status="success",
        details={"instructor_id": str(bid.instructor_id), "items_count": len(body.items)},
    ))
    await db.commit()
    await db.refresh(transaction)
    return await _build_transaction_read(transaction, db)


@router.post(
    "/return",
    response_model=BorrowTransactionRead,
    summary="Return borrowed equipment (PE Instructor)",
)
async def return_equipment(
    body: ReturnRequest,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> BorrowTransactionRead:
    bid_result = await db.execute(
        select(BorrowingID).where(BorrowingID.qr_code == body.borrowing_id_qr)
    )
    bid = bid_result.scalar_one_or_none()
    if not bid:
        raise NotFoundError("Borrowing ID", body.borrowing_id_qr)

    tx_result = await db.execute(
        select(BorrowTransaction).where(
            BorrowTransaction.borrowing_id_record_id == bid.id,
            BorrowTransaction.status.in_([TransactionStatus.ACTIVE, TransactionStatus.OVERDUE]),
        )
    )
    transaction = tx_result.scalar_one_or_none()
    if not transaction:
        raise NotFoundError("Active transaction for this Borrowing ID")

    from datetime import UTC, datetime
    now = datetime.now(UTC)

    for item_req in body.items:
        eq_result = await db.execute(
            select(Equipment).where(Equipment.barcode == item_req.equipment_barcode)
        )
        eq = eq_result.scalar_one_or_none()
        if not eq:
            raise NotFoundError("Equipment barcode", item_req.equipment_barcode)

        tx_item_result = await db.execute(
            select(BorrowTransactionItem).where(
                BorrowTransactionItem.transaction_id == transaction.id,
                BorrowTransactionItem.equipment_id == eq.id,
                BorrowTransactionItem.is_returned == False,
            )
        )
        tx_item = tx_item_result.scalar_one_or_none()
        if not tx_item:
            raise NotFoundError("Transaction item", item_req.equipment_barcode)

        tx_item.is_returned = True
        tx_item.returned_at = now
        eq.available_quantity += tx_item.quantity

    # Check if all items returned
    pending_result = await db.execute(
        select(func.count(BorrowTransactionItem.id)).where(
            BorrowTransactionItem.transaction_id == transaction.id,
            BorrowTransactionItem.is_returned == False,
        )
    )
    pending_count = pending_result.scalar_one()
    transaction.status = (
        TransactionStatus.RETURNED if pending_count == 0 else TransactionStatus.PARTIAL_RETURN
    )
    if pending_count == 0:
        transaction.returned_at = now

    db.add(AuditLog(
        user_id=current_user.id,
        action="EQUIPMENT_RETURNED",
        resource_type="BorrowTransaction",
        resource_id=str(transaction.id),
        status="success",
    ))
    await db.commit()
    await db.refresh(transaction)
    return await _build_transaction_read(transaction, db)


@router.get("/transactions", response_model=PaginatedResponse[BorrowTransactionRead])
async def list_transactions(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: TransactionStatus | None = Query(None, alias="status"),
) -> PaginatedResponse[BorrowTransactionRead]:
    query = select(BorrowTransaction)
    if current_user.role == UserRole.PE_INSTRUCTOR:
        query = query.where(BorrowTransaction.instructor_id == current_user.id)
    if status_filter:
        query = query.where(BorrowTransaction.status == status_filter)

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    query = query.offset((page - 1) * page_size).limit(page_size).order_by(BorrowTransaction.borrowed_at.desc())
    transactions = (await db.execute(query)).scalars().all()

    items = [await _build_transaction_read(tx, db) for tx in transactions]
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size,
                             pages=(total + page_size - 1) // page_size)


async def _build_transaction_read(transaction: BorrowTransaction, db: AsyncSession) -> BorrowTransactionRead:
    """Helper: build a BorrowTransactionRead with nested items."""
    items_result = await db.execute(
        select(BorrowTransactionItem).where(BorrowTransactionItem.transaction_id == transaction.id)
    )
    items = items_result.scalars().all()

    item_reads = []
    for item in items:
        eq = await db.get(Equipment, item.equipment_id)
        ir = BorrowTransactionItemRead.model_validate(item)
        if eq:
            ir.equipment_name = eq.name
            ir.equipment_barcode = eq.barcode
        item_reads.append(ir)

    instructor = await db.get(User, transaction.instructor_id)
    tr = BorrowTransactionRead.model_validate(transaction)
    tr.instructor_name = instructor.full_name if instructor else ""
    tr.items = item_reads
    return tr
