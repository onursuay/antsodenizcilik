-- =============================================================
-- ANTSO DENİZCİLİK — REPORTING & MANIFEST FUNCTIONS
-- 006_reporting_functions.sql
-- =============================================================


-- =============================================================
-- fn_passenger_manifest
-- Returns one row per passenger line for the voyage.
-- Partial cancellation awareness via cancellation_records.
-- Read-only.  No locks, no mutations.
-- =============================================================

CREATE OR REPLACE FUNCTION fn_passenger_manifest(p_voyage_id UUID)
RETURNS TABLE(
    booking_id              UUID,
    user_id                 UUID,
    booking_status          booking_status,
    confirmed_at            TIMESTAMPTZ,
    checked_in_at           TIMESTAMPTZ,
    booking_passenger_id    UUID,
    full_name               TEXT,
    date_of_birth           DATE,
    document_type           TEXT,
    document_number         TEXT,
    nationality             TEXT,
    is_line_cancelled       BOOLEAN,
    is_booking_cancelled    BOOLEAN
)
LANGUAGE sql STABLE AS $$
    SELECT
        b.booking_id,
        b.user_id,
        b.status,
        b.confirmed_at,
        b.checked_in_at,
        bp.booking_passenger_id,
        bp.full_name,
        bp.date_of_birth,
        bp.document_type,
        bp.document_number,
        bp.nationality,
        (bp.cancelled_at IS NOT NULL),
        (b.status = 'CANCELLED')
    FROM   bookings            b
    JOIN   booking_passengers  bp ON bp.booking_id = b.booking_id
    WHERE  b.voyage_id = p_voyage_id
    ORDER  BY
        (bp.cancelled_at IS NOT NULL) ASC,
        (b.status = 'CHECKED_IN') DESC,
        b.confirmed_at ASC,
        b.booking_id ASC,
        bp.booking_passenger_id ASC;
$$;


-- =============================================================
-- fn_vehicle_manifest
-- Returns one row per vehicle line for the voyage.
-- Partial cancellation awareness via cancellation_records.
-- Read-only.  No locks, no mutations.
-- =============================================================

CREATE OR REPLACE FUNCTION fn_vehicle_manifest(p_voyage_id UUID)
RETURNS TABLE(
    booking_id              UUID,
    user_id                 UUID,
    booking_status          booking_status,
    confirmed_at            TIMESTAMPTZ,
    checked_in_at           TIMESTAMPTZ,
    booking_vehicle_id      UUID,
    plate_number            TEXT,
    vehicle_type            TEXT,
    length_cm               INTEGER,
    width_cm                INTEGER,
    height_cm               INTEGER,
    weight_kg               INTEGER,
    lane_meters_allocated   NUMERIC(10, 2),
    m2_allocated            NUMERIC(10, 2),
    is_line_cancelled       BOOLEAN
)
LANGUAGE sql STABLE AS $$
    SELECT
        b.booking_id,
        b.user_id,
        b.status,
        b.confirmed_at,
        b.checked_in_at,
        bv.booking_vehicle_id,
        bv.plate_number,
        bv.vehicle_type,
        bv.length_cm,
        bv.width_cm,
        bv.height_cm,
        bv.weight_kg,
        bv.lane_meters_allocated,
        bv.m2_allocated,
        (bv.cancelled_at IS NOT NULL)
    FROM   bookings           b
    JOIN   booking_vehicles   bv ON bv.booking_id = b.booking_id
    WHERE  b.voyage_id = p_voyage_id
    ORDER  BY
        (bv.cancelled_at IS NOT NULL) ASC,
        (b.status = 'CHECKED_IN') DESC,
        b.confirmed_at ASC,
        b.booking_id ASC,
        bv.booking_vehicle_id ASC;
$$;


-- =============================================================
-- fn_revenue_summary
-- Returns exactly one row for the voyage.
-- Revenue authority: payments + refund_records.
-- Read-only.  No locks, no mutations.
-- =============================================================

CREATE OR REPLACE FUNCTION fn_revenue_summary(p_voyage_id UUID)
RETURNS TABLE(
    voyage_id                   UUID,
    confirmed_booking_count     BIGINT,
    cancelled_booking_count     BIGINT,
    checked_in_booking_count    BIGINT,
    gross_captured_kurus        BIGINT,
    total_refunded_kurus        BIGINT,
    net_realized_kurus          BIGINT,
    open_refund_liability_kurus BIGINT,
    unknown_payment_count       BIGINT,
    failed_payment_count        BIGINT
)
LANGUAGE sql STABLE AS $$
    WITH booking_counts AS (
        SELECT
            COALESCE(SUM(CASE WHEN b.status = 'CONFIRMED'  THEN 1 ELSE 0 END), 0) AS confirmed,
            COALESCE(SUM(CASE WHEN b.status = 'CANCELLED'  THEN 1 ELSE 0 END), 0) AS cancelled,
            COALESCE(SUM(CASE WHEN b.status = 'CHECKED_IN' THEN 1 ELSE 0 END), 0) AS checked_in
        FROM bookings b
        WHERE b.voyage_id = p_voyage_id
    ),
    payment_agg AS (
        SELECT
            COALESCE(SUM(CASE WHEN p.status = 'SETTLED' THEN p.amount_kurus ELSE 0 END), 0) AS gross_captured,
            COALESCE(SUM(CASE WHEN p.status = 'UNKNOWN' THEN 1              ELSE 0 END), 0) AS unknown_count,
            COALESCE(SUM(CASE WHEN p.status = 'FAILED'  THEN 1              ELSE 0 END), 0) AS failed_count
        FROM payments p
        JOIN holds    h ON h.hold_id = p.hold_id
        WHERE h.voyage_id = p_voyage_id
    ),
    refund_agg AS (
        SELECT
            COALESCE(SUM(CASE WHEN rr.status = 'CONFIRMED'
                              THEN rr.amount_kurus ELSE 0 END), 0) AS refunded,
            COALESCE(SUM(CASE WHEN rr.status IN ('QUEUED', 'SUBMITTED', 'MANUAL_REVIEW')
                              THEN rr.amount_kurus ELSE 0 END), 0) AS liability
        FROM refund_records rr
        JOIN bookings       b ON b.booking_id = rr.booking_id
        WHERE b.voyage_id = p_voyage_id
    )
    SELECT
        p_voyage_id,
        bc.confirmed,
        bc.cancelled,
        bc.checked_in,
        pa.gross_captured,
        ra.refunded,
        pa.gross_captured - ra.refunded,
        ra.liability,
        pa.unknown_count,
        pa.failed_count
    FROM booking_counts bc,
         payment_agg    pa,
         refund_agg     ra;
$$;


-- =============================================================
-- fn_ops_queue_summary
-- Returns one row per open issue_type.
-- Read-only.  No locks, no mutations.
-- =============================================================

CREATE OR REPLACE FUNCTION fn_ops_queue_summary()
RETURNS TABLE(
    issue_type      ops_issue_type,
    open_count      BIGINT,
    oldest_open_at  TIMESTAMPTZ,
    newest_open_at  TIMESTAMPTZ
)
LANGUAGE sql STABLE AS $$
    SELECT
        orq.issue_type,
        COUNT(*)            AS open_count,
        MIN(orq.created_at) AS oldest_open_at,
        MAX(orq.created_at) AS newest_open_at
    FROM ops_review_queue orq
    WHERE orq.status = 'OPEN'
    GROUP BY orq.issue_type
    ORDER BY orq.issue_type ASC;
$$;
