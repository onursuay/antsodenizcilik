-- =============================================================
-- ANTSO DENİZCİLİK — VOYAGE MANAGEMENT & OPS FUNCTIONS
-- 005_voyage_management_functions.sql
-- =============================================================


-- =============================================================
-- fn_open_voyage
-- DRAFT  → OPEN
-- Idempotent if already OPEN.
-- =============================================================

CREATE OR REPLACE FUNCTION fn_open_voyage(p_voyage_id UUID)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    v_status        voyage_status;
    v_departure_utc TIMESTAMPTZ;
    v_vessel_id     UUID;
BEGIN
    SELECT status, departure_utc, vessel_id
    INTO   v_status, v_departure_utc, v_vessel_id
    FROM   voyages
    WHERE  voyage_id = p_voyage_id
    FOR UPDATE NOWAIT;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'voyage % not found', p_voyage_id
            USING ERRCODE = 'P0002';
    END IF;

    IF v_status = 'OPEN' THEN
        RETURN;
    END IF;

    IF v_status != 'DRAFT' THEN
        RAISE EXCEPTION
            'voyage % cannot transition to OPEN from status %',
            p_voyage_id, v_status
            USING ERRCODE = 'P0001';
    END IF;

    IF v_departure_utc <= clock_timestamp() THEN
        RAISE EXCEPTION
            'voyage % departure_utc % is not in the future; cannot open',
            p_voyage_id, v_departure_utc
            USING ERRCODE = 'P0001';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM   voyage_capacity_counters
        WHERE  voyage_id = p_voyage_id
    ) THEN
        RAISE EXCEPTION
            'voyage % is missing voyage_capacity_counters row; cannot open',
            p_voyage_id
            USING ERRCODE = 'P0001';
    END IF;

    -- Every cabin type defined for the vessel must have a corresponding
    -- voyage_cabin_inventory row with total_count > 0.
    -- Voyages on vessels with no cabin types pass vacuously.
    IF EXISTS (
        SELECT 1
        FROM   vessel_cabin_types vct
        WHERE  vct.vessel_id = v_vessel_id
        AND    NOT EXISTS (
            SELECT 1
            FROM   voyage_cabin_inventory vci
            WHERE  vci.voyage_id     = p_voyage_id
            AND    vci.cabin_type_id = vct.cabin_type_id
            AND    vci.total_count   > 0
        )
    ) THEN
        RAISE EXCEPTION
            'voyage % has vessel cabin types without a valid voyage_cabin_inventory row '
            '(total_count > 0 required for each); cannot open',
            p_voyage_id
            USING ERRCODE = 'P0001';
    END IF;

    UPDATE voyages
    SET    status = 'OPEN'
    WHERE  voyage_id = p_voyage_id;
END;
$$;


-- =============================================================
-- fn_close_voyage
-- OPEN → CLOSED
-- Sets bookings_frozen_at = now() on first call only.
-- Idempotent if already CLOSED.
-- =============================================================

CREATE OR REPLACE FUNCTION fn_close_voyage(p_voyage_id UUID)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    v_status voyage_status;
BEGIN
    SELECT status
    INTO   v_status
    FROM   voyages
    WHERE  voyage_id = p_voyage_id
    FOR UPDATE NOWAIT;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'voyage % not found', p_voyage_id
            USING ERRCODE = 'P0002';
    END IF;

    IF v_status = 'CLOSED' THEN
        RETURN;
    END IF;

    IF v_status != 'OPEN' THEN
        RAISE EXCEPTION
            'voyage % cannot transition to CLOSED from %',
            p_voyage_id, v_status
            USING ERRCODE = 'P0001';
    END IF;

    UPDATE voyages
    SET
        status             = 'CLOSED',
        bookings_frozen_at = COALESCE(bookings_frozen_at, clock_timestamp())
    WHERE  voyage_id = p_voyage_id;
END;
$$;


-- =============================================================
-- fn_depart_voyage
-- CLOSED → DEPARTED  (OPEN is rejected; caller must fn_close_voyage first)
-- Idempotent if already DEPARTED.
--
-- Pre-departure steps:
--   1. Block if any OPEN RECONCILIATION_FAILURE ops entry exists.
--   2. Attempt fn_expire_hold for every past-TTL ACTIVE hold.
--      fn_expire_hold handles PENDING/UNKNOWN payments internally
--      (inserts PAYMENT_UNKNOWN ops entry, does not release capacity).
--   3. Reject if any ACTIVE hold remains whose payment is not UNKNOWN.
--      UNKNOWN-payment holds represent gateway-unresolved in-flight
--      payments; operations must reconcile them post-departure.
-- =============================================================

CREATE OR REPLACE FUNCTION fn_depart_voyage(p_voyage_id UUID)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    v_status  voyage_status;
    v_hold_id UUID;
BEGIN
    SELECT status
    INTO   v_status
    FROM   voyages
    WHERE  voyage_id = p_voyage_id
    FOR UPDATE NOWAIT;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'voyage % not found', p_voyage_id
            USING ERRCODE = 'P0002';
    END IF;

    IF v_status = 'DEPARTED' THEN
        RETURN;
    END IF;

    IF v_status = 'OPEN' THEN
        RAISE EXCEPTION
            'voyage % is OPEN; call fn_close_voyage before departing',
            p_voyage_id
            USING ERRCODE = 'P0001';
    END IF;

    IF v_status != 'CLOSED' THEN
        RAISE EXCEPTION
            'voyage % cannot transition to DEPARTED from %',
            p_voyage_id, v_status
            USING ERRCODE = 'P0001';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM   ops_review_queue
        WHERE  voyage_id  = p_voyage_id
        AND    issue_type = 'RECONCILIATION_FAILURE'
        AND    status     = 'OPEN'
    ) THEN
        RAISE EXCEPTION
            'voyage % has an open RECONCILIATION_FAILURE ops entry; '
            'resolve ledger corruption before departing',
            p_voyage_id
            USING ERRCODE = 'P0001';
    END IF;

    -- Attempt to expire every past-TTL ACTIVE hold.
    -- NOWAIT failures (concurrent capacity transaction) are silently skipped;
    -- the subsequent blocking check enforces correctness.
    FOR v_hold_id IN
        SELECT h.hold_id
        FROM   holds h
        WHERE  h.voyage_id  = p_voyage_id
        AND    h.status     = 'ACTIVE'
        AND    h.expires_at < clock_timestamp()
        ORDER  BY h.expires_at ASC
    LOOP
        BEGIN
            PERFORM fn_expire_hold(v_hold_id);
        EXCEPTION
            WHEN lock_not_available THEN NULL;
            WHEN OTHERS THEN
                RAISE WARNING
                    'fn_depart_voyage: fn_expire_hold(%) failed with SQLSTATE % — %',
                    v_hold_id, SQLSTATE, SQLERRM;
        END;
    END LOOP;

    -- After expiry attempts: any remaining ACTIVE hold whose payment is
    -- not UNKNOWN blocks departure.  UNKNOWN-payment holds are allowed
    -- because their capacity stays reserved and ops resolves them later.
    IF EXISTS (
        SELECT 1
        FROM   holds    h
        LEFT JOIN payments p ON p.hold_id = h.hold_id
        WHERE  h.voyage_id = p_voyage_id
        AND    h.status    = 'ACTIVE'
        AND    (p.payment_id IS NULL OR p.status != 'UNKNOWN')
    ) THEN
        RAISE EXCEPTION
            'voyage % has ACTIVE holds with non-ambiguous payment status; '
            'resolve or expire all such holds before departure',
            p_voyage_id
            USING ERRCODE = 'P0001';
    END IF;

    UPDATE voyages
    SET    status = 'DEPARTED'
    WHERE  voyage_id = p_voyage_id;
END;
$$;


-- =============================================================
-- fn_cancel_voyage
-- DRAFT | OPEN | CLOSED → CANCELLED
-- Idempotent if already CANCELLED.
-- Rejects if DEPARTED.
-- Rejects if OPEN or CLOSED and any CONFIRMED or CHECKED_IN
-- bookings exist; caller must cancel all bookings first.
-- =============================================================

CREATE OR REPLACE FUNCTION fn_cancel_voyage(p_voyage_id UUID)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    v_status voyage_status;
BEGIN
    SELECT status
    INTO   v_status
    FROM   voyages
    WHERE  voyage_id = p_voyage_id
    FOR UPDATE NOWAIT;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'voyage % not found', p_voyage_id
            USING ERRCODE = 'P0002';
    END IF;

    IF v_status = 'CANCELLED' THEN
        RETURN;
    END IF;

    IF v_status = 'DEPARTED' THEN
        RAISE EXCEPTION
            'voyage % is DEPARTED; a departed voyage cannot be cancelled',
            p_voyage_id
            USING ERRCODE = 'P0001';
    END IF;

    IF v_status IN ('OPEN', 'CLOSED') THEN
        -- Acquire VCC lock before the booking gate check to serialize with
        -- fn_confirm_booking_from_settled_payment and all other VCC-mutating
        -- functions.  Without this lock the EXISTS check and the UPDATE below
        -- are non-atomic under READ COMMITTED.
        PERFORM 1
        FROM    voyage_capacity_counters
        WHERE   voyage_id = p_voyage_id
        FOR UPDATE NOWAIT;

        IF NOT FOUND THEN
            RAISE EXCEPTION
                'voyage % is missing voyage_capacity_counters row',
                p_voyage_id
                USING ERRCODE = 'P0002';
        END IF;

        IF EXISTS (
            SELECT 1
            FROM   bookings b
            JOIN   holds    h ON h.hold_id    = b.hold_id
            WHERE  h.voyage_id = p_voyage_id
            AND    b.status IN ('CONFIRMED', 'CHECKED_IN')
        ) THEN
            RAISE EXCEPTION
                'voyage % has CONFIRMED or CHECKED_IN bookings; '
                'cancel all bookings via fn_cancel_booking before cancelling the voyage',
                p_voyage_id
                USING ERRCODE = 'P0001';
        END IF;
    END IF;

    UPDATE voyages
    SET    status = 'CANCELLED'
    WHERE  voyage_id = p_voyage_id;
END;
$$;


-- =============================================================
-- fn_sweep_expired_holds
-- Batch entry point for the hold expiry worker.
--
-- Selects up to p_batch_limit ACTIVE holds past their TTL,
-- ordered by expires_at ASC (oldest first).
--
-- Per-hold classification (UNKNOWN-payment holds excluded from cursor):
--   PENDING payment  → call fn_expire_hold (which creates a
--                       PAYMENT_UNKNOWN ops entry and returns
--                       without expiring); then transition
--                       payment PENDING → UNKNOWN so the
--                       reconciliation worker can poll the
--                       gateway for an authoritative outcome.
--                       Counted in skipped_payment_ambiguous_count.
--   No payment or terminal payment (SETTLED / FAILED) →
--                       call fn_expire_hold; capacity released,
--                       hold marked EXPIRED.
--                       Counted in expired_count.
--
-- Per-hold isolation via BEGIN/EXCEPTION (savepoint).
-- 55P03 (lock_not_available) → skipped_locked_count (hold or payment row locked).
-- Any other exception       → error_count; sweep continues.
-- =============================================================

CREATE OR REPLACE FUNCTION fn_sweep_expired_holds(p_batch_limit INTEGER DEFAULT 50)
RETURNS TABLE(
    scanned_count                   INTEGER,
    expired_count                   INTEGER,
    skipped_locked_count            INTEGER,
    skipped_payment_ambiguous_count INTEGER,
    error_count                     INTEGER
)
LANGUAGE plpgsql AS $$
DECLARE
    v_hold_id        UUID;
    v_payment_status payment_status;
    v_scanned        INTEGER := 0;
    v_expired        INTEGER := 0;
    v_locked         INTEGER := 0;
    v_ambiguous      INTEGER := 0;
    v_errors         INTEGER := 0;
BEGIN
    IF p_batch_limit < 1 OR p_batch_limit > 50 THEN
        RAISE EXCEPTION
            'p_batch_limit must be between 1 and 50, got %', p_batch_limit
            USING ERRCODE = 'P0001';
    END IF;

    FOR v_hold_id, v_payment_status IN
        SELECT h.hold_id, p.status
        FROM   holds    h
        LEFT JOIN payments p ON p.hold_id = h.hold_id
        WHERE  h.status     = 'ACTIVE'
        AND    h.expires_at < clock_timestamp()
        AND    (p.status IS NULL OR p.status != 'UNKNOWN')
        ORDER  BY h.expires_at ASC
        LIMIT  p_batch_limit
    LOOP
        v_scanned := v_scanned + 1;

        BEGIN
            PERFORM fn_expire_hold(v_hold_id);

            IF v_payment_status = 'PENDING' THEN
                -- fn_expire_hold created a PAYMENT_UNKNOWN ops entry and returned
                -- without expiring the hold (capacity stays reserved).
                -- Acquire payment row lock with NOWAIT before transitioning
                -- PENDING → UNKNOWN.  A locked row (concurrent webhook) raises
                -- lock_not_available, which rolls back this savepoint (including
                -- the ops entry) and increments skipped_locked_count.
                -- The hold remains ACTIVE/PENDING and is re-processed next sweep.
                PERFORM 1
                FROM    payments
                WHERE   hold_id = v_hold_id
                AND     status  = 'PENDING'
                FOR UPDATE NOWAIT;

                UPDATE payments
                SET    status = 'UNKNOWN'
                WHERE  hold_id = v_hold_id
                AND    status  = 'PENDING';

                v_ambiguous := v_ambiguous + 1;
            ELSE
                v_expired := v_expired + 1;
            END IF;

        EXCEPTION
            WHEN lock_not_available THEN
                v_locked := v_locked + 1;
            WHEN OTHERS THEN
                v_errors := v_errors + 1;
        END;
    END LOOP;

    RETURN QUERY
    SELECT v_scanned, v_expired, v_locked, v_ambiguous, v_errors;
END;
$$;


-- =============================================================
-- fn_resolve_ops_review
-- OPEN → RESOLVED
-- Idempotent if already RESOLVED with identical inputs.
-- Rejects illegal source states (ESCALATED, or any future state).
-- Does not implement ESCALATED resolution; that is a separate
-- administrative operation.
-- =============================================================

CREATE OR REPLACE FUNCTION fn_resolve_ops_review(
    p_review_id         UUID,
    p_resolution_action TEXT,
    p_resolved_by       TEXT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    v_status            ops_review_status;
    v_resolution_action TEXT;
    v_resolved_by       TEXT;
BEGIN
    IF p_resolution_action IS NULL OR trim(p_resolution_action) = '' THEN
        RAISE EXCEPTION 'p_resolution_action must be a non-empty string'
            USING ERRCODE = 'P0001';
    END IF;

    IF p_resolved_by IS NULL OR trim(p_resolved_by) = '' THEN
        RAISE EXCEPTION 'p_resolved_by must be a non-empty string'
            USING ERRCODE = 'P0001';
    END IF;

    SELECT status, resolution_action, resolved_by
    INTO   v_status, v_resolution_action, v_resolved_by
    FROM   ops_review_queue
    WHERE  review_id = p_review_id
    FOR UPDATE NOWAIT;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ops_review_queue entry % not found', p_review_id
            USING ERRCODE = 'P0002';
    END IF;

    IF v_status = 'RESOLVED' THEN
        IF v_resolution_action IS DISTINCT FROM p_resolution_action OR
           v_resolved_by       IS DISTINCT FROM p_resolved_by
        THEN
            RAISE EXCEPTION
                'ops entry % is already RESOLVED with different parameters '
                '(existing_action=%, existing_by=%)',
                p_review_id, v_resolution_action, v_resolved_by
                USING ERRCODE = 'P0001';
        END IF;
        RETURN;
    END IF;

    IF v_status != 'OPEN' THEN
        RAISE EXCEPTION
            'ops entry % cannot be resolved from status %',
            p_review_id, v_status
            USING ERRCODE = 'P0001';
    END IF;

    UPDATE ops_review_queue
    SET
        status            = 'RESOLVED',
        resolved_at       = clock_timestamp(),
        resolution_action = p_resolution_action,
        resolved_by       = p_resolved_by
    WHERE  review_id = p_review_id;
END;
$$;
