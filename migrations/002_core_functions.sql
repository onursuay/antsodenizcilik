-- =============================================================
-- ANTSO DENİZCİLİK — CORE BOOKING FUNCTIONS
-- 002_core_functions.sql
-- =============================================================


-- Fix #7: Add HOLD_RELEASED to allocation_event_type enum
ALTER TYPE allocation_event_type ADD VALUE IF NOT EXISTS 'HOLD_RELEASED';


-- ULID generator: Crockford base32, 10-char timestamp + 16-char random
CREATE OR REPLACE FUNCTION fn_generate_ulid()
RETURNS CHAR(26)
LANGUAGE plpgsql AS $$
DECLARE
    v_alphabet  TEXT   := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    v_ms        BIGINT;
    v_result    TEXT   := '';
    i           INT;
BEGIN
    v_ms := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;

    FOR i IN 1..10 LOOP
        v_result := SUBSTR(v_alphabet, (v_ms % 32)::INT + 1, 1) || v_result;
        v_ms     := v_ms / 32;
    END LOOP;

    FOR i IN 1..16 LOOP
        v_result := v_result || SUBSTR(v_alphabet, (FLOOR(RANDOM() * 32))::INT + 1, 1);
    END LOOP;

    RETURN v_result;
END;
$$;


-- Next ledger_seq for a voyage.
-- MUST be called while voyage_capacity_counters row is locked FOR UPDATE.
-- Uses last_ledger_seq from the locked counter row — O(1), no table scan.
CREATE OR REPLACE FUNCTION fn_next_ledger_seq(p_voyage_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql AS $$
DECLARE
    v_seq BIGINT;
BEGIN
    SELECT last_ledger_seq + 1
    INTO   v_seq
    FROM   voyage_capacity_counters
    WHERE  voyage_id = p_voyage_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'capacity counters not found for voyage % in fn_next_ledger_seq', p_voyage_id
            USING ERRCODE = 'P0002';
    END IF;

    RETURN v_seq;
END;
$$;


-- =============================================================
-- fn_create_hold
-- Atomically reserves capacity and creates an ACTIVE hold.
-- Lock order: voyage_capacity_counters → voyage_cabin_inventory rows (per CABIN item)
-- =============================================================

CREATE OR REPLACE FUNCTION fn_create_hold(
    p_voyage_id         UUID,
    p_user_id           UUID,
    p_session_id        TEXT,
    p_idempotency_key   TEXT,
    p_items             JSONB,
    p_ttl_seconds       INT  DEFAULT 720
)
RETURNS TABLE(
    o_hold_id    UUID,
    o_expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql AS $$
DECLARE
    v_hold_id           UUID        := gen_random_uuid();
    v_event_id          CHAR(26);
    v_ledger_seq        BIGINT;
    v_now               TIMESTAMPTZ := clock_timestamp();
    v_expires_at        TIMESTAMPTZ;

    v_voyage_status     voyage_status;
    v_departure_utc     TIMESTAMPTZ;
    v_op_lane           NUMERIC;
    v_op_m2             NUMERIC;
    v_op_pax            INTEGER;
    v_ob_delta          INTEGER;
    v_lane_reserved     NUMERIC;
    v_lane_confirmed    NUMERIC;
    v_m2_reserved       NUMERIC;
    v_m2_confirmed      NUMERIC;
    v_pax_reserved      INTEGER;
    v_pax_confirmed     INTEGER;

    v_req_lane          NUMERIC  := 0;
    v_req_m2            NUMERIC  := 0;
    v_req_pax           INTEGER  := 0;

    v_item              JSONB;
    v_item_type         TEXT;
    v_quantity          INTEGER;
    v_cabin_type_id     UUID;
    v_cabin_count       INTEGER;
    v_cabin_available   INT;
    v_cabin_deltas      JSONB    := '[]'::JSONB;
BEGIN
    v_expires_at := v_now + (p_ttl_seconds || ' seconds')::INTERVAL;

    -- Fix #5: reject null/empty p_items before acquiring any locks
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'p_items must not be null or empty'
            USING ERRCODE = 'P0001';
    END IF;

    -- Idempotency: return existing hold if same key already committed
    SELECT h.hold_id, h.expires_at
    INTO   o_hold_id, o_expires_at
    FROM   holds h
    WHERE  h.idempotency_key = p_idempotency_key;

    IF FOUND THEN
        RETURN NEXT;
        RETURN;
    END IF;

    -- Lock voyage_capacity_counters FIRST — serialization gate for all capacity writes
    SELECT
        vcc.lane_meters_reserved,  vcc.lane_meters_confirmed,
        vcc.m2_reserved,           vcc.m2_confirmed,
        vcc.passengers_reserved,   vcc.passengers_confirmed
    INTO
        v_lane_reserved,  v_lane_confirmed,
        v_m2_reserved,    v_m2_confirmed,
        v_pax_reserved,   v_pax_confirmed
    FROM   voyage_capacity_counters vcc
    WHERE  vcc.voyage_id = p_voyage_id
    FOR UPDATE NOWAIT;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'capacity counters not found for voyage %', p_voyage_id
            USING ERRCODE = 'P0002';
    END IF;

    -- Read voyage operational limits (vessel base already validated by trigger on insert)
    SELECT v.status, v.departure_utc,
           v.operational_lane_meters, v.operational_m2,
           v.operational_passenger_capacity, v.overbooking_delta
    INTO   v_voyage_status, v_departure_utc,
           v_op_lane, v_op_m2, v_op_pax, v_ob_delta
    FROM   voyages v
    WHERE  v.voyage_id = p_voyage_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'voyage % not found', p_voyage_id
            USING ERRCODE = 'P0002';
    END IF;

    IF v_voyage_status != 'OPEN' THEN
        RAISE EXCEPTION 'voyage % is not open for booking (status: %)', p_voyage_id, v_voyage_status
            USING ERRCODE = 'P0001';
    END IF;

    IF v_departure_utc <= v_now THEN
        RAISE EXCEPTION 'voyage % has already departed at %', p_voyage_id, v_departure_utc
            USING ERRCODE = 'P0001';
    END IF;

    -- One active hold per (user_id, voyage_id) — backed by partial unique index
    IF EXISTS (
        SELECT 1 FROM holds
        WHERE  voyage_id = p_voyage_id
        AND    user_id   = p_user_id
        AND    status    = 'ACTIVE'
    ) THEN
        RAISE EXCEPTION 'user % already has an active hold on voyage %', p_user_id, p_voyage_id
            USING ERRCODE = 'P0001';
    END IF;

    -- First pass: accumulate capacity requirements; lock cabin inventory rows
    FOR v_item IN SELECT jsonb_array_elements(p_items) LOOP
        v_item_type := v_item->>'item_type';
        v_quantity  := (v_item->>'quantity')::INTEGER;

        IF v_quantity IS NULL OR v_quantity <= 0 THEN
            RAISE EXCEPTION 'item quantity must be a positive integer, got: %', v_item->>'quantity'
                USING ERRCODE = 'P0001';
        END IF;

        IF v_item_type = 'PASSENGER' THEN
            v_req_pax := v_req_pax + v_quantity;

        ELSIF v_item_type = 'VEHICLE' THEN
            IF (v_item->>'lane_meters') IS NULL OR (v_item->>'lane_meters')::NUMERIC <= 0
            OR (v_item->>'m2')          IS NULL OR (v_item->>'m2')::NUMERIC          <= 0
            THEN
                RAISE EXCEPTION 'VEHICLE item requires positive lane_meters and m2'
                    USING ERRCODE = 'P0001';
            END IF;
            -- Fix #1: multiply per-vehicle dimensions by quantity
            v_req_lane := v_req_lane + v_quantity * (v_item->>'lane_meters')::NUMERIC;
            v_req_m2   := v_req_m2   + v_quantity * (v_item->>'m2')::NUMERIC;

        ELSIF v_item_type = 'CABIN' THEN
            v_cabin_type_id := (v_item->>'cabin_type_id')::UUID;
            v_cabin_count   := v_quantity;

            IF v_cabin_type_id IS NULL THEN
                RAISE EXCEPTION 'CABIN item requires cabin_type_id'
                    USING ERRCODE = 'P0001';
            END IF;

            -- Fix #4: reject duplicate cabin_type_id within the same request
            IF EXISTS (
                SELECT 1 FROM jsonb_array_elements(v_cabin_deltas) AS e
                WHERE (e->>'cabin_type_id')::UUID = v_cabin_type_id
            ) THEN
                RAISE EXCEPTION 'duplicate cabin_type_id % in p_items', v_cabin_type_id
                    USING ERRCODE = 'P0001';
            END IF;

            -- Fix #6a: lock the row first (existence check — distinguishable error)
            PERFORM 1
            FROM   voyage_cabin_inventory
            WHERE  voyage_id     = p_voyage_id
            AND    cabin_type_id = v_cabin_type_id
            FOR UPDATE NOWAIT;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'cabin type % does not exist on voyage %',
                    v_cabin_type_id, p_voyage_id
                    USING ERRCODE = 'P0002';
            END IF;

            -- Fix #6b: check availability on the already-locked row
            SELECT (total_count - reserved_count - confirmed_count)
            INTO   v_cabin_available
            FROM   voyage_cabin_inventory
            WHERE  voyage_id     = p_voyage_id
            AND    cabin_type_id = v_cabin_type_id;

            IF v_cabin_available < v_cabin_count THEN
                RAISE EXCEPTION 'insufficient cabin availability for type % on voyage % (available: %, requested: %)',
                    v_cabin_type_id, p_voyage_id, v_cabin_available, v_cabin_count
                    USING ERRCODE = 'P0001';
            END IF;

            v_cabin_deltas := v_cabin_deltas || jsonb_build_object(
                'cabin_type_id', v_cabin_type_id,
                'delta_count',   v_cabin_count
            );

        ELSE
            RAISE EXCEPTION 'unknown item_type: %', v_item_type
                USING ERRCODE = 'P0001';
        END IF;
    END LOOP;

    -- Validate capacity in prescribed order: lane_meters → m2 → passengers
    -- Cabin availability already validated per-item above.

    IF (v_lane_reserved + v_lane_confirmed + v_req_lane) > (v_op_lane + v_ob_delta) THEN
        RAISE EXCEPTION 'insufficient lane meter capacity on voyage % (requested: %, available: %)',
            p_voyage_id, v_req_lane,
            GREATEST(0, v_op_lane + v_ob_delta - v_lane_reserved - v_lane_confirmed)
            USING ERRCODE = 'P0001';
    END IF;

    IF (v_m2_reserved + v_m2_confirmed + v_req_m2) > (v_op_m2 + v_ob_delta) THEN
        RAISE EXCEPTION 'insufficient m2 capacity on voyage % (requested: %, available: %)',
            p_voyage_id, v_req_m2,
            GREATEST(0, v_op_m2 + v_ob_delta - v_m2_reserved - v_m2_confirmed)
            USING ERRCODE = 'P0001';
    END IF;

    IF (v_pax_reserved + v_pax_confirmed + v_req_pax) > (v_op_pax + v_ob_delta) THEN
        RAISE EXCEPTION 'insufficient passenger capacity on voyage % (requested: %, available: %)',
            p_voyage_id, v_req_pax,
            GREATEST(0, v_op_pax + v_ob_delta - v_pax_reserved - v_pax_confirmed)
            USING ERRCODE = 'P0001';
    END IF;

    -- Allocate ledger position (uses last_ledger_seq from locked counter row)
    v_ledger_seq := fn_next_ledger_seq(p_voyage_id);
    v_event_id   := fn_generate_ulid();

    -- Insert hold
    INSERT INTO holds (
        hold_id, voyage_id, user_id, session_id, status,
        created_at, expires_at, idempotency_key
    ) VALUES (
        v_hold_id, p_voyage_id, p_user_id, p_session_id, 'ACTIVE',
        v_now, v_expires_at, p_idempotency_key
    );

    -- Insert hold_items (second pass — hold row must exist for FK)
    FOR v_item IN SELECT jsonb_array_elements(p_items) LOOP
        v_item_type := v_item->>'item_type';
        v_quantity  := (v_item->>'quantity')::INTEGER;

        IF v_item_type = 'PASSENGER' THEN
            INSERT INTO hold_items (hold_item_id, hold_id, item_type, quantity)
            VALUES (gen_random_uuid(), v_hold_id, 'PASSENGER', v_quantity);

        ELSIF v_item_type = 'VEHICLE' THEN
            INSERT INTO hold_items (
                hold_item_id, hold_id, item_type, quantity,
                lane_meters_claimed, m2_claimed, vehicle_type
            ) VALUES (
                gen_random_uuid(), v_hold_id, 'VEHICLE', v_quantity,
                (v_item->>'lane_meters')::NUMERIC,
                (v_item->>'m2')::NUMERIC,
                v_item->>'vehicle_type'
            );

        ELSIF v_item_type = 'CABIN' THEN
            INSERT INTO hold_items (
                hold_item_id, hold_id, item_type, quantity, cabin_type_id
            ) VALUES (
                gen_random_uuid(), v_hold_id, 'CABIN', v_quantity,
                (v_item->>'cabin_type_id')::UUID
            );
        END IF;
    END LOOP;

    -- Insert ledger row FIRST (ledger_cabin_deltas FK depends on this)
    INSERT INTO capacity_allocation_ledger (
        event_id, ledger_seq, voyage_id, event_type,
        hold_id,   booking_id,
        delta_lane_meters, delta_m2, delta_passengers,
        actor,          idempotency_key, created_at
    ) VALUES (
        v_event_id, v_ledger_seq, p_voyage_id, 'HOLD_CREATED',
        v_hold_id,  NULL,
        v_req_lane, v_req_m2, v_req_pax,
        'fn_create_hold', p_idempotency_key, v_now
    );

    -- Insert cabin deltas and update cabin inventory
    IF jsonb_array_length(v_cabin_deltas) > 0 THEN

        INSERT INTO ledger_cabin_deltas (event_id, cabin_type_id, delta_count)
        SELECT v_event_id,
               (elem->>'cabin_type_id')::UUID,
               (elem->>'delta_count')::INT
        FROM   jsonb_array_elements(v_cabin_deltas) AS elem;

        UPDATE voyage_cabin_inventory vci
        SET    reserved_count = vci.reserved_count + (elem->>'delta_count')::INT
        FROM   jsonb_array_elements(v_cabin_deltas) AS elem
        WHERE  vci.voyage_id     = p_voyage_id
        AND    vci.cabin_type_id = (elem->>'cabin_type_id')::UUID;

    END IF;

    -- Update capacity counters last (ceiling trigger fires here)
    UPDATE voyage_capacity_counters
    SET
        lane_meters_reserved = lane_meters_reserved + v_req_lane,
        m2_reserved          = m2_reserved          + v_req_m2,
        passengers_reserved  = passengers_reserved  + v_req_pax,
        last_ledger_seq      = v_ledger_seq
    WHERE  voyage_id = p_voyage_id;

    o_hold_id    := v_hold_id;
    o_expires_at := v_expires_at;
    RETURN NEXT;
END;
$$;


-- =============================================================
-- fn_expire_hold
-- Called by the TTL sweeper for holds past expires_at.
-- Lock order: voyage_capacity_counters → holds
-- If payment is PENDING or UNKNOWN: insert ops_review_queue, do NOT touch capacity.
-- Idempotent: exits cleanly if hold is already in a terminal state.
-- =============================================================

CREATE OR REPLACE FUNCTION fn_expire_hold(p_hold_id UUID)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    v_voyage_id         UUID;
    v_hold_status       hold_status;
    v_expires_at        TIMESTAMPTZ;
    v_now               TIMESTAMPTZ := clock_timestamp();
    v_event_id          CHAR(26);
    v_ledger_seq        BIGINT;
    v_payment_status    payment_status;
    v_req_lane          NUMERIC;
    v_req_m2            NUMERIC;
    v_req_pax           INTEGER;
BEGIN
    -- Read voyage_id without lock (needed to establish lock order)
    SELECT h.voyage_id, h.status, h.expires_at
    INTO   v_voyage_id, v_hold_status, v_expires_at
    FROM   holds h
    WHERE  h.hold_id = p_hold_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'hold % not found', p_hold_id
            USING ERRCODE = 'P0002';
    END IF;

    -- Idempotent: already terminal
    IF v_hold_status IN ('EXPIRED', 'RELEASED', 'CONFIRMED') THEN
        RETURN;
    END IF;

    IF v_hold_status != 'ACTIVE' THEN
        RAISE EXCEPTION 'hold % is not ACTIVE (current: %)', p_hold_id, v_hold_status
            USING ERRCODE = 'P0001';
    END IF;

    IF v_expires_at > v_now THEN
        RAISE EXCEPTION 'hold % has not yet expired (expires at %)', p_hold_id, v_expires_at
            USING ERRCODE = 'P0001';
    END IF;

    -- Lock voyage_capacity_counters FIRST
    PERFORM 1
    FROM   voyage_capacity_counters
    WHERE  voyage_id = v_voyage_id
    FOR UPDATE NOWAIT;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'capacity counters not found for voyage %', v_voyage_id
            USING ERRCODE = 'P0002';
    END IF;

    -- Lock hold (re-read state after lock)
    SELECT h.status, h.expires_at
    INTO   v_hold_status, v_expires_at
    FROM   holds h
    WHERE  h.hold_id = p_hold_id
    FOR UPDATE NOWAIT;

    -- Re-check terminal state after acquiring lock
    IF v_hold_status IN ('EXPIRED', 'RELEASED', 'CONFIRMED') THEN
        RETURN;
    END IF;

    -- Check payment state: do NOT release capacity if payment is in-flight
    SELECT p.status
    INTO   v_payment_status
    FROM   payments p
    WHERE  p.hold_id = p_hold_id;

    IF FOUND AND v_payment_status IN ('PENDING', 'UNKNOWN') THEN
        IF NOT EXISTS (
            SELECT 1 FROM ops_review_queue
            WHERE  hold_id     = p_hold_id
            AND    issue_type  = 'PAYMENT_UNKNOWN'
            AND    status      = 'OPEN'
        ) THEN
            INSERT INTO ops_review_queue (
                review_id, status, issue_type,
                voyage_id, hold_id,
                detected_by, description
            ) VALUES (
                gen_random_uuid(), 'OPEN', 'PAYMENT_UNKNOWN',
                v_voyage_id, p_hold_id,
                'fn_expire_hold',
                'Hold ' || p_hold_id || ' expired with payment in status ' || v_payment_status
                || '; capacity not released pending reconciliation'
            );
        END IF;
        RETURN;
    END IF;

    -- Aggregate capacity to release from hold_items
    -- Fix #1: multiply per-vehicle dimensions by quantity
    SELECT
        COALESCE(SUM(CASE WHEN item_type = 'VEHICLE'    THEN quantity * COALESCE(lane_meters_claimed, 0) ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN item_type = 'VEHICLE'    THEN quantity * COALESCE(m2_claimed, 0)           ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN item_type = 'PASSENGER'  THEN quantity                                     ELSE 0 END), 0)
    INTO v_req_lane, v_req_m2, v_req_pax
    FROM hold_items
    WHERE hold_id = p_hold_id;

    v_ledger_seq := fn_next_ledger_seq(v_voyage_id);
    v_event_id   := fn_generate_ulid();

    -- Ledger row FIRST
    INSERT INTO capacity_allocation_ledger (
        event_id, ledger_seq, voyage_id, event_type,
        hold_id,   booking_id,
        delta_lane_meters, delta_m2, delta_passengers,
        actor,          idempotency_key, created_at
    ) VALUES (
        v_event_id, v_ledger_seq, v_voyage_id, 'HOLD_EXPIRED',
        p_hold_id,  NULL,
        v_req_lane, v_req_m2, v_req_pax,
        'fn_expire_hold', v_event_id, v_now
    );

    -- Cabin deltas
    INSERT INTO ledger_cabin_deltas (event_id, cabin_type_id, delta_count)
    SELECT v_event_id, hi.cabin_type_id, hi.quantity
    FROM   hold_items hi
    WHERE  hi.hold_id   = p_hold_id
    AND    hi.item_type = 'CABIN';

    -- Release cabin inventory reserved counts
    UPDATE voyage_cabin_inventory vci
    SET    reserved_count = vci.reserved_count - hi.quantity
    FROM   hold_items hi
    WHERE  hi.hold_id        = p_hold_id
    AND    hi.item_type      = 'CABIN'
    AND    vci.voyage_id     = v_voyage_id
    AND    vci.cabin_type_id = hi.cabin_type_id;

    -- Release reserved counters
    UPDATE voyage_capacity_counters
    SET
        lane_meters_reserved = lane_meters_reserved - v_req_lane,
        m2_reserved          = m2_reserved          - v_req_m2,
        passengers_reserved  = passengers_reserved  - v_req_pax,
        last_ledger_seq      = v_ledger_seq
    WHERE  voyage_id = v_voyage_id;

    -- Mark hold EXPIRED
    UPDATE holds
    SET    status = 'EXPIRED'
    WHERE  hold_id = p_hold_id;
END;
$$;


-- =============================================================
-- fn_start_payment
-- Initiates or retries a payment for an ACTIVE unexpired hold.
-- Enforces one payment aggregate per hold.
-- On FAILED payment: resets to PENDING and adds a new attempt (max 2 total attempts).
-- On non-FAILED existing payment: returns it without inserting a new aggregate.
-- Lock order: holds only (no capacity change in this function)
-- =============================================================

CREATE OR REPLACE FUNCTION fn_start_payment(
    p_hold_id           UUID,
    p_amount_kurus      BIGINT,
    p_currency          CHAR(3),
    p_gateway           TEXT,
    p_idempotency_key   TEXT
)
RETURNS TABLE(
    o_payment_id    UUID,
    o_status        payment_status,
    o_is_existing   BOOLEAN
)
LANGUAGE plpgsql AS $$
DECLARE
    v_hold_status       hold_status;
    v_expires_at        TIMESTAMPTZ;
    v_now               TIMESTAMPTZ    := clock_timestamp();
    v_payment_id        UUID;
    v_payment_status    payment_status;
    v_attempt_count     INT;
BEGIN
    -- Idempotency: return existing payment for this idempotency_key scoped to this hold
    -- Fix #2: scope to hold_id to prevent cross-hold collision on the same key
    SELECT p.payment_id, p.status
    INTO   v_payment_id, v_payment_status
    FROM   payments p
    WHERE  p.idempotency_key = p_idempotency_key
    AND    p.hold_id         = p_hold_id;

    IF FOUND THEN
        o_payment_id  := v_payment_id;
        o_status      := v_payment_status;
        o_is_existing := TRUE;
        RETURN NEXT;
        RETURN;
    END IF;

    -- Lock hold
    SELECT h.status, h.expires_at
    INTO   v_hold_status, v_expires_at
    FROM   holds h
    WHERE  h.hold_id = p_hold_id
    FOR UPDATE NOWAIT;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'hold % not found', p_hold_id
            USING ERRCODE = 'P0002';
    END IF;

    IF v_hold_status != 'ACTIVE' THEN
        RAISE EXCEPTION 'hold % is not ACTIVE (current: %)', p_hold_id, v_hold_status
            USING ERRCODE = 'P0001';
    END IF;

    IF v_expires_at <= v_now THEN
        RAISE EXCEPTION 'hold % has expired; cannot start payment', p_hold_id
            USING ERRCODE = 'P0001';
    END IF;

    -- Check for existing payment aggregate on this hold
    SELECT p.payment_id, p.status
    INTO   v_payment_id, v_payment_status
    FROM   payments p
    WHERE  p.hold_id = p_hold_id;

    IF FOUND THEN
        IF v_payment_status != 'FAILED' THEN
            -- Non-failed payment exists: return it, record gateway call as new attempt
            SELECT COUNT(*)
            INTO   v_attempt_count
            FROM   payment_attempts
            WHERE  payment_id = v_payment_id;

            INSERT INTO payment_attempts (
                attempt_id, payment_id, attempt_number,
                gateway_request_id, raw_status, attempted_at
            ) VALUES (
                gen_random_uuid(), v_payment_id, v_attempt_count + 1,
                p_idempotency_key, 'INITIATED', v_now
            );

            o_payment_id  := v_payment_id;
            o_status      := v_payment_status;
            o_is_existing := TRUE;
            RETURN NEXT;
            RETURN;
        END IF;

        -- Payment is FAILED: allow exactly one retry (max 2 total attempts)
        SELECT COUNT(*)
        INTO   v_attempt_count
        FROM   payment_attempts
        WHERE  payment_id = v_payment_id;

        IF v_attempt_count >= 2 THEN
            RAISE EXCEPTION 'hold % has exhausted its retry limit; maximum 2 payment attempts allowed',
                p_hold_id
                USING ERRCODE = 'P0001';
        END IF;

        -- Reset failed payment to PENDING for retry
        UPDATE payments
        SET    status               = 'PENDING',
               gateway_reference_id = NULL,
               settled_at           = NULL
        WHERE  payment_id = v_payment_id;

        INSERT INTO payment_attempts (
            attempt_id, payment_id, attempt_number,
            gateway_request_id, raw_status, attempted_at
        ) VALUES (
            gen_random_uuid(), v_payment_id, v_attempt_count + 1,
            p_idempotency_key, 'INITIATED', v_now
        );

        o_payment_id  := v_payment_id;
        o_status      := 'PENDING';
        o_is_existing := TRUE;
        RETURN NEXT;
        RETURN;
    END IF;

    -- No existing payment: insert new payment aggregate
    v_payment_id := gen_random_uuid();

    INSERT INTO payments (
        payment_id, hold_id, booking_id, status,
        amount_kurus, currency, gateway,
        idempotency_key, created_at
    ) VALUES (
        v_payment_id, p_hold_id, NULL, 'PENDING',
        p_amount_kurus, p_currency, p_gateway,
        p_idempotency_key, v_now
    );

    INSERT INTO payment_attempts (
        attempt_id, payment_id, attempt_number,
        gateway_request_id, raw_status, attempted_at
    ) VALUES (
        gen_random_uuid(), v_payment_id, 1,
        p_idempotency_key, 'INITIATED', v_now
    );

    o_payment_id  := v_payment_id;
    o_status      := 'PENDING';
    o_is_existing := FALSE;
    RETURN NEXT;
END;
$$;


-- =============================================================
-- fn_confirm_booking_from_settled_payment
-- Converts a settled payment + active (or sweeper-blocked-expired) hold into a confirmed booking.
-- Lock order: voyage_capacity_counters → voyage_cabin_inventory rows → payments → holds
--
-- Hold EXPIRED + HOLD_EXPIRED ledger event exists  → capacity was restored → route to ops, reject.
-- Hold EXPIRED + no HOLD_EXPIRED ledger event      → sweeper was blocked by pending payment →
--                                                     capacity still reserved → safe to confirm.
-- Idempotent: returns existing booking if one already exists for the hold.
-- =============================================================

CREATE OR REPLACE FUNCTION fn_confirm_booking_from_settled_payment(
    p_payment_id    UUID,
    p_passengers    JSONB,
    p_vehicles      JSONB,
    p_cabins        JSONB
)
RETURNS TABLE(
    o_booking_id                    UUID,
    o_confirmation_ledger_event_id  CHAR(26)
)
LANGUAGE plpgsql AS $$
DECLARE
    v_hold_id               UUID;
    v_voyage_id             UUID;
    v_user_id               UUID;
    v_payment_status        payment_status;
    v_hold_status           hold_status;
    v_now                   TIMESTAMPTZ := clock_timestamp();
    v_booking_id            UUID        := gen_random_uuid();
    v_event_id              CHAR(26);
    v_ledger_seq            BIGINT;

    v_hold_expired_restored BOOLEAN;

    v_req_lane              NUMERIC;
    v_req_m2                NUMERIC;
    v_req_pax               INTEGER;

    v_item                  JSONB;
    v_cabin_type_id         UUID;
    v_cabin_count           INT;
    v_cabin_deltas          JSONB := '[]'::JSONB;
BEGIN
    -- Read hold_id and voyage_id without locks to establish correct lock order
    SELECT p.hold_id, p.status
    INTO   v_hold_id, v_payment_status
    FROM   payments p
    WHERE  p.payment_id = p_payment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'payment % not found', p_payment_id
            USING ERRCODE = 'P0002';
    END IF;

    SELECT h.voyage_id, h.user_id
    INTO   v_voyage_id, v_user_id
    FROM   holds h
    WHERE  h.hold_id = v_hold_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'hold % not found for payment %', v_hold_id, p_payment_id
            USING ERRCODE = 'P0002';
    END IF;

    -- Idempotency: booking already exists for this hold
    SELECT b.booking_id, b.confirmation_ledger_event_id
    INTO   o_booking_id, o_confirmation_ledger_event_id
    FROM   bookings b
    WHERE  b.hold_id = v_hold_id;

    IF FOUND THEN
        RETURN NEXT;
        RETURN;
    END IF;

    -- Lock voyage_capacity_counters FIRST
    PERFORM 1
    FROM   voyage_capacity_counters
    WHERE  voyage_id = v_voyage_id
    FOR UPDATE NOWAIT;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'capacity counters not found for voyage %', v_voyage_id
            USING ERRCODE = 'P0002';
    END IF;

    -- Fix #3: derive cabin allocations from hold_items (authoritative), not from p_cabins
    -- Lock cabin inventory rows in the same pass to maintain lock order
    FOR v_cabin_type_id, v_cabin_count IN
        SELECT hi.cabin_type_id, SUM(hi.quantity)::INT
        FROM   hold_items hi
        WHERE  hi.hold_id   = v_hold_id
        AND    hi.item_type = 'CABIN'
        GROUP  BY hi.cabin_type_id
    LOOP
        PERFORM 1
        FROM   voyage_cabin_inventory
        WHERE  voyage_id     = v_voyage_id
        AND    cabin_type_id = v_cabin_type_id
        FOR UPDATE NOWAIT;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'cabin inventory not found for type % on voyage %',
                v_cabin_type_id, v_voyage_id
                USING ERRCODE = 'P0002';
        END IF;

        v_cabin_deltas := v_cabin_deltas || jsonb_build_object(
            'cabin_type_id',   v_cabin_type_id,
            'count_allocated', v_cabin_count
        );
    END LOOP;

    -- Lock payment
    SELECT p.status
    INTO   v_payment_status
    FROM   payments p
    WHERE  p.payment_id = p_payment_id
    FOR UPDATE NOWAIT;

    IF v_payment_status != 'SETTLED' THEN
        RAISE EXCEPTION 'payment % is not SETTLED (current: %)', p_payment_id, v_payment_status
            USING ERRCODE = 'P0001';
    END IF;

    -- Lock hold
    SELECT h.status
    INTO   v_hold_status
    FROM   holds h
    WHERE  h.hold_id = v_hold_id
    FOR UPDATE NOWAIT;

    -- Re-check idempotency after acquiring hold lock
    IF v_hold_status = 'CONFIRMED' THEN
        SELECT b.booking_id, b.confirmation_ledger_event_id
        INTO   o_booking_id, o_confirmation_ledger_event_id
        FROM   bookings b
        WHERE  b.hold_id = v_hold_id;

        IF FOUND THEN
            RETURN NEXT;
            RETURN;
        END IF;
    END IF;

    IF v_hold_status NOT IN ('ACTIVE', 'EXPIRED') THEN
        RAISE EXCEPTION 'hold % is in non-confirmable state: %', v_hold_id, v_hold_status
            USING ERRCODE = 'P0001';
    END IF;

    -- Reconciliation path for expired holds:
    -- If HOLD_EXPIRED ledger event exists → capacity was restored → cannot confirm; route to ops.
    -- If no HOLD_EXPIRED event → sweeper was blocked by in-flight payment → capacity still reserved → safe to confirm.
    IF v_hold_status = 'EXPIRED' THEN
        SELECT EXISTS (
            SELECT 1 FROM capacity_allocation_ledger
            WHERE  hold_id    = v_hold_id
            AND    event_type = 'HOLD_EXPIRED'
        ) INTO v_hold_expired_restored;

        IF v_hold_expired_restored THEN
            INSERT INTO ops_review_queue (
                review_id, status, issue_type,
                voyage_id, hold_id, payment_id,
                detected_by, description
            ) VALUES (
                gen_random_uuid(), 'OPEN', 'PAYMENT_UNKNOWN',
                v_voyage_id, v_hold_id, p_payment_id,
                'fn_confirm_booking_from_settled_payment',
                'Payment ' || p_payment_id || ' settled after hold ' || v_hold_id
                || ' expired and capacity was restored; manual confirmation required'
            );

            RAISE EXCEPTION
                'hold % expired with capacity restored before payment % settled; routed to ops_review_queue',
                v_hold_id, p_payment_id
                USING ERRCODE = 'P0001';
        END IF;
    END IF;

    -- Aggregate reserved capacity from hold_items
    -- Fix #1: multiply per-vehicle dimensions by quantity
    SELECT
        COALESCE(SUM(CASE WHEN item_type = 'VEHICLE'   THEN quantity * COALESCE(lane_meters_claimed, 0) ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN item_type = 'VEHICLE'   THEN quantity * COALESCE(m2_claimed, 0)           ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN item_type = 'PASSENGER' THEN quantity                                     ELSE 0 END), 0)
    INTO v_req_lane, v_req_m2, v_req_pax
    FROM hold_items
    WHERE hold_id = v_hold_id;

    v_ledger_seq := fn_next_ledger_seq(v_voyage_id);
    v_event_id   := fn_generate_ulid();

    -- Insert booking
    INSERT INTO bookings (
        booking_id, voyage_id, hold_id, user_id, status,
        confirmation_ledger_event_id, confirmed_at, created_at
    ) VALUES (
        v_booking_id, v_voyage_id, v_hold_id, v_user_id, 'CONFIRMED',
        v_event_id, v_now, v_now
    );

    -- Insert booking_passengers
    IF p_passengers IS NOT NULL AND jsonb_array_length(p_passengers) > 0 THEN
        INSERT INTO booking_passengers (
            booking_passenger_id, booking_id,
            full_name, date_of_birth, document_type, document_number, nationality
        )
        SELECT
            gen_random_uuid(), v_booking_id,
            elem->>'full_name',
            (elem->>'date_of_birth')::DATE,
            elem->>'document_type',
            elem->>'document_number',
            elem->>'nationality'
        FROM jsonb_array_elements(p_passengers) AS elem;
    END IF;

    -- Insert booking_vehicles
    IF p_vehicles IS NOT NULL AND jsonb_array_length(p_vehicles) > 0 THEN
        INSERT INTO booking_vehicles (
            booking_vehicle_id, booking_id,
            plate_number, vehicle_type,
            length_cm, width_cm, height_cm, weight_kg,
            lane_meters_allocated, m2_allocated
        )
        SELECT
            gen_random_uuid(), v_booking_id,
            elem->>'plate_number',
            elem->>'vehicle_type',
            (elem->>'length_cm')::INT,
            (elem->>'width_cm')::INT,
            (elem->>'height_cm')::INT,
            (elem->>'weight_kg')::INT,
            (elem->>'lane_meters_allocated')::NUMERIC,
            (elem->>'m2_allocated')::NUMERIC
        FROM jsonb_array_elements(p_vehicles) AS elem;
    END IF;

    -- Insert booking_cabins from v_cabin_deltas (derived from hold_items, not p_cabins)
    -- Fix #3: use authoritative source, not caller-supplied p_cabins
    IF jsonb_array_length(v_cabin_deltas) > 0 THEN
        INSERT INTO booking_cabins (
            booking_cabin_id, booking_id, cabin_type_id, count_allocated
        )
        SELECT
            gen_random_uuid(), v_booking_id,
            (elem->>'cabin_type_id')::UUID,
            (elem->>'count_allocated')::INT
        FROM jsonb_array_elements(v_cabin_deltas) AS elem;
    END IF;

    -- Insert BOOKING_CONFIRMED ledger row FIRST (cabin deltas FK depends on this)
    INSERT INTO capacity_allocation_ledger (
        event_id, ledger_seq, voyage_id, event_type,
        hold_id,   booking_id,
        delta_lane_meters, delta_m2, delta_passengers,
        actor,                                     idempotency_key, created_at
    ) VALUES (
        v_event_id, v_ledger_seq, v_voyage_id, 'BOOKING_CONFIRMED',
        v_hold_id,  v_booking_id,
        v_req_lane, v_req_m2, v_req_pax,
        'fn_confirm_booking_from_settled_payment', v_event_id, v_now
    );

    -- Cabin ledger deltas
    IF jsonb_array_length(v_cabin_deltas) > 0 THEN
        INSERT INTO ledger_cabin_deltas (event_id, cabin_type_id, delta_count)
        SELECT v_event_id,
               (elem->>'cabin_type_id')::UUID,
               (elem->>'count_allocated')::INT
        FROM   jsonb_array_elements(v_cabin_deltas) AS elem;
    END IF;

    -- Move reserved → confirmed in voyage_capacity_counters
    UPDATE voyage_capacity_counters
    SET
        lane_meters_reserved  = lane_meters_reserved  - v_req_lane,
        lane_meters_confirmed = lane_meters_confirmed + v_req_lane,
        m2_reserved           = m2_reserved           - v_req_m2,
        m2_confirmed          = m2_confirmed          + v_req_m2,
        passengers_reserved   = passengers_reserved   - v_req_pax,
        passengers_confirmed  = passengers_confirmed  + v_req_pax,
        last_ledger_seq       = v_ledger_seq
    WHERE  voyage_id = v_voyage_id;

    -- Move reserved_count → confirmed_count in voyage_cabin_inventory
    IF jsonb_array_length(v_cabin_deltas) > 0 THEN
        UPDATE voyage_cabin_inventory vci
        SET
            reserved_count  = vci.reserved_count  - (elem->>'count_allocated')::INT,
            confirmed_count = vci.confirmed_count + (elem->>'count_allocated')::INT
        FROM   jsonb_array_elements(v_cabin_deltas) AS elem
        WHERE  vci.voyage_id     = v_voyage_id
        AND    vci.cabin_type_id = (elem->>'cabin_type_id')::UUID;
    END IF;

    -- Confirm hold and link to ledger event
    UPDATE holds
    SET    status                       = 'CONFIRMED',
           confirmation_ledger_event_id = v_event_id
    WHERE  hold_id = v_hold_id;

    -- Link payment to booking
    UPDATE payments
    SET    booking_id = v_booking_id
    WHERE  payment_id = p_payment_id;

    o_booking_id                   := v_booking_id;
    o_confirmation_ledger_event_id := v_event_id;
    RETURN NEXT;
END;
$$;


-- =============================================================
-- fn_release_hold
-- Explicit user-initiated pre-payment release.
-- Only ACTIVE holds may be released.
-- Rejected if any non-failed payment exists on the hold.
-- Lock order: voyage_capacity_counters → holds
-- Idempotent: exits cleanly if already RELEASED.
-- =============================================================

CREATE OR REPLACE FUNCTION fn_release_hold(p_hold_id UUID)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    v_voyage_id         UUID;
    v_hold_status       hold_status;
    v_now               TIMESTAMPTZ    := clock_timestamp();
    v_event_id          CHAR(26);
    v_ledger_seq        BIGINT;
    v_payment_status    payment_status;
    v_req_lane          NUMERIC;
    v_req_m2            NUMERIC;
    v_req_pax           INTEGER;
BEGIN
    -- Read voyage_id without lock to establish lock order
    SELECT h.voyage_id, h.status
    INTO   v_voyage_id, v_hold_status
    FROM   holds h
    WHERE  h.hold_id = p_hold_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'hold % not found', p_hold_id
            USING ERRCODE = 'P0002';
    END IF;

    -- Idempotent
    IF v_hold_status = 'RELEASED' THEN
        RETURN;
    END IF;

    IF v_hold_status != 'ACTIVE' THEN
        RAISE EXCEPTION 'hold % cannot be released from state %', p_hold_id, v_hold_status
            USING ERRCODE = 'P0001';
    END IF;

    -- Lock voyage_capacity_counters FIRST
    PERFORM 1
    FROM   voyage_capacity_counters
    WHERE  voyage_id = v_voyage_id
    FOR UPDATE NOWAIT;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'capacity counters not found for voyage %', v_voyage_id
            USING ERRCODE = 'P0002';
    END IF;

    -- Lock hold (re-read status after lock)
    SELECT h.status
    INTO   v_hold_status
    FROM   holds h
    WHERE  h.hold_id = p_hold_id
    FOR UPDATE NOWAIT;

    -- Re-check after lock
    IF v_hold_status = 'RELEASED' THEN
        RETURN;
    END IF;

    IF v_hold_status != 'ACTIVE' THEN
        RAISE EXCEPTION 'hold % is not ACTIVE (current: %) — cannot release', p_hold_id, v_hold_status
            USING ERRCODE = 'P0001';
    END IF;

    -- Block release if any non-failed payment is associated
    SELECT p.status
    INTO   v_payment_status
    FROM   payments p
    WHERE  p.hold_id = p_hold_id;

    IF FOUND AND v_payment_status IN ('PENDING', 'SETTLED', 'UNKNOWN') THEN
        RAISE EXCEPTION
            'hold % cannot be released: associated payment is in % state',
            p_hold_id, v_payment_status
            USING ERRCODE = 'P0001';
    END IF;

    -- Aggregate capacity to restore
    -- Fix #1: multiply per-vehicle dimensions by quantity
    SELECT
        COALESCE(SUM(CASE WHEN item_type = 'VEHICLE'   THEN quantity * COALESCE(lane_meters_claimed, 0) ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN item_type = 'VEHICLE'   THEN quantity * COALESCE(m2_claimed, 0)           ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN item_type = 'PASSENGER' THEN quantity                                     ELSE 0 END), 0)
    INTO v_req_lane, v_req_m2, v_req_pax
    FROM hold_items
    WHERE hold_id = p_hold_id;

    v_ledger_seq := fn_next_ledger_seq(v_voyage_id);
    v_event_id   := fn_generate_ulid();

    -- Ledger row FIRST
    INSERT INTO capacity_allocation_ledger (
        event_id, ledger_seq, voyage_id, event_type,
        hold_id,   booking_id,
        delta_lane_meters, delta_m2, delta_passengers,
        actor,           idempotency_key, created_at
    ) VALUES (
        -- Fix #7: user-initiated release gets its own event type, not HOLD_EXPIRED
        v_event_id, v_ledger_seq, v_voyage_id, 'HOLD_RELEASED',
        p_hold_id,  NULL,
        v_req_lane, v_req_m2, v_req_pax,
        'fn_release_hold', v_event_id, v_now
    );

    -- Cabin deltas
    INSERT INTO ledger_cabin_deltas (event_id, cabin_type_id, delta_count)
    SELECT v_event_id, hi.cabin_type_id, hi.quantity
    FROM   hold_items hi
    WHERE  hi.hold_id   = p_hold_id
    AND    hi.item_type = 'CABIN';

    -- Release cabin inventory reserved counts
    UPDATE voyage_cabin_inventory vci
    SET    reserved_count = vci.reserved_count - hi.quantity
    FROM   hold_items hi
    WHERE  hi.hold_id        = p_hold_id
    AND    hi.item_type      = 'CABIN'
    AND    vci.voyage_id     = v_voyage_id
    AND    vci.cabin_type_id = hi.cabin_type_id;

    -- Restore reserved counters
    UPDATE voyage_capacity_counters
    SET
        lane_meters_reserved = lane_meters_reserved - v_req_lane,
        m2_reserved          = m2_reserved          - v_req_m2,
        passengers_reserved  = passengers_reserved  - v_req_pax,
        last_ledger_seq      = v_ledger_seq
    WHERE  voyage_id = v_voyage_id;

    -- Mark hold RELEASED
    UPDATE holds
    SET    status = 'RELEASED'
    WHERE  hold_id = p_hold_id;
END;
$$;
