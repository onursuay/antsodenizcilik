-- =============================================================
-- ANTSO DENİZCİLİK — RECONCILIATION & INTEGRITY FUNCTIONS
-- 004_reconciliation_functions.sql
-- =============================================================


-- =============================================================
-- SCHEMA PATCHES
--
-- Partial unique indexes on ops_review_queue that enable atomic
-- idempotent insertion via INSERT ... ON CONFLICT DO NOTHING.
-- Each index covers exactly one OPEN issue_type per natural key
-- so that concurrent callers can never create duplicate open rows.
-- =============================================================

-- At most one OPEN COUNTER_DRIFT row per voyage.
CREATE UNIQUE INDEX IF NOT EXISTS uq_orq_open_counter_drift
    ON ops_review_queue (voyage_id, issue_type)
    WHERE status = 'OPEN' AND issue_type = 'COUNTER_DRIFT';

-- At most one OPEN RECONCILIATION_FAILURE row per voyage.
-- Used when fn_reconcile_counter_drift detects a corrupt ledger.
CREATE UNIQUE INDEX IF NOT EXISTS uq_orq_open_recon_failure
    ON ops_review_queue (voyage_id, issue_type)
    WHERE status = 'OPEN' AND issue_type = 'RECONCILIATION_FAILURE';

-- At most one OPEN PAYMENT_UNKNOWN row per payment.
-- payment_id IS NOT NULL for all rows covered by this index.
CREATE UNIQUE INDEX IF NOT EXISTS uq_orq_open_payment_unknown
    ON ops_review_queue (payment_id, issue_type)
    WHERE status = 'OPEN' AND issue_type = 'PAYMENT_UNKNOWN';


-- =============================================================
-- fn_replay_ledger_and_compute_state
-- Pure read function.  Replays capacity_allocation_ledger in
-- ledger_seq ASC order and returns the fully derived counter
-- state.  Requires no locks; callers must hold the relevant
-- voyage_capacity_counters lock before calling if they need a
-- consistent snapshot.
--
-- Returns exactly one row regardless of whether any ledger
-- events exist (all-zero result for a voyage with no events).
--
-- Cabin state is returned as JSONB keyed by cabin_type_id::TEXT.
-- =============================================================

CREATE OR REPLACE FUNCTION fn_replay_ledger_and_compute_state(p_voyage_id UUID)
RETURNS TABLE(
    r_lane_meters_reserved   NUMERIC,
    r_lane_meters_confirmed  NUMERIC,
    r_m2_reserved            NUMERIC,
    r_m2_confirmed           NUMERIC,
    r_passengers_reserved    INTEGER,
    r_passengers_confirmed   INTEGER,
    r_last_ledger_seq        BIGINT,
    r_cabin_reserved         JSONB,
    r_cabin_confirmed        JSONB
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH ledger_agg AS (
        SELECT
            COALESCE(SUM(CASE
                WHEN cal.event_type = 'HOLD_CREATED'
                    THEN  cal.delta_lane_meters
                WHEN cal.event_type IN ('HOLD_EXPIRED', 'HOLD_RELEASED', 'BOOKING_CONFIRMED')
                    THEN -cal.delta_lane_meters
                ELSE 0
            END), 0)                             AS lane_reserved,

            COALESCE(SUM(CASE
                WHEN cal.event_type = 'BOOKING_CONFIRMED'
                    THEN  cal.delta_lane_meters
                WHEN cal.event_type = 'BOOKING_CANCELLED'
                    THEN -cal.delta_lane_meters
                ELSE 0
            END), 0)                             AS lane_confirmed,

            COALESCE(SUM(CASE
                WHEN cal.event_type = 'HOLD_CREATED'
                    THEN  cal.delta_m2
                WHEN cal.event_type IN ('HOLD_EXPIRED', 'HOLD_RELEASED', 'BOOKING_CONFIRMED')
                    THEN -cal.delta_m2
                ELSE 0
            END), 0)                             AS m2_reserved,

            COALESCE(SUM(CASE
                WHEN cal.event_type = 'BOOKING_CONFIRMED'
                    THEN  cal.delta_m2
                WHEN cal.event_type = 'BOOKING_CANCELLED'
                    THEN -cal.delta_m2
                ELSE 0
            END), 0)                             AS m2_confirmed,

            COALESCE(SUM(CASE
                WHEN cal.event_type = 'HOLD_CREATED'
                    THEN  cal.delta_passengers
                WHEN cal.event_type IN ('HOLD_EXPIRED', 'HOLD_RELEASED', 'BOOKING_CONFIRMED')
                    THEN -cal.delta_passengers
                ELSE 0
            END), 0)::INTEGER                    AS pax_reserved,

            COALESCE(SUM(CASE
                WHEN cal.event_type = 'BOOKING_CONFIRMED'
                    THEN  cal.delta_passengers
                WHEN cal.event_type = 'BOOKING_CANCELLED'
                    THEN -cal.delta_passengers
                ELSE 0
            END), 0)::INTEGER                    AS pax_confirmed,

            COALESCE(MAX(cal.ledger_seq), 0)     AS last_seq

        FROM capacity_allocation_ledger cal
        WHERE cal.voyage_id = p_voyage_id
    ),
    cabin_agg AS MATERIALIZED (
        SELECT
            lcd.cabin_type_id,

            COALESCE(SUM(CASE
                WHEN cal.event_type = 'HOLD_CREATED'
                    THEN  lcd.delta_count
                WHEN cal.event_type IN ('HOLD_EXPIRED', 'HOLD_RELEASED', 'BOOKING_CONFIRMED')
                    THEN -lcd.delta_count
                ELSE 0
            END), 0)::INTEGER                    AS cab_reserved,

            COALESCE(SUM(CASE
                WHEN cal.event_type = 'BOOKING_CONFIRMED'
                    THEN  lcd.delta_count
                WHEN cal.event_type = 'BOOKING_CANCELLED'
                    THEN -lcd.delta_count
                ELSE 0
            END), 0)::INTEGER                    AS cab_confirmed

        FROM ledger_cabin_deltas lcd
        JOIN capacity_allocation_ledger cal
             ON cal.event_id  = lcd.event_id
        WHERE cal.voyage_id   = p_voyage_id
        GROUP BY lcd.cabin_type_id
    )
    SELECT
        la.lane_reserved,
        la.lane_confirmed,
        la.m2_reserved,
        la.m2_confirmed,
        la.pax_reserved,
        la.pax_confirmed,
        la.last_seq,
        COALESCE((
            SELECT jsonb_object_agg(ca.cabin_type_id::TEXT, ca.cab_reserved)
            FROM   cabin_agg ca
        ), '{}'::JSONB),
        COALESCE((
            SELECT jsonb_object_agg(ca.cabin_type_id::TEXT, ca.cab_confirmed)
            FROM   cabin_agg ca
        ), '{}'::JSONB)
    FROM ledger_agg la;
END;
$$;


-- =============================================================
-- fn_assert_capacity_consistency
-- Raises an exception if voyage_capacity_counters or any
-- voyage_cabin_inventory row diverges from the ledger-derived
-- state.  Intended for debugging, admin scripts, and post-deploy
-- verification.  Does not mutate any data.
-- =============================================================

CREATE OR REPLACE FUNCTION fn_assert_capacity_consistency(p_voyage_id UUID)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    v_derived           RECORD;
    v_actual            RECORD;
    v_cabin_type_id     UUID;
    v_actual_reserved   INT;
    v_actual_confirmed  INT;
    v_derived_reserved  INT;
    v_derived_confirmed INT;
    v_snapshot_seq      BIGINT;
BEGIN
    -- Snapshot last_ledger_seq before replay.  If a concurrent capacity
    -- write commits between this read and the second read of v_actual,
    -- v_actual.last_ledger_seq will differ from v_snapshot_seq and we
    -- abort with a clear error rather than silently returning a potentially
    -- stale false-positive mismatch.
    -- For a fully deterministic result hold voyage_capacity_counters
    -- FOR UPDATE before calling this function.
    SELECT last_ledger_seq
    INTO   v_snapshot_seq
    FROM   voyage_capacity_counters
    WHERE  voyage_id = p_voyage_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'capacity counters not found for voyage %', p_voyage_id
            USING ERRCODE = 'P0002';
    END IF;

    SELECT * INTO v_derived
    FROM   fn_replay_ledger_and_compute_state(p_voyage_id);

    SELECT *
    INTO   v_actual
    FROM   voyage_capacity_counters
    WHERE  voyage_id = p_voyage_id;

    -- Concurrent-write guard: abort if a capacity write committed during replay.
    IF v_actual.last_ledger_seq IS DISTINCT FROM v_snapshot_seq THEN
        RAISE EXCEPTION
            'voyage % counters changed during consistency check '
            '(snapshot_seq=%, current_seq=%); '
            're-run with voyage_capacity_counters FOR UPDATE held',
            p_voyage_id, v_snapshot_seq, v_actual.last_ledger_seq
            USING ERRCODE = 'P0001';
    END IF;

    IF v_actual.lane_meters_reserved  IS DISTINCT FROM v_derived.r_lane_meters_reserved  OR
       v_actual.lane_meters_confirmed IS DISTINCT FROM v_derived.r_lane_meters_confirmed OR
       v_actual.m2_reserved           IS DISTINCT FROM v_derived.r_m2_reserved           OR
       v_actual.m2_confirmed          IS DISTINCT FROM v_derived.r_m2_confirmed          OR
       v_actual.passengers_reserved   IS DISTINCT FROM v_derived.r_passengers_reserved   OR
       v_actual.passengers_confirmed  IS DISTINCT FROM v_derived.r_passengers_confirmed
    THEN
        RAISE EXCEPTION
            'voyage_capacity_counters mismatch for voyage %: '
            'counter(lane_res=%, lane_conf=%, m2_res=%, m2_conf=%, pax_res=%, pax_conf=%) '
            'vs ledger(lane_res=%, lane_conf=%, m2_res=%, m2_conf=%, pax_res=%, pax_conf=%)',
            p_voyage_id,
            v_actual.lane_meters_reserved,  v_actual.lane_meters_confirmed,
            v_actual.m2_reserved,           v_actual.m2_confirmed,
            v_actual.passengers_reserved,   v_actual.passengers_confirmed,
            v_derived.r_lane_meters_reserved,  v_derived.r_lane_meters_confirmed,
            v_derived.r_m2_reserved,           v_derived.r_m2_confirmed,
            v_derived.r_passengers_reserved,   v_derived.r_passengers_confirmed
            USING ERRCODE = 'P0001';
    END IF;

    FOR v_cabin_type_id, v_actual_reserved, v_actual_confirmed IN
        SELECT vci.cabin_type_id,
               vci.reserved_count,
               vci.confirmed_count
        FROM   voyage_cabin_inventory vci
        WHERE  vci.voyage_id = p_voyage_id
    LOOP
        v_derived_reserved  := COALESCE((v_derived.r_cabin_reserved  ->>(v_cabin_type_id::TEXT))::INT, 0);
        v_derived_confirmed := COALESCE((v_derived.r_cabin_confirmed ->>(v_cabin_type_id::TEXT))::INT, 0);

        IF v_actual_reserved  IS DISTINCT FROM v_derived_reserved OR
           v_actual_confirmed IS DISTINCT FROM v_derived_confirmed
        THEN
            RAISE EXCEPTION
                'voyage_cabin_inventory mismatch for voyage % cabin_type %: '
                'counter(res=%, conf=%) vs ledger(res=%, conf=%)',
                p_voyage_id, v_cabin_type_id,
                v_actual_reserved,  v_actual_confirmed,
                v_derived_reserved, v_derived_confirmed
                USING ERRCODE = 'P0001';
        END IF;
    END LOOP;
END;
$$;


-- =============================================================
-- fn_detect_and_queue_counter_drift
-- Lightweight read-only drift detector.  Compares live counters
-- against ledger-derived state without acquiring capacity locks.
-- Inserts at most one OPEN ops_review_queue row per voyage.
-- Returns TRUE if drift was detected, FALSE otherwise.
-- No capacity mutations.
-- =============================================================

CREATE OR REPLACE FUNCTION fn_detect_and_queue_counter_drift(p_voyage_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql AS $$
DECLARE
    v_derived           RECORD;
    v_actual            RECORD;
    v_drift             BOOLEAN := FALSE;
    v_cabin_type_id     UUID;
    v_actual_reserved   INT;
    v_actual_confirmed  INT;
    v_derived_reserved  INT;
    v_derived_confirmed INT;
    v_now               TIMESTAMPTZ := clock_timestamp();
BEGIN
    SELECT *
    INTO   v_actual
    FROM   voyage_capacity_counters
    WHERE  voyage_id = p_voyage_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'capacity counters not found for voyage %', p_voyage_id
            USING ERRCODE = 'P0002';
    END IF;

    SELECT * INTO v_derived
    FROM   fn_replay_ledger_and_compute_state(p_voyage_id);

    IF v_actual.lane_meters_reserved  IS DISTINCT FROM v_derived.r_lane_meters_reserved  OR
       v_actual.lane_meters_confirmed IS DISTINCT FROM v_derived.r_lane_meters_confirmed OR
       v_actual.m2_reserved           IS DISTINCT FROM v_derived.r_m2_reserved           OR
       v_actual.m2_confirmed          IS DISTINCT FROM v_derived.r_m2_confirmed          OR
       v_actual.passengers_reserved   IS DISTINCT FROM v_derived.r_passengers_reserved   OR
       v_actual.passengers_confirmed  IS DISTINCT FROM v_derived.r_passengers_confirmed
    THEN
        v_drift := TRUE;
    END IF;

    IF NOT v_drift THEN
        FOR v_cabin_type_id, v_actual_reserved, v_actual_confirmed IN
            SELECT vci.cabin_type_id,
                   vci.reserved_count,
                   vci.confirmed_count
            FROM   voyage_cabin_inventory vci
            WHERE  vci.voyage_id = p_voyage_id
        LOOP
            v_derived_reserved  := COALESCE((v_derived.r_cabin_reserved  ->>(v_cabin_type_id::TEXT))::INT, 0);
            v_derived_confirmed := COALESCE((v_derived.r_cabin_confirmed ->>(v_cabin_type_id::TEXT))::INT, 0);

            IF v_actual_reserved  IS DISTINCT FROM v_derived_reserved OR
               v_actual_confirmed IS DISTINCT FROM v_derived_confirmed
            THEN
                v_drift := TRUE;
                EXIT;
            END IF;
        END LOOP;
    END IF;

    IF v_drift THEN
        -- Atomic idempotent insertion: uq_orq_open_counter_drift partial unique
        -- index on (voyage_id, issue_type) WHERE status = 'OPEN' ensures that
        -- concurrent calls cannot create duplicate OPEN COUNTER_DRIFT rows.
        INSERT INTO ops_review_queue (
            review_id, status, issue_type,
            voyage_id, detected_by, description, created_at
        ) VALUES (
            gen_random_uuid(), 'OPEN', 'COUNTER_DRIFT',
            p_voyage_id,
            'fn_detect_and_queue_counter_drift',
            'Counter drift detected for voyage ' || p_voyage_id
            || ': counter(lane_res=' || v_actual.lane_meters_reserved
            || ', lane_conf='        || v_actual.lane_meters_confirmed
            || ', m2_res='           || v_actual.m2_reserved
            || ', m2_conf='          || v_actual.m2_confirmed
            || ', pax_res='          || v_actual.passengers_reserved
            || ', pax_conf='         || v_actual.passengers_confirmed
            || ') ledger(lane_res='  || v_derived.r_lane_meters_reserved
            || ', lane_conf='        || v_derived.r_lane_meters_confirmed
            || ', m2_res='           || v_derived.r_m2_reserved
            || ', m2_conf='          || v_derived.r_m2_confirmed
            || ', pax_res='          || v_derived.r_passengers_reserved
            || ', pax_conf='         || v_derived.r_passengers_confirmed || ')',
            v_now
        )
        ON CONFLICT (voyage_id, issue_type)
        WHERE status = 'OPEN' AND issue_type = 'COUNTER_DRIFT'
        DO NOTHING;
    END IF;

    RETURN v_drift;
END;
$$;


-- =============================================================
-- fn_reconcile_counter_drift
-- Corrects voyage_capacity_counters and voyage_cabin_inventory
-- to match the authoritative ledger-derived state.
--
-- Lock order: voyage_capacity_counters → voyage_cabin_inventory
--
-- Writes a zero-delta PAYMENT_RECONCILED ledger row as an audit
-- marker so that the correction timestamp and ledger_seq are
-- preserved in the append-only event log.
--
-- Inserts an ops_review_queue row whenever a correction is made.
-- Idempotent: if counters already match, returns immediately
-- without writing anything.
-- =============================================================

CREATE OR REPLACE FUNCTION fn_reconcile_counter_drift(p_voyage_id UUID)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    v_derived            RECORD;
    v_actual             RECORD;
    v_mismatch           BOOLEAN := FALSE;
    v_cabin_type_id      UUID;
    v_actual_reserved    INT;
    v_actual_confirmed   INT;
    v_derived_reserved   INT;
    v_derived_confirmed  INT;
    v_total_count        INT;
    v_event_id           CHAR(26);
    v_new_seq            BIGINT;
    v_now                TIMESTAMPTZ := clock_timestamp();
BEGIN
    -- Lock 1: voyage_capacity_counters (serialisation gate)
    SELECT *
    INTO   v_actual
    FROM   voyage_capacity_counters
    WHERE  voyage_id = p_voyage_id
    FOR UPDATE NOWAIT;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'capacity counters not found for voyage %', p_voyage_id
            USING ERRCODE = 'P0002';
    END IF;

    -- Lock 2: all voyage_cabin_inventory rows for this voyage
    PERFORM 1
    FROM   voyage_cabin_inventory
    WHERE  voyage_id = p_voyage_id
    FOR UPDATE NOWAIT;

    -- Derive authoritative state from ledger
    SELECT * INTO v_derived
    FROM   fn_replay_ledger_and_compute_state(p_voyage_id);

    -- Detect scalar counter mismatch
    IF v_actual.lane_meters_reserved  IS DISTINCT FROM v_derived.r_lane_meters_reserved  OR
       v_actual.lane_meters_confirmed IS DISTINCT FROM v_derived.r_lane_meters_confirmed OR
       v_actual.m2_reserved           IS DISTINCT FROM v_derived.r_m2_reserved           OR
       v_actual.m2_confirmed          IS DISTINCT FROM v_derived.r_m2_confirmed          OR
       v_actual.passengers_reserved   IS DISTINCT FROM v_derived.r_passengers_reserved   OR
       v_actual.passengers_confirmed  IS DISTINCT FROM v_derived.r_passengers_confirmed
    THEN
        v_mismatch := TRUE;
    END IF;

    -- Detect cabin inventory mismatch (exit early when found; lock is already held)
    IF NOT v_mismatch THEN
        FOR v_cabin_type_id, v_actual_reserved, v_actual_confirmed IN
            SELECT vci.cabin_type_id,
                   vci.reserved_count,
                   vci.confirmed_count
            FROM   voyage_cabin_inventory vci
            WHERE  vci.voyage_id = p_voyage_id
        LOOP
            v_derived_reserved  := COALESCE((v_derived.r_cabin_reserved  ->>(v_cabin_type_id::TEXT))::INT, 0);
            v_derived_confirmed := COALESCE((v_derived.r_cabin_confirmed ->>(v_cabin_type_id::TEXT))::INT, 0);

            IF v_actual_reserved  IS DISTINCT FROM v_derived_reserved OR
               v_actual_confirmed IS DISTINCT FROM v_derived_confirmed
            THEN
                v_mismatch := TRUE;
                EXIT;
            END IF;
        END LOOP;
    END IF;

    IF NOT v_mismatch THEN
        RETURN;
    END IF;

    -- ----------------------------------------------------------------
    -- Pre-validate ledger-derived values against the CHECK constraints
    -- on voyage_capacity_counters (chk_vcc_*) and voyage_cabin_inventory
    -- (chk_vci_reserved, chk_vci_confirmed, chk_vci_ceiling) before any
    -- corrective write is attempted.
    --
    -- If validation fails the function raises SQLSTATE P0001 and rolls
    -- back without touching any table.  The diagnostic message contains
    -- all values needed for investigation.  The caller must catch this
    -- exception, insert a RECONCILIATION_FAILURE row in ops_review_queue
    -- in a separate transaction (using uq_orq_open_recon_failure ON
    -- CONFLICT DO NOTHING for idempotency), and escalate for manual
    -- ledger inspection.  Repeated calls with the same corrupt ledger
    -- produce the same exception — the path is fully idempotent.
    -- ----------------------------------------------------------------

    IF v_derived.r_lane_meters_reserved  < 0 OR
       v_derived.r_lane_meters_confirmed < 0 OR
       v_derived.r_m2_reserved           < 0 OR
       v_derived.r_m2_confirmed          < 0 OR
       v_derived.r_passengers_reserved   < 0 OR
       v_derived.r_passengers_confirmed  < 0
    THEN
        RAISE EXCEPTION
            'RECONCILIATION_FAILURE voyage %: ledger-derived scalar values are negative '
            '(lane_res=%, lane_conf=%, m2_res=%, m2_conf=%, pax_res=%, pax_conf=%); '
            'capacity_allocation_ledger is corrupt — automatic correction aborted',
            p_voyage_id,
            v_derived.r_lane_meters_reserved,  v_derived.r_lane_meters_confirmed,
            v_derived.r_m2_reserved,           v_derived.r_m2_confirmed,
            v_derived.r_passengers_reserved,   v_derived.r_passengers_confirmed
            USING ERRCODE = 'P0001';
    END IF;

    FOR v_cabin_type_id, v_total_count IN
        SELECT vci.cabin_type_id, vci.total_count
        FROM   voyage_cabin_inventory vci
        WHERE  vci.voyage_id = p_voyage_id
    LOOP
        v_derived_reserved  := COALESCE((v_derived.r_cabin_reserved  ->>(v_cabin_type_id::TEXT))::INT, 0);
        v_derived_confirmed := COALESCE((v_derived.r_cabin_confirmed ->>(v_cabin_type_id::TEXT))::INT, 0);

        IF v_derived_reserved < 0 OR
           v_derived_confirmed < 0 OR
           v_derived_reserved + v_derived_confirmed > v_total_count
        THEN
            RAISE EXCEPTION
                'RECONCILIATION_FAILURE voyage % cabin_type %: '
                'ledger-derived cabin values violate constraints '
                '(derived_res=%, derived_conf=%, total_count=%); '
                'capacity_allocation_ledger is corrupt — automatic correction aborted',
                p_voyage_id, v_cabin_type_id,
                v_derived_reserved, v_derived_confirmed, v_total_count
                USING ERRCODE = 'P0001';
        END IF;
    END LOOP;

    -- Write zero-delta PAYMENT_RECONCILED ledger row as correction audit marker.
    -- The new ledger_seq advances past the last real event so that future
    -- fn_next_ledger_seq calls remain monotonic.
    v_new_seq  := v_derived.r_last_ledger_seq + 1;
    v_event_id := fn_generate_ulid();

    INSERT INTO capacity_allocation_ledger (
        event_id, ledger_seq, voyage_id, event_type,
        hold_id, booking_id,
        delta_lane_meters, delta_m2, delta_passengers,
        actor, idempotency_key, created_at
    ) VALUES (
        v_event_id, v_new_seq, p_voyage_id, 'PAYMENT_RECONCILED',
        NULL, NULL,
        0, 0, 0,
        'fn_reconcile_counter_drift', v_event_id, v_now
    );

    -- Correct voyage_capacity_counters
    UPDATE voyage_capacity_counters
    SET
        lane_meters_reserved  = v_derived.r_lane_meters_reserved,
        lane_meters_confirmed = v_derived.r_lane_meters_confirmed,
        m2_reserved           = v_derived.r_m2_reserved,
        m2_confirmed          = v_derived.r_m2_confirmed,
        passengers_reserved   = v_derived.r_passengers_reserved,
        passengers_confirmed  = v_derived.r_passengers_confirmed,
        last_ledger_seq       = v_new_seq
    WHERE  voyage_id = p_voyage_id;

    -- Correct voyage_cabin_inventory for all existing rows.
    -- COALESCE to 0 handles cabin types present in inventory but absent from ledger.
    UPDATE voyage_cabin_inventory vci
    SET
        reserved_count  = COALESCE((v_derived.r_cabin_reserved  ->>(vci.cabin_type_id::TEXT))::INT, 0),
        confirmed_count = COALESCE((v_derived.r_cabin_confirmed ->>(vci.cabin_type_id::TEXT))::INT, 0)
    WHERE  vci.voyage_id = p_voyage_id;

    -- Auto-resolve stale OPEN COUNTER_DRIFT entries written by
    -- fn_detect_and_queue_counter_drift for this voyage.  The correction
    -- is now committed so those entries are no longer actionable.
    UPDATE ops_review_queue
    SET    status            = 'RESOLVED',
           resolved_at       = v_now,
           resolution_action = 'auto-corrected by fn_reconcile_counter_drift; '
                               || 'ledger_marker_seq=' || v_new_seq,
           resolved_by       = 'fn_reconcile_counter_drift'
    WHERE  voyage_id  = p_voyage_id
    AND    issue_type = 'COUNTER_DRIFT'
    AND    status     = 'OPEN';

    -- Insert a RESOLVED audit record documenting the correction.
    -- Inserted directly as RESOLVED because the corrective action is
    -- already complete; it is not an open issue requiring human action.
    INSERT INTO ops_review_queue (
        review_id, status, issue_type,
        voyage_id, detected_by, description, created_at,
        resolved_at, resolution_action, resolved_by
    ) VALUES (
        gen_random_uuid(), 'RESOLVED', 'COUNTER_DRIFT',
        p_voyage_id,
        'fn_reconcile_counter_drift',
        'Counter drift corrected for voyage ' || p_voyage_id
        || ': was(lane_res='    || v_actual.lane_meters_reserved
        || ', lane_conf='       || v_actual.lane_meters_confirmed
        || ', m2_res='          || v_actual.m2_reserved
        || ', m2_conf='         || v_actual.m2_confirmed
        || ', pax_res='         || v_actual.passengers_reserved
        || ', pax_conf='        || v_actual.passengers_confirmed
        || ') corrected_to(lane_res=' || v_derived.r_lane_meters_reserved
        || ', lane_conf='       || v_derived.r_lane_meters_confirmed
        || ', m2_res='          || v_derived.r_m2_reserved
        || ', m2_conf='         || v_derived.r_m2_confirmed
        || ', pax_res='         || v_derived.r_passengers_reserved
        || ', pax_conf='        || v_derived.r_passengers_confirmed
        || ') ledger_marker_seq=' || v_new_seq || ')',
        v_now,
        v_now,
        'auto-corrected by fn_reconcile_counter_drift; ledger_marker_seq=' || v_new_seq,
        'fn_reconcile_counter_drift'
    );
END;
$$;


-- =============================================================
-- fn_reconcile_payment_unknown
-- Processes a payment in UNKNOWN status given an authoritative
-- outcome supplied by the caller (from gateway reconciliation).
--
-- Lock order (SETTLED / FAILED):
--   voyage_capacity_counters
--   → voyage_cabin_inventory (FAILED + ACTIVE hold only)
--   → payments
--   → holds
--
-- Lock order (UNKNOWN):
--   payments only — no capacity locks acquired.
--
-- SETTLED outcome:
--   Updates payment to SETTLED.  If no booking exists and capacity
--   was not yet released (no HOLD_EXPIRED event), routes to
--   ops_review_queue for manual booking confirmation — passenger
--   details are not available in reconciliation context.
--   If HOLD_EXPIRED event exists (capacity already restored), also
--   routes to ops_review_queue.
--
-- FAILED outcome:
--   Updates payment to FAILED.  If the hold is still ACTIVE,
--   releases reserved capacity exactly as fn_expire_hold would,
--   writing a HOLD_EXPIRED ledger event.
--   If money was captured despite failure (p_amount_captured_kurus
--   IS NOT NULL), routes to ops_review_queue for manual refund.
--
-- UNKNOWN outcome:
--   Acquires only the payment lock to re-validate status, then
--   ensures one OPEN PAYMENT_UNKNOWN ops_review_queue row exists
--   via ON CONFLICT DO NOTHING (uq_orq_open_payment_unknown).
--   Does NOT acquire voyage_capacity_counters — concurrent capacity
--   operations for the voyage are not blocked.
--
-- Idempotent: exits immediately if payment is already in the
-- authoritative outcome state.
-- =============================================================

CREATE OR REPLACE FUNCTION fn_reconcile_payment_unknown(
    p_payment_id             UUID,
    p_authoritative_outcome  payment_status,
    p_amount_captured_kurus  BIGINT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    v_payment_status  payment_status;
    v_hold_id         UUID;
    v_hold_status     hold_status;
    v_voyage_id       UUID;
    v_now             TIMESTAMPTZ := clock_timestamp();
    v_event_id        CHAR(26);
    v_ledger_seq      BIGINT;
    v_req_lane        NUMERIC;
    v_req_m2          NUMERIC;
    v_req_pax         INTEGER;
BEGIN
    IF p_authoritative_outcome NOT IN ('SETTLED', 'FAILED', 'UNKNOWN') THEN
        RAISE EXCEPTION 'invalid authoritative outcome: % — must be SETTLED, FAILED, or UNKNOWN',
            p_authoritative_outcome
            USING ERRCODE = 'P0001';
    END IF;

    -- Read payment + hold info without lock (establishes lock order)
    SELECT p.status, p.hold_id
    INTO   v_payment_status, v_hold_id
    FROM   payments p
    WHERE  p.payment_id = p_payment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'payment % not found', p_payment_id
            USING ERRCODE = 'P0002';
    END IF;

    -- Idempotency: already in the target state
    IF v_payment_status = p_authoritative_outcome THEN
        RETURN;
    END IF;

    IF v_payment_status != 'UNKNOWN' THEN
        RAISE EXCEPTION
            'payment % is in % state; fn_reconcile_payment_unknown only processes UNKNOWN payments',
            p_payment_id, v_payment_status
            USING ERRCODE = 'P0001';
    END IF;

    SELECT h.voyage_id, h.status
    INTO   v_voyage_id, v_hold_status
    FROM   holds h
    WHERE  h.hold_id = v_hold_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'hold % not found for payment %', v_hold_id, p_payment_id
            USING ERRCODE = 'P0002';
    END IF;

    -- ── UNKNOWN early exit ───────────────────────────────────────────
    -- No capacity changes required.  Acquire only the payment lock to
    -- confirm the status is still UNKNOWN, then ensure one OPEN
    -- PAYMENT_UNKNOWN ops entry exists.  voyage_capacity_counters is
    -- NOT locked so no concurrent capacity operation is blocked.
    IF p_authoritative_outcome = 'UNKNOWN' THEN
        SELECT p.status
        INTO   v_payment_status
        FROM   payments p
        WHERE  p.payment_id = p_payment_id
        FOR UPDATE NOWAIT;

        -- Re-check: if another process resolved the payment concurrently, do nothing.
        IF v_payment_status != 'UNKNOWN' THEN
            RETURN;
        END IF;

        INSERT INTO ops_review_queue (
            review_id, status, issue_type,
            voyage_id, hold_id, payment_id,
            detected_by, description, created_at
        ) VALUES (
            gen_random_uuid(), 'OPEN', 'PAYMENT_UNKNOWN',
            v_voyage_id, v_hold_id, p_payment_id,
            'fn_reconcile_payment_unknown',
            'Payment ' || p_payment_id
            || ' remains UNKNOWN after reconciliation attempt; manual investigation required',
            v_now
        )
        ON CONFLICT (payment_id, issue_type)
        WHERE status = 'OPEN' AND issue_type = 'PAYMENT_UNKNOWN'
        DO NOTHING;

        RETURN;
    END IF;

    -- Lock 1: voyage_capacity_counters (SETTLED / FAILED paths only)
    PERFORM 1
    FROM   voyage_capacity_counters
    WHERE  voyage_id = v_voyage_id
    FOR UPDATE NOWAIT;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'capacity counters not found for voyage %', v_voyage_id
            USING ERRCODE = 'P0002';
    END IF;

    -- Lock 2: cabin inventory (only when releasing capacity for a FAILED + ACTIVE hold)
    IF p_authoritative_outcome = 'FAILED' AND v_hold_status = 'ACTIVE' THEN
        PERFORM 1
        FROM   voyage_cabin_inventory vci
        WHERE  vci.voyage_id = v_voyage_id
        AND    EXISTS (
            SELECT 1
            FROM   hold_items hi
            WHERE  hi.hold_id        = v_hold_id
            AND    hi.item_type      = 'CABIN'
            AND    hi.cabin_type_id  = vci.cabin_type_id
        )
        FOR UPDATE NOWAIT;
    END IF;

    -- Lock 3: payment
    SELECT p.status
    INTO   v_payment_status
    FROM   payments p
    WHERE  p.payment_id = p_payment_id
    FOR UPDATE NOWAIT;

    -- Re-check after lock
    IF v_payment_status = p_authoritative_outcome THEN
        RETURN;
    END IF;

    IF v_payment_status != 'UNKNOWN' THEN
        RAISE EXCEPTION
            'payment % status changed from UNKNOWN to % concurrently; aborting reconciliation',
            p_payment_id, v_payment_status
            USING ERRCODE = 'P0001';
    END IF;

    -- Lock 4: hold
    SELECT h.status
    INTO   v_hold_status
    FROM   holds h
    WHERE  h.hold_id = v_hold_id
    FOR UPDATE NOWAIT;

    -- ── SETTLED ──────────────────────────────────────────────────────
    IF p_authoritative_outcome = 'SETTLED' THEN

        UPDATE payments
        SET    status = 'SETTLED'
        WHERE  payment_id = p_payment_id;

        -- Booking already confirmed (concurrent path succeeded)
        IF EXISTS (SELECT 1 FROM bookings WHERE hold_id = v_hold_id) THEN
            RETURN;
        END IF;

        IF EXISTS (
            SELECT 1
            FROM   capacity_allocation_ledger
            WHERE  hold_id    = v_hold_id
            AND    event_type = 'HOLD_EXPIRED'
        ) THEN
            INSERT INTO ops_review_queue (
                review_id, status, issue_type,
                voyage_id, hold_id, payment_id,
                detected_by, description, created_at
            ) VALUES (
                gen_random_uuid(), 'OPEN', 'PAYMENT_UNKNOWN',
                v_voyage_id, v_hold_id, p_payment_id,
                'fn_reconcile_payment_unknown',
                'Payment ' || p_payment_id
                || ' reconciled as SETTLED after hold ' || v_hold_id
                || ' expired with capacity already restored; manual booking confirmation required',
                v_now
            );
            RETURN;
        END IF;

        -- Capacity still reserved; passenger data not available here
        INSERT INTO ops_review_queue (
            review_id, status, issue_type,
            voyage_id, hold_id, payment_id,
            detected_by, description, created_at
        ) VALUES (
            gen_random_uuid(), 'OPEN', 'PAYMENT_UNKNOWN',
            v_voyage_id, v_hold_id, p_payment_id,
            'fn_reconcile_payment_unknown',
            'Payment ' || p_payment_id
            || ' reconciled as SETTLED; hold ' || v_hold_id
            || ' capacity is still reserved; manual booking confirmation required '
            || 'via fn_confirm_booking_from_settled_payment',
            v_now
        );

    -- ── FAILED ───────────────────────────────────────────────────────
    ELSIF p_authoritative_outcome = 'FAILED' THEN

        UPDATE payments
        SET    status = 'FAILED'
        WHERE  payment_id = p_payment_id;

        IF v_hold_status = 'ACTIVE' THEN

            SELECT
                COALESCE(SUM(CASE WHEN item_type = 'VEHICLE'
                    THEN quantity * COALESCE(lane_meters_claimed, 0) ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN item_type = 'VEHICLE'
                    THEN quantity * COALESCE(m2_claimed, 0)          ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN item_type = 'PASSENGER'
                    THEN quantity                                     ELSE 0 END), 0)::INTEGER
            INTO v_req_lane, v_req_m2, v_req_pax
            FROM hold_items
            WHERE hold_id = v_hold_id;

            v_ledger_seq := fn_next_ledger_seq(v_voyage_id);
            v_event_id   := fn_generate_ulid();

            INSERT INTO capacity_allocation_ledger (
                event_id, ledger_seq, voyage_id, event_type,
                hold_id, booking_id,
                delta_lane_meters, delta_m2, delta_passengers,
                actor, idempotency_key, created_at
            ) VALUES (
                v_event_id, v_ledger_seq, v_voyage_id, 'HOLD_EXPIRED',
                v_hold_id, NULL,
                v_req_lane, v_req_m2, v_req_pax,
                'fn_reconcile_payment_unknown', v_event_id, v_now
            );

            INSERT INTO ledger_cabin_deltas (event_id, cabin_type_id, delta_count)
            SELECT v_event_id, hi.cabin_type_id, hi.quantity
            FROM   hold_items hi
            WHERE  hi.hold_id   = v_hold_id
            AND    hi.item_type = 'CABIN';

            UPDATE voyage_cabin_inventory vci
            SET    reserved_count = vci.reserved_count - hi.quantity
            FROM   hold_items hi
            WHERE  hi.hold_id        = v_hold_id
            AND    hi.item_type      = 'CABIN'
            AND    vci.voyage_id     = v_voyage_id
            AND    vci.cabin_type_id = hi.cabin_type_id;

            UPDATE voyage_capacity_counters
            SET
                lane_meters_reserved = lane_meters_reserved - v_req_lane,
                m2_reserved          = m2_reserved          - v_req_m2,
                passengers_reserved  = passengers_reserved  - v_req_pax,
                last_ledger_seq      = v_ledger_seq
            WHERE  voyage_id = v_voyage_id;

            UPDATE holds
            SET    status = 'EXPIRED'
            WHERE  hold_id = v_hold_id;

        END IF;

        IF p_amount_captured_kurus IS NOT NULL AND p_amount_captured_kurus > 0 THEN
            INSERT INTO ops_review_queue (
                review_id, status, issue_type,
                voyage_id, hold_id, payment_id,
                detected_by, description, created_at
            ) VALUES (
                gen_random_uuid(), 'OPEN', 'REFUND_MISMATCH',
                v_voyage_id, v_hold_id, p_payment_id,
                'fn_reconcile_payment_unknown',
                'Payment ' || p_payment_id
                || ' reconciled as FAILED but gateway reported amount captured: '
                || p_amount_captured_kurus
                || ' kurus; manual refund required',
                v_now
            );
        END IF;

    END IF;
END;
$$;
