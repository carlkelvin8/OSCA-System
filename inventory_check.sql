-- =============================================================================
-- OSCA Inventory — DBeaver Diagnostic Script
-- Run each section independently using Ctrl+Enter on the selected query
-- Database: PostgreSQL 16 (osca_db)
-- =============================================================================

-- NOTE: The backend stores the QR/barcode value in a column named "qr_code"
--       (not "barcode" as in the SQL spec). Adjust if your migration used "barcode".


-- =============================================================================
-- 1. ALL ACTIVE EQUIPMENT  (Q-36 — no filters)
-- =============================================================================
SELECT
    id,
    name,
    category,
    condition,
    qr_code,                          -- may be "barcode" in your migration
    total_quantity,
    available_quantity,
    (total_quantity - available_quantity) AS borrowed_quantity,
    storage_location,
    sport_or_art,
    is_active,
    created_at
FROM equipment
WHERE is_active = TRUE
ORDER BY name;


-- =============================================================================
-- 2. EQUIPMENT COUNT BY CATEGORY  (Q-35 aggregated)
-- =============================================================================
SELECT
    category,
    COUNT(*)                        AS item_types,
    SUM(total_quantity)             AS total_units,
    SUM(available_quantity)         AS available_units,
    SUM(total_quantity - available_quantity) AS borrowed_units
FROM equipment
WHERE is_active = TRUE
GROUP BY category
ORDER BY category;


-- =============================================================================
-- 3. EQUIPMENT AVAILABILITY SUMMARY  (Q-67 — dashboard stat)
-- =============================================================================
SELECT
    SUM(total_quantity)                         AS total_equipment,
    SUM(available_quantity)                     AS available_equipment,
    SUM(total_quantity - available_quantity)    AS borrowed_equipment,
    COUNT(*) FILTER (WHERE available_quantity = 0) AS fully_borrowed_types
FROM equipment
WHERE is_active = TRUE;


-- =============================================================================
-- 4. SEARCH EQUIPMENT BY NAME OR QR CODE  (Q-36 with search)
-- Replace 'basketball' with the name/QR you want to look up
-- =============================================================================
SELECT
    id,
    name,
    category,
    condition,
    qr_code,
    total_quantity,
    available_quantity
FROM equipment
WHERE is_active = TRUE
  AND (
      name    ILIKE '%basketball%'
   OR qr_code ILIKE '%basketball%'
  )
ORDER BY name;


-- =============================================================================
-- 5. AVAILABLE EQUIPMENT ONLY  (Q-36 with available_only filter)
-- =============================================================================
SELECT
    name,
    category,
    condition,
    qr_code,
    available_quantity,
    storage_location
FROM equipment
WHERE is_active = TRUE
  AND available_quantity > 0
ORDER BY category, name;


-- =============================================================================
-- 6. ALL BORROW TRANSACTIONS  (Q-61)
-- =============================================================================
SELECT
    bt.id,
    bt.status,
    bt.borrowed_at,
    bt.expected_return,
    bt.returned_at,
    u.first_name || ' ' || u.last_name AS instructor_name,
    u.email
FROM borrow_transactions bt
JOIN users u ON u.id = bt.instructor_id
ORDER BY bt.borrowed_at DESC
LIMIT 50;


-- =============================================================================
-- 7. ACTIVE / OVERDUE TRANSACTIONS  (Q-61 filtered)
-- =============================================================================
SELECT
    bt.id,
    bt.status,
    bt.borrowed_at,
    bt.expected_return,
    EXTRACT(DAY FROM NOW() - bt.expected_return) AS days_overdue,
    u.first_name || ' ' || u.last_name           AS instructor_name,
    u.email
FROM borrow_transactions bt
JOIN users u ON u.id = bt.instructor_id
WHERE bt.status IN ('active', 'overdue')
ORDER BY bt.expected_return ASC;


-- =============================================================================
-- 8. TRANSACTION LINE ITEMS — what was borrowed  (Q-62 + Q-63)
-- =============================================================================
SELECT
    bt.id           AS transaction_id,
    bt.status,
    bt.borrowed_at,
    e.name          AS equipment_name,
    e.category,
    e.qr_code,
    bti.quantity,
    bti.is_returned,
    bti.returned_at
FROM borrow_transaction_items bti
JOIN borrow_transactions bt ON bt.id = bti.transaction_id
JOIN equipment            e  ON e.id  = bti.equipment_id
ORDER BY bt.borrowed_at DESC;


-- =============================================================================
-- 9. OVERDUE TRANSACTIONS WITH INSTRUCTOR INFO  (Q-80)
-- =============================================================================
SELECT
    bt.id,
    bt.borrowed_at,
    bt.expected_return,
    EXTRACT(DAY FROM NOW() - bt.expected_return) AS days_overdue,
    u.email,
    u.first_name || ' ' || u.last_name AS instructor_name
FROM borrow_transactions bt
JOIN users u ON u.id = bt.instructor_id
WHERE bt.status = 'overdue'
ORDER BY bt.expected_return ASC;


-- =============================================================================
-- 10. EQUIPMENT UTILIZATION REPORT  (Q-81)
-- =============================================================================
SELECT
    e.name,
    e.category,
    e.total_quantity,
    e.total_quantity - e.available_quantity AS currently_borrowed,
    COUNT(bti.id)                           AS total_borrow_events
FROM equipment e
LEFT JOIN borrow_transaction_items bti ON bti.equipment_id = e.id
WHERE e.is_active = TRUE
GROUP BY e.id, e.name, e.category, e.total_quantity, e.available_quantity
ORDER BY total_borrow_events DESC;


-- =============================================================================
-- 11. EQUIPMENT AUDIT LOG  (Q-78 scoped to inventory actions)
-- =============================================================================
SELECT
    al.action,
    al.status,
    al.details,
    al.created_at,
    u.first_name || ' ' || u.last_name AS performed_by
FROM audit_logs al
LEFT JOIN users u ON u.id = al.user_id
WHERE al.resource_type = 'Equipment'
ORDER BY al.created_at DESC
LIMIT 100;


-- =============================================================================
-- 12. FULL INVENTORY REPORT DATA  (Q-70 — same as PDF/Excel export)
-- =============================================================================
SELECT
    e.name,
    e.description,
    e.category,
    e.condition,
    e.qr_code,
    e.total_quantity,
    e.available_quantity,
    (e.total_quantity - e.available_quantity) AS borrowed_quantity,
    e.storage_location,
    e.sport_or_art,
    e.acquisition_date,
    e.acquisition_cost,
    e.notes,
    e.created_at
FROM equipment e
WHERE e.is_active = TRUE
ORDER BY e.name;
