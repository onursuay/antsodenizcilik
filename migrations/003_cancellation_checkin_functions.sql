-- =============================================================
-- ANTSO DENİZCİLİK — CANCELLATION / REFUND / CHECK-IN FUNCTIONS
-- 003_cancellation_checkin_functions.sql
-- =============================================================


-- =============================================================
-- SCHEMA PATCHES
-- booking_passengers / booking_vehicles / booking_cabins lack a
-- per-row cancellation marker required by partial cancellation
-- logic.  The cancelled_at column is NULL = active, non-NULL =
-- cancelled.  Partial indexes support efficient aggregation of
-- remaining active items.
-- =============================================================

ALTER TABLE booking_passengers
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

ALTER TABLE booking_vehicles
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

ALTER TABLE booking_cabins
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bp_booking_active
    ON booking_passengers (booking_id)
    WHERE cancelled_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bv_booking_active
    ON booking_vehicles (booking_id)
    WHERE cancelled_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bc_booking_active
    ON booking_cabins (booking_id)
    WHERE cancelled_at IS NULL;


-- =============================================================
-- fn_cancel_booking
-- Atomically cancels a booking (FULL or PARTIAL) and queues a
-- refund.
--
-- Lock order: voyage_capacity_counters
--             → voyage_cabin_inventory (if cabin capacity changes)
--             → payments
--             → bookings
--
-- For PARTIAL CABIN the cabin_type_id is pre-read (unlocked)
-- solely to determine which inventory row to lock.  The
-- authoritative cancelled_at check happens after the booking
-- lock is held, when no concurrent fn_cancel_booking for the
-- same voyage can be running (voyage_capacity_counters NOWAIT
-- serialises all capacity writes per voyage).
-- =============================================================

CREATE OR REPLACE FUNCTION fn_cancel_booking(
    p_booking_id           UUID,
    p_scope                cancellation_scope,
    p_initiated_by         TEXT,
    p_refund_amount_kurus  BIGINT,
    p_partial_target_type  partial_target_type DEFAULT NULL,
    p_partial_target_id    UUID                DEFAULT NULL
)
RETURNS TABLE(
    o_cancellation_record_id  UUID,
    o_refund_id               UUID
)
LANGUAGE plpgsql AS $$
DECLARE
    v_voyage_id          UUID;
    v_departure_utc      TIMESTAMPTZ;
    v_booking_status     booking_status;
    v_hold_id            UUID;
    v_payment_id         UUID;
    v_payment_status     payment_status;
    v_currency           CHAR(3);
    v_now                TIMESTAMPTZ := clock_timestamp();
    v_event_id           CHAR(26);
    v_ledger_seq         BIGINT;
    v_cancellation_id    UUID        := gen_random_uuid();
    v_refund_id          UUID        := gen_random_uuid();

    v_delta_lane         NUMERIC     := 0;
    v_delta_m2           NUMERIC     := 0;
    v_delta_pax          INTEGER     := 0;
    v_cabin_deltas       JSONB       := '[]'::JSONB;

    v_pre_cabin_type_id  UUID;

    v_bp_cancelled_at    TIMESTAMPTZ;
    v_bv_cancelled_at    TIMESTAMPTZ;
    v_bv_lane            NUMERIC;
    v_bv_m2              NUMERIC;
    v_bc_cancelled_at    TIMESTAMPTZ;
    v_bc_cabin_type_id   UUID;
    v_bc_count           INTEGER;

    v_all_cancelled      BOOLEAN;
BEGIN
    IF p_scope = 'PARTIAL'
       AND (p_partial_target_type IS NULL OR p_partial_target_id IS NULL)
    THEN
        RAISE EXCEPTION 'PARTIAL cancellation requires both partial_target_type and partial_target_id'
            USING ERRCODE = 'P0001';
    END IF;

    IF p_scope = 'FULL'
       AND (p_partial_target_type IS NOT NULL OR p_partial_target_id IS NOT NULL)
    THEN
        RAISE EXCEPTION 'FULL cancellation must not include partial_target_type or partial_target_id'
            USING ERRCODE = 'P0001';
    END IF;

    IF p_refund_amount_kurus IS NULL OR p_refund_amount_kurus <= 0 THEN
        RAISE EXCEPTION 'p_refund_amount_kurus must be a positive integer, got: %',
            p_refund_amount_kurus
            USING ERRCODE = 'P0001';
    END IF;

    IF p_initiated_by IS NULL OR trim(p_initiated_by) = '' THEN
        RAISE EXCEPTION 'p_initiated_by must not be empty'
            USING ERRCODE = 'P0001';
    END IF;

    SELECT b.voyage_id, b.hold_id, b.status
    INTO   v_voyage_id, v_hold_id, v_booking_status
    FROM   bookings b
    WHERE  b.booking_id = p_booking_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'booking % not found', p_booking_id
            USING ERRCODE = 'P0002';
    END IF;

    IF p_scope = 'FULL' AND v_booking_status = 'CANCELLED' THEN
        SELECT cr.cancellation_record_id, rr.refund_id
        INTO   o_cancellation_record_id, o_refund_id
        FROM   cancellation_records cr
        JOIN   refund_records rr
               ON rr.cancellation_record_id = cr.cancellation_record_id
        WHERE  cr.booking_id = p_booking_id
        AND    cr.scope      = 'FULL'
        ORDER  BY cr.initiated_at DESC
        LIMIT  1;

        IF FOUND THEN
            RETURN NEXT;
            RETURN;
        END IF;

        RAISE EXCEPTION
            'booking % is CANCELLED but no FULL cancellation_record found — data integrity violation',
            p_booking_id
            USING ERRCODE = 'P0001';
    END IF;

    IF v_booking_status NOT IN ('CONFIRMED', 'CHECKED_IN') THEN
        RAISE EXCEPTION 'booking % cannot be cancelled from state: %',
            p_booking_id, v_booking_status
            USING ERRCODE = 'P0001';
    END IF;

    SELECT v.departure_utc
    INTO   v_departure_utc
    FROM   voyages v
    WHERE  v.voyage_id = v_voyage_id;

    IF v_departure_utc <= v_now THEN
        RAISE EXCEPTION 'voyage % has departed at %; cancellation is not permitted after departure',
            v_voyage_id, v_departure_utc
            USING ERRCODE = 'P0001';
    END IF;

    IF p_scope = 'PARTIAL' AND p_partial_target_type = 'CABIN' THEN
        SELECT bc.cabin_type_id
        INTO   v_pre_cabin_type_id
        FROM   booking_cabins bc
        WHERE  bc.booking_cabin_id = p_partial_target_id
        AND    bc.booking_id       = p_booking_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'booking_cabin % not found for booking %',
                p_partial_target_id, p_booking_id
                USING ERRCODE = 'P0002';
        END IF;
    END IF;

    -- Lock 1: voyage_capacity_counters
    PERFORM 1
    FROM   voyage_capacity_counters
    WHERE  voyage_id = v_voyage_id
    FOR UPDATE NOWAIT;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'capacity counters not found for voyage %', v_voyage_id
            USING ERRCODE = 'P0002';
    END IF;

    -- Lock 2: voyage_cabin_inventory (only for rows that will change)
    IF p_scope = 'PARTIAL' AND p_partial_target_type = 'CABIN' THEN
        PERFORM 1
        FROM   voyage_cabin_inventory
        WHERE  voyage_id     = v_voyage_id
        AND    cabin_type_id = v_pre_cabin_type_id
        FOR UPDATE NOWAIT;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'cabin inventory not found for type % on voyage %',
                v_pre_cabin_type_id, v_voyage_id
                USING ERRCODE = 'P0002';
        END IF;

    ELSIF p_scope = 'FULL' THEN
        PERFORM 1
        FROM   voyage_cabin_inventory vci
        WHERE  vci.voyage_id = v_voyage_id
        AND    EXISTS (
            SELECT 1
            FROM   booking_cabins bc
            WHERE  bc.booking_id    = p_booking_id
            AND    bc.cabin_type_id = vci.cabin_type_id
            AND    bc.cancelled_at  IS NULL
        )
        FOR UPDATE NOWAIT;
        -- NOT FOUND is valid: booking may have no cabin items
    END IF;

    -- Lock 3: payments
    SELECT p.payment_id, p.status, p.currency
    INTO   v_payment_id, v_payment_status, v_currency
    FROM   payments p
    WHERE  p.hold_id = v_hold_id
    FOR UPDATE NOWAIT;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'no payment found for hold % (booking %)',
            v_hold_id, p_booking_id
            USING ERRCODE = 'P0002';
    END IF;

    IF v_payment_status != 'SETTLED' THEN
        RAISE EXCEPTION 'payment for booking % is in % state; only SETTLED payments may be refunded',
            p_booking_id, v_payment_status
            USING ERRCODE = 'P0001';
    END IF;

    -- Lock 4: bookings
    SELECT b.status
    INTO   v_booking_status
    FROM   bookings b
    WHERE  b.booking_id = p_booking_id
    FOR UPDATE NOWAIT;

    -- Re-check FULL idempotency after booking lock
    IF p_scope = 'FULL' AND v_booking_status = 'CANCELLED' THEN
        SELECT cr.cancellation_record_id, rr.refund_id
        INTO   o_cancellation_record_id, o_refund_id
        FROM   cancellation_records cr
        JOIN   refund_records rr
               ON rr.cancellation_record_id = cr.cancellation_record_id
        WHERE  cr.booking_id = p_booking_id
        AND    cr.scope      = 'FULL'
        ORDER  BY cr.initiated_at DESC
        LIMIT  1;

        IF FOUND THEN
            RETURN NEXT;
            RETURN;
        END IF;

        RAISE EXCEPTION
            'booking % is CANCELLED but no FULL cancellation_record found — data integrity violation',
            p_booking_id
            USING ERRCODE = 'P0001';
    END IF;

    IF v_booking_status NOT IN ('CONFIRMED', 'CHECKED_IN') THEN
        RAISE EXCEPTION 'booking % cannot be cancelled from state: %',
            p_booking_id, v_booking_status
            USING ERRCODE = 'P0001';
    END IF;

    -- Validate partial target and compute capacity deltas.
    -- All reads happen here with the booking lock held; no concurrent
    -- fn_cancel_booking for this voyage can be running (capacity NOWAIT).

    IF p_scope = 'PARTIAL' THEN

        IF p_partial_target_type = 'PASSENGER' THEN

            SELECT bp.cancelled_at
            INTO   v_bp_cancelled_at
            FROM   booking_passengers bp
            WHERE  bp.booking_passenger_id = p_partial_target_id
            AND    bp.booking_id           = p_booking_id;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'booking_passenger % not found for booking %',
                    p_partial_target_id, p_booking_id
                    USING ERRCODE = 'P0002';
            END IF;

            IF v_bp_cancelled_at IS NOT NULL THEN
                RAISE EXCEPTION 'booking_passenger % on booking % is already cancelled',
                    p_partial_target_id, p_booking_id
                    USING ERRCODE = 'P0001';
            END IF;

            v_delta_pax := 1;

        ELSIF p_partial_target_type = 'VEHICLE' THEN

            SELECT bv.cancelled_at, bv.lane_meters_allocated, bv.m2_allocated
            INTO   v_bv_cancelled_at, v_bv_lane, v_bv_m2
            FROM   booking_vehicles bv
            WHERE  bv.booking_vehicle_id = p_partial_target_id
            AND    bv.booking_id         = p_booking_id;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'booking_vehicle % not found for booking %',
                    p_partial_target_id, p_booking_id
                    USING ERRCODE = 'P0002';
            END IF;

            IF v_bv_cancelled_at IS NOT NULL THEN
                RAISE EXCEPTION 'booking_vehicle % on booking % is already cancelled',
                    p_partial_target_id, p_booking_id
                    USING ERRCODE = 'P0001';
            END IF;

            v_delta_lane := v_bv_lane;
            v_delta_m2   := v_bv_m2;

        ELSIF p_partial_target_type = 'CABIN' THEN

            SELECT bc.cancelled_at, bc.cabin_type_id, bc.count_allocated
            INTO   v_bc_cancelled_at, v_bc_cabin_type_id, v_bc_count
            FROM   booking_cabins bc
            WHERE  bc.booking_cabin_id = p_partial_target_id
            AND    bc.booking_id       = p_booking_id;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'booking_cabin % not found for booking %',
                    p_partial_target_id, p_booking_id
                    USING ERRCODE = 'P0002';
            END IF;

            IF v_bc_cancelled_at IS NOT NULL THEN
                RAISE EXCEPTION 'booking_cabin % on booking % is already cancelled',
                    p_partial_target_id, p_booking_id
                    USING ERRCODE = 'P0001';
            END IF;

            v_cabin_deltas := jsonb_build_array(jsonb_build_object(
                'cabin_type_id', v_bc_cabin_type_id,
                'delta_count',   v_bc_count
            ));

        END IF;

    ELSIF p_scope = 'FULL' THEN

        SELECT
            COALESCE(SUM(lane_meters_allocated), 0),
            COALESCE(SUM(m2_allocated),          0)
        INTO v_delta_lane, v_delta_m2
        FROM booking_vehicles
        WHERE booking_id  = p_booking_id
        AND   cancelled_at IS NULL;

        SELECT COUNT(*)
        INTO   v_delta_pax
        FROM   booking_passengers
        WHERE  booking_id  = p_booking_id
        AND    cancelled_at IS NULL;

        SELECT COALESCE(
            jsonb_agg(jsonb_build_object(
                'cabin_type_id', bc.cabin_type_id,
                'delta_count',   bc.count_allocated
            )),
            '[]'::JSONB
        )
        INTO   v_cabin_deltas
        FROM   booking_cabins bc
        WHERE  bc.booking_id  = p_booking_id
        AND    bc.cancelled_at IS NULL;

    END IF;

    v_ledger_seq := fn_next_ledger_seq(v_voyage_id);
    v_event_id   := fn_generate_ulid();

    -- Ledger row FIRST — cancellation_records.cancellation_ledger_event_id FK requires it
    INSERT INTO capacity_allocation_ledger (
        event_id, ledger_seq, voyage_id, event_type,
        hold_id, booking_id,
        delta_lane_meters, delta_m2, delta_passengers,
        actor, idempotency_key, created_at
    ) VALUES (
        v_event_id, v_ledger_seq, v_voyage_id, 'BOOKING_CANCELLED',
        v_hold_id, p_booking_id,
        v_delta_lane, v_delta_m2, v_delta_pax,
        'fn_cancel_booking', v_event_id, v_now
    );

    IF jsonb_array_length(v_cabin_deltas) > 0 THEN
        INSERT INTO ledger_cabin_deltas (event_id, cabin_type_id, delta_count)
        SELECT v_event_id,
               (elem->>'cabin_type_id')::UUID,
               (elem->>'delta_count')::INT
        FROM   jsonb_array_elements(v_cabin_deltas) AS elem;
    END IF;

    INSERT INTO cancellation_records (
        cancellation_record_id, booking_id, scope,
        partial_target_type, partial_target_id,
        initiated_by, initiated_at, effective_at,
        cancellation_ledger_event_id
    ) VALUES (
        v_cancellation_id, p_booking_id, p_scope,
        p_partial_target_type, p_partial_target_id,
        p_initiated_by, v_now, v_now,
        v_event_id
    );

    INSERT INTO refund_records (
        refund_id, payment_id, cancellation_record_id, booking_id,
        status, amount_kurus, currency, queued_at
    ) VALUES (
        v_refund_id, v_payment_id, v_cancellation_id, p_booking_id,
        'QUEUED', p_refund_amount_kurus, v_currency, v_now
    );

    -- Mark child rows as cancelled
    IF p_scope = 'FULL' THEN
        UPDATE booking_passengers
        SET    cancelled_at = v_now
        WHERE  booking_id   = p_booking_id
        AND    cancelled_at IS NULL;

        UPDATE booking_vehicles
        SET    cancelled_at = v_now
        WHERE  booking_id   = p_booking_id
        AND    cancelled_at IS NULL;

        UPDATE booking_cabins
        SET    cancelled_at = v_now
        WHERE  booking_id   = p_booking_id
        AND    cancelled_at IS NULL;

    ELSIF p_scope = 'PARTIAL' THEN
        IF p_partial_target_type = 'PASSENGER' THEN
            UPDATE booking_passengers
            SET    cancelled_at = v_now
            WHERE  booking_passenger_id = p_partial_target_id;

        ELSIF p_partial_target_type = 'VEHICLE' THEN
            UPDATE booking_vehicles
            SET    cancelled_at = v_now
            WHERE  booking_vehicle_id = p_partial_target_id;

        ELSIF p_partial_target_type = 'CABIN' THEN
            UPDATE booking_cabins
            SET    cancelled_at = v_now
            WHERE  booking_cabin_id = p_partial_target_id;
        END IF;
    END IF;

    -- Release confirmed capacity back to available in voyage_capacity_counters.
    -- Subtracting 0 is safe when a dimension is unaffected (e.g. cabin-only cancellation).
    UPDATE voyage_capacity_counters
    SET
        lane_meters_confirmed = lane_meters_confirmed - v_delta_lane,
        m2_confirmed          = m2_confirmed          - v_delta_m2,
        passengers_confirmed  = passengers_confirmed  - v_delta_pax,
        last_ledger_seq       = v_ledger_seq
    WHERE  voyage_id = v_voyage_id;

    -- Release confirmed_count in voyage_cabin_inventory
    IF jsonb_array_length(v_cabin_deltas) > 0 THEN
        UPDATE voyage_cabin_inventory vci
        SET    confirmed_count = vci.confirmed_count - (elem->>'delta_count')::INT
        FROM   jsonb_array_elements(v_cabin_deltas) AS elem
        WHERE  vci.voyage_id     = v_voyage_id
        AND    vci.cabin_type_id = (elem->>'cabin_type_id')::UUID;
    END IF;

    -- Update booking status
    IF p_scope = 'FULL' THEN
        UPDATE bookings
        SET    status       = 'CANCELLED',
               cancelled_at = v_now
        WHERE  booking_id   = p_booking_id;

    ELSIF p_scope = 'PARTIAL' THEN
        SELECT NOT (
            EXISTS (
                SELECT 1 FROM booking_passengers
                WHERE  booking_id  = p_booking_id
                AND    cancelled_at IS NULL
            )
            OR EXISTS (
                SELECT 1 FROM booking_vehicles
                WHERE  booking_id  = p_booking_id
                AND    cancelled_at IS NULL
            )
            OR EXISTS (
                SELECT 1 FROM booking_cabins
                WHERE  booking_id  = p_booking_id
                AND    cancelled_at IS NULL
            )
        ) INTO v_all_cancelled;

        IF v_all_cancelled THEN
            UPDATE bookings
            SET    status       = 'CANCELLED',
                   cancelled_at = v_now
            WHERE  booking_id   = p_booking_id;
        END IF;
    END IF;

    o_cancellation_record_id := v_cancellation_id;
    o_refund_id              := v_refund_id;
    RETURN NEXT;
END;
$$;


-- =============================================================
-- fn_process_refund_submission
-- Transitions a QUEUED refund to SUBMITTED and records the
-- gateway-assigned reference.
-- Idempotent if already SUBMITTED with the same reference.
-- Lock: refund_records
-- =============================================================

CREATE OR REPLACE FUNCTION fn_process_refund_submission(
    p_refund_id                 UUID,
    p_gateway_refund_reference  TEXT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    v_status        refund_status;
    v_existing_ref  TEXT;
BEGIN
    IF p_gateway_refund_reference IS NULL OR trim(p_gateway_refund_reference) = '' THEN
        RAISE EXCEPTION 'p_gateway_refund_reference must not be empty'
            USING ERRCODE = 'P0001';
    END IF;

    SELECT rr.status, rr.gateway_refund_reference
    INTO   v_status, v_existing_ref
    FROM   refund_records rr
    WHERE  rr.refund_id = p_refund_id
    FOR UPDATE NOWAIT;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'refund % not found', p_refund_id
            USING ERRCODE = 'P0002';
    END IF;

    IF v_status = 'SUBMITTED' THEN
        IF v_existing_ref = p_gateway_refund_reference THEN
            RETURN;
        END IF;
        RAISE EXCEPTION
            'refund % is already SUBMITTED with a different gateway reference (existing: %)',
            p_refund_id, v_existing_ref
            USING ERRCODE = 'P0001';
    END IF;

    IF v_status != 'QUEUED' THEN
        RAISE EXCEPTION 'refund % cannot transition from % to SUBMITTED',
            p_refund_id, v_status
            USING ERRCODE = 'P0001';
    END IF;

    UPDATE refund_records
    SET    status                   = 'SUBMITTED',
           gateway_refund_reference = p_gateway_refund_reference
    WHERE  refund_id = p_refund_id;
END;
$$;


-- =============================================================
-- fn_mark_refund_confirmed
-- Transitions a SUBMITTED (or QUEUED, when gateway result is
-- authoritative) refund to CONFIRMED.
-- Idempotent if already CONFIRMED.
-- Lock: refund_records
-- =============================================================

CREATE OR REPLACE FUNCTION fn_mark_refund_confirmed(p_refund_id UUID)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    v_status  refund_status;
    v_now     TIMESTAMPTZ := clock_timestamp();
BEGIN
    SELECT rr.status
    INTO   v_status
    FROM   refund_records rr
    WHERE  rr.refund_id = p_refund_id
    FOR UPDATE NOWAIT;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'refund % not found', p_refund_id
            USING ERRCODE = 'P0002';
    END IF;

    IF v_status = 'CONFIRMED' THEN
        RETURN;
    END IF;

    IF v_status NOT IN ('SUBMITTED', 'QUEUED') THEN
        RAISE EXCEPTION 'refund % cannot transition from % to CONFIRMED',
            p_refund_id, v_status
            USING ERRCODE = 'P0001';
    END IF;

    UPDATE refund_records
    SET    status       = 'CONFIRMED',
           confirmed_at = v_now
    WHERE  refund_id = p_refund_id;
END;
$$;


-- =============================================================
-- fn_mark_refund_failed
-- Transitions a QUEUED or SUBMITTED refund to FAILED or
-- MANUAL_REVIEW depending on p_manual_review.
-- When MANUAL_REVIEW is chosen an ops_review_queue row is
-- inserted with issue_type = REFUND_MISMATCH.
-- Idempotent if already in the same target terminal state.
-- Lock: refund_records
-- =============================================================

CREATE OR REPLACE FUNCTION fn_mark_refund_failed(
    p_refund_id      UUID,
    p_manual_review  BOOLEAN DEFAULT FALSE,
    p_failure_reason TEXT    DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    v_status         refund_status;
    v_booking_id     UUID;
    v_payment_id     UUID;
    v_voyage_id      UUID;
    v_target_status  refund_status;
    v_now            TIMESTAMPTZ := clock_timestamp();
BEGIN
    SELECT rr.status, rr.booking_id, rr.payment_id
    INTO   v_status, v_booking_id, v_payment_id
    FROM   refund_records rr
    WHERE  rr.refund_id = p_refund_id
    FOR UPDATE NOWAIT;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'refund % not found', p_refund_id
            USING ERRCODE = 'P0002';
    END IF;

    v_target_status := CASE WHEN p_manual_review THEN 'MANUAL_REVIEW'::refund_status
                            ELSE 'FAILED'::refund_status
                       END;

    IF v_status = v_target_status THEN
        RETURN;
    END IF;

    IF v_status NOT IN ('QUEUED', 'SUBMITTED') THEN
        RAISE EXCEPTION 'refund % cannot transition from % to %',
            p_refund_id, v_status, v_target_status
            USING ERRCODE = 'P0001';
    END IF;

    UPDATE refund_records
    SET    status = v_target_status
    WHERE  refund_id = p_refund_id;

    IF p_manual_review THEN
        SELECT b.voyage_id
        INTO   v_voyage_id
        FROM   bookings b
        WHERE  b.booking_id = v_booking_id;

        INSERT INTO ops_review_queue (
            review_id, status, issue_type,
            voyage_id, booking_id, payment_id, refund_id,
            detected_by, description, created_at
        ) VALUES (
            gen_random_uuid(), 'OPEN', 'REFUND_MISMATCH',
            v_voyage_id, v_booking_id, v_payment_id, p_refund_id,
            'fn_mark_refund_failed',
            COALESCE(
                p_failure_reason,
                'Refund ' || p_refund_id || ' moved to MANUAL_REVIEW'
            ),
            v_now
        );
    END IF;
END;
$$;


-- =============================================================
-- fn_record_check_in_attempt
-- Records every check-in attempt (including denials) as an
-- immutable audit row.  Transitions booking to CHECKED_IN on
-- first APPROVED outcome.
--
-- Repeated APPROVED calls on an already CHECKED_IN booking:
--   p_write_audit_if_already_checked_in = FALSE → return early,
--     no audit row written, o_check_in_record_id = NULL.
--   p_write_audit_if_already_checked_in = TRUE  → write audit
--     row, return it.
--
-- Capacity never changes in this function.
-- Lock: bookings
-- =============================================================

CREATE OR REPLACE FUNCTION fn_record_check_in_attempt(
    p_booking_id                        UUID,
    p_operator_id                       TEXT,
    p_outcome                           check_in_outcome,
    p_document_verified                 BOOLEAN,
    p_denial_reason                     TEXT    DEFAULT NULL,
    p_write_audit_if_already_checked_in BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
    o_check_in_record_id  UUID,
    o_booking_status      booking_status
)
LANGUAGE plpgsql AS $$
DECLARE
    v_booking_status  booking_status;
    v_voyage_id       UUID;
    v_departure_utc   TIMESTAMPTZ;
    v_now             TIMESTAMPTZ := clock_timestamp();
    v_record_id       UUID        := gen_random_uuid();
BEGIN
    IF p_outcome = 'DENIED'
       AND (p_denial_reason IS NULL OR trim(p_denial_reason) = '')
    THEN
        RAISE EXCEPTION 'denial_reason is required when outcome is DENIED'
            USING ERRCODE = 'P0001';
    END IF;

    IF p_operator_id IS NULL OR trim(p_operator_id) = '' THEN
        RAISE EXCEPTION 'p_operator_id must not be empty'
            USING ERRCODE = 'P0001';
    END IF;

    SELECT b.status, b.voyage_id
    INTO   v_booking_status, v_voyage_id
    FROM   bookings b
    WHERE  b.booking_id = p_booking_id
    FOR UPDATE NOWAIT;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'booking % not found', p_booking_id
            USING ERRCODE = 'P0002';
    END IF;

    IF v_booking_status = 'CANCELLED' THEN
        RAISE EXCEPTION 'booking % is CANCELLED; check-in is not permitted', p_booking_id
            USING ERRCODE = 'P0001';
    END IF;

    SELECT v.departure_utc
    INTO   v_departure_utc
    FROM   voyages v
    WHERE  v.voyage_id = v_voyage_id;

    IF v_departure_utc < v_now THEN
        RAISE EXCEPTION 'voyage % has departed at %; check-in window is closed',
            v_voyage_id, v_departure_utc
            USING ERRCODE = 'P0001';
    END IF;

    -- Idempotency path: already CHECKED_IN + APPROVED + audit suppressed
    IF v_booking_status = 'CHECKED_IN'
       AND p_outcome = 'APPROVED'
       AND NOT p_write_audit_if_already_checked_in
    THEN
        o_check_in_record_id := NULL;
        o_booking_status     := 'CHECKED_IN';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Write immutable audit row for this attempt
    INSERT INTO check_in_records (
        check_in_record_id, booking_id,
        outcome, operator_id,
        document_verified, denial_reason, attempted_at
    ) VALUES (
        v_record_id, p_booking_id,
        p_outcome, p_operator_id,
        p_document_verified, p_denial_reason, v_now
    );

    -- Transition booking to CHECKED_IN only on first approval
    IF p_outcome = 'APPROVED' AND v_booking_status = 'CONFIRMED' THEN
        UPDATE bookings
        SET    status        = 'CHECKED_IN',
               checked_in_at = v_now
        WHERE  booking_id    = p_booking_id;

        v_booking_status := 'CHECKED_IN';
    END IF;

    o_check_in_record_id := v_record_id;
    o_booking_status     := v_booking_status;
    RETURN NEXT;
END;
$$;
