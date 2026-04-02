-- =============================================================
-- ANTSO DENİZCİLİK — PRODUCTION MIGRATION DDL
-- 001_initial_schema.sql
-- =============================================================


-- 1. ENUM TYPES

CREATE TYPE voyage_status AS ENUM (
    'DRAFT', 'OPEN', 'CLOSED', 'DEPARTED', 'CANCELLED'
);

CREATE TYPE hold_status AS ENUM (
    'ACTIVE', 'CONFIRMED', 'EXPIRED', 'RELEASED'
);

CREATE TYPE booking_status AS ENUM (
    'CONFIRMED', 'CHECKED_IN', 'CANCELLED'
);

CREATE TYPE payment_status AS ENUM (
    'PENDING', 'SETTLED', 'FAILED', 'UNKNOWN'
);

CREATE TYPE refund_status AS ENUM (
    'QUEUED', 'SUBMITTED', 'CONFIRMED', 'FAILED', 'MANUAL_REVIEW'
);

CREATE TYPE check_in_outcome AS ENUM (
    'APPROVED', 'DENIED'
);

CREATE TYPE allocation_event_type AS ENUM (
    'HOLD_CREATED',
    'HOLD_EXPIRED',
    'BOOKING_CONFIRMED',
    'BOOKING_CANCELLED',
    'PAYMENT_RECONCILED'
);

CREATE TYPE cancellation_scope AS ENUM (
    'FULL', 'PARTIAL'
);

CREATE TYPE partial_target_type AS ENUM (
    'PASSENGER', 'VEHICLE', 'CABIN'
);

CREATE TYPE hold_item_type AS ENUM (
    'PASSENGER', 'VEHICLE', 'CABIN'
);

CREATE TYPE ops_issue_type AS ENUM (
    'COUNTER_DRIFT',
    'PAYMENT_UNKNOWN',
    'LATE_WEBHOOK',
    'REFUND_MISMATCH',
    'ORPHAN_BOOKING',
    'HOLD_CAPACITY_LEAK',
    'RECONCILIATION_FAILURE'
);

CREATE TYPE ops_review_status AS ENUM (
    'OPEN', 'RESOLVED', 'ESCALATED'
);


-- 2. CORE TABLES

CREATE TABLE vessels (
    vessel_id               UUID            NOT NULL DEFAULT gen_random_uuid(),
    name                    TEXT            NOT NULL,
    base_lane_meters        NUMERIC(10, 2)  NOT NULL,
    base_m2                 NUMERIC(10, 2)  NOT NULL,
    base_passenger_capacity INTEGER         NOT NULL,
    commissioned_at         TIMESTAMPTZ     NOT NULL,
    decommissioned_at       TIMESTAMPTZ
);

CREATE TABLE vessel_cabin_types (
    cabin_type_id    UUID    NOT NULL DEFAULT gen_random_uuid(),
    vessel_id        UUID    NOT NULL,
    label            TEXT    NOT NULL,
    base_count       INTEGER NOT NULL,
    berths_per_cabin INTEGER NOT NULL
);

CREATE TABLE voyages (
    voyage_id                       UUID            NOT NULL DEFAULT gen_random_uuid(),
    vessel_id                       UUID            NOT NULL,
    origin_port                     TEXT            NOT NULL,
    destination_port                TEXT            NOT NULL,
    departure_utc                   TIMESTAMPTZ     NOT NULL,
    arrival_utc                     TIMESTAMPTZ     NOT NULL,
    operational_lane_meters         NUMERIC(10, 2)  NOT NULL,
    operational_m2                  NUMERIC(10, 2)  NOT NULL,
    operational_passenger_capacity  INTEGER         NOT NULL,
    overbooking_delta               INTEGER         NOT NULL DEFAULT 0,
    status                          voyage_status   NOT NULL DEFAULT 'DRAFT',
    bookings_frozen_at              TIMESTAMPTZ
);

CREATE TABLE voyage_cabin_inventory (
    voyage_id       UUID    NOT NULL,
    cabin_type_id   UUID    NOT NULL,
    total_count     INTEGER NOT NULL,
    reserved_count  INTEGER NOT NULL DEFAULT 0,
    confirmed_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE voyage_capacity_counters (
    voyage_id               UUID            NOT NULL,
    lane_meters_reserved    NUMERIC(10, 2)  NOT NULL DEFAULT 0,
    lane_meters_confirmed   NUMERIC(10, 2)  NOT NULL DEFAULT 0,
    m2_reserved             NUMERIC(10, 2)  NOT NULL DEFAULT 0,
    m2_confirmed            NUMERIC(10, 2)  NOT NULL DEFAULT 0,
    passengers_reserved     INTEGER         NOT NULL DEFAULT 0,
    passengers_confirmed    INTEGER         NOT NULL DEFAULT 0,
    last_ledger_seq         BIGINT          NOT NULL DEFAULT 0
);

CREATE TABLE capacity_allocation_ledger (
    event_id            CHAR(26)                NOT NULL,
    ledger_seq          BIGINT                  NOT NULL,
    voyage_id           UUID                    NOT NULL,
    event_type          allocation_event_type   NOT NULL,
    hold_id             UUID,
    booking_id          UUID,
    delta_lane_meters   NUMERIC(10, 2)          NOT NULL,
    delta_m2            NUMERIC(10, 2)          NOT NULL,
    delta_passengers    INTEGER                 NOT NULL,
    actor               TEXT                    NOT NULL,
    idempotency_key     TEXT                    NOT NULL,
    created_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

CREATE TABLE ledger_cabin_deltas (
    event_id        CHAR(26)    NOT NULL,
    cabin_type_id   UUID        NOT NULL,
    delta_count     INTEGER     NOT NULL
);

CREATE TABLE holds (
    hold_id                         UUID        NOT NULL DEFAULT gen_random_uuid(),
    voyage_id                       UUID        NOT NULL,
    user_id                         UUID        NOT NULL,
    session_id                      TEXT        NOT NULL,
    status                          hold_status NOT NULL DEFAULT 'ACTIVE',
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at                      TIMESTAMPTZ NOT NULL,
    confirmation_ledger_event_id    CHAR(26),
    idempotency_key                 TEXT        NOT NULL
);

CREATE TABLE hold_items (
    hold_item_id        UUID            NOT NULL DEFAULT gen_random_uuid(),
    hold_id             UUID            NOT NULL,
    item_type           hold_item_type  NOT NULL,
    quantity            INTEGER         NOT NULL,
    lane_meters_claimed NUMERIC(10, 2),
    m2_claimed          NUMERIC(10, 2),
    cabin_type_id       UUID,
    vehicle_type        TEXT
);

CREATE TABLE bookings (
    booking_id                      UUID            NOT NULL DEFAULT gen_random_uuid(),
    voyage_id                       UUID            NOT NULL,
    hold_id                         UUID            NOT NULL,
    user_id                         UUID            NOT NULL,
    status                          booking_status  NOT NULL DEFAULT 'CONFIRMED',
    confirmation_ledger_event_id    CHAR(26)        NOT NULL,
    confirmed_at                    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    cancelled_at                    TIMESTAMPTZ,
    checked_in_at                   TIMESTAMPTZ,
    created_at                      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE booking_passengers (
    booking_passenger_id    UUID    NOT NULL DEFAULT gen_random_uuid(),
    booking_id              UUID    NOT NULL,
    full_name               TEXT    NOT NULL,
    date_of_birth           DATE    NOT NULL,
    document_type           TEXT    NOT NULL,
    document_number         TEXT    NOT NULL,
    nationality             TEXT    NOT NULL
);

CREATE TABLE booking_vehicles (
    booking_vehicle_id      UUID            NOT NULL DEFAULT gen_random_uuid(),
    booking_id              UUID            NOT NULL,
    plate_number            TEXT            NOT NULL,
    vehicle_type            TEXT            NOT NULL,
    length_cm               INTEGER         NOT NULL,
    width_cm                INTEGER         NOT NULL,
    height_cm               INTEGER         NOT NULL,
    weight_kg               INTEGER         NOT NULL,
    lane_meters_allocated   NUMERIC(10, 2)  NOT NULL,
    m2_allocated            NUMERIC(10, 2)  NOT NULL
);

CREATE TABLE booking_cabins (
    booking_cabin_id    UUID    NOT NULL DEFAULT gen_random_uuid(),
    booking_id          UUID    NOT NULL,
    cabin_type_id       UUID    NOT NULL,
    count_allocated     INTEGER NOT NULL
);

CREATE TABLE payments (
    payment_id              UUID            NOT NULL DEFAULT gen_random_uuid(),
    hold_id                 UUID            NOT NULL,
    booking_id              UUID,
    status                  payment_status  NOT NULL DEFAULT 'PENDING',
    amount_kurus            BIGINT          NOT NULL,
    currency                CHAR(3)         NOT NULL,
    gateway                 TEXT            NOT NULL,
    idempotency_key         TEXT            NOT NULL,
    gateway_reference_id    TEXT,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    settled_at              TIMESTAMPTZ
);

CREATE TABLE payment_attempts (
    attempt_id          UUID        NOT NULL DEFAULT gen_random_uuid(),
    payment_id          UUID        NOT NULL,
    attempt_number      INTEGER     NOT NULL,
    gateway_request_id  TEXT        NOT NULL,
    raw_status          TEXT        NOT NULL,
    response_code       TEXT,
    attempted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cancellation_records (
    cancellation_record_id          UUID                NOT NULL DEFAULT gen_random_uuid(),
    booking_id                      UUID                NOT NULL,
    scope                           cancellation_scope  NOT NULL,
    partial_target_type             partial_target_type,
    partial_target_id               UUID,
    initiated_by                    TEXT                NOT NULL,
    initiated_at                    TIMESTAMPTZ         NOT NULL,
    effective_at                    TIMESTAMPTZ         NOT NULL,
    cancellation_ledger_event_id    CHAR(26)            NOT NULL
);

CREATE TABLE refund_records (
    refund_id                   UUID            NOT NULL DEFAULT gen_random_uuid(),
    payment_id                  UUID            NOT NULL,
    cancellation_record_id      UUID            NOT NULL,
    booking_id                  UUID            NOT NULL,
    status                      refund_status   NOT NULL DEFAULT 'QUEUED',
    amount_kurus                BIGINT          NOT NULL,
    currency                    CHAR(3)         NOT NULL,
    gateway_refund_reference    TEXT,
    queued_at                   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    confirmed_at                TIMESTAMPTZ
);

CREATE TABLE check_in_records (
    check_in_record_id  UUID                NOT NULL DEFAULT gen_random_uuid(),
    booking_id          UUID                NOT NULL,
    outcome             check_in_outcome    NOT NULL,
    operator_id         TEXT                NOT NULL,
    document_verified   BOOLEAN             NOT NULL,
    denial_reason       TEXT,
    attempted_at        TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE TABLE ops_review_queue (
    review_id           UUID                NOT NULL DEFAULT gen_random_uuid(),
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    resolved_at         TIMESTAMPTZ,
    status              ops_review_status   NOT NULL DEFAULT 'OPEN',
    issue_type          ops_issue_type      NOT NULL,
    voyage_id           UUID,
    hold_id             UUID,
    booking_id          UUID,
    payment_id          UUID,
    refund_id           UUID,
    detected_by         TEXT                NOT NULL,
    description         TEXT                NOT NULL,
    resolution_action   TEXT,
    resolved_by         TEXT
);


-- 3. PRIMARY KEYS

ALTER TABLE vessels
    ADD CONSTRAINT pk_vessels
        PRIMARY KEY (vessel_id);

ALTER TABLE vessel_cabin_types
    ADD CONSTRAINT pk_vessel_cabin_types
        PRIMARY KEY (cabin_type_id);

ALTER TABLE voyages
    ADD CONSTRAINT pk_voyages
        PRIMARY KEY (voyage_id);

ALTER TABLE voyage_cabin_inventory
    ADD CONSTRAINT pk_voyage_cabin_inventory
        PRIMARY KEY (voyage_id, cabin_type_id);

ALTER TABLE voyage_capacity_counters
    ADD CONSTRAINT pk_voyage_capacity_counters
        PRIMARY KEY (voyage_id);

ALTER TABLE capacity_allocation_ledger
    ADD CONSTRAINT pk_capacity_allocation_ledger
        PRIMARY KEY (event_id);

ALTER TABLE ledger_cabin_deltas
    ADD CONSTRAINT pk_ledger_cabin_deltas
        PRIMARY KEY (event_id, cabin_type_id);

ALTER TABLE holds
    ADD CONSTRAINT pk_holds
        PRIMARY KEY (hold_id);

ALTER TABLE hold_items
    ADD CONSTRAINT pk_hold_items
        PRIMARY KEY (hold_item_id);

ALTER TABLE bookings
    ADD CONSTRAINT pk_bookings
        PRIMARY KEY (booking_id);

ALTER TABLE booking_passengers
    ADD CONSTRAINT pk_booking_passengers
        PRIMARY KEY (booking_passenger_id);

ALTER TABLE booking_vehicles
    ADD CONSTRAINT pk_booking_vehicles
        PRIMARY KEY (booking_vehicle_id);

ALTER TABLE booking_cabins
    ADD CONSTRAINT pk_booking_cabins
        PRIMARY KEY (booking_cabin_id);

ALTER TABLE payments
    ADD CONSTRAINT pk_payments
        PRIMARY KEY (payment_id);

ALTER TABLE payment_attempts
    ADD CONSTRAINT pk_payment_attempts
        PRIMARY KEY (attempt_id);

ALTER TABLE cancellation_records
    ADD CONSTRAINT pk_cancellation_records
        PRIMARY KEY (cancellation_record_id);

ALTER TABLE refund_records
    ADD CONSTRAINT pk_refund_records
        PRIMARY KEY (refund_id);

ALTER TABLE check_in_records
    ADD CONSTRAINT pk_check_in_records
        PRIMARY KEY (check_in_record_id);

ALTER TABLE ops_review_queue
    ADD CONSTRAINT pk_ops_review_queue
        PRIMARY KEY (review_id);


-- 4. FOREIGN KEYS
-- All foreign keys use ON DELETE RESTRICT.
-- user_id fields carry no FK — they are external auth references only.

ALTER TABLE vessel_cabin_types
    ADD CONSTRAINT fk_vct_vessel
        FOREIGN KEY (vessel_id)
            REFERENCES vessels (vessel_id) ON DELETE RESTRICT;

ALTER TABLE voyages
    ADD CONSTRAINT fk_voyages_vessel
        FOREIGN KEY (vessel_id)
            REFERENCES vessels (vessel_id) ON DELETE RESTRICT;

ALTER TABLE voyage_cabin_inventory
    ADD CONSTRAINT fk_vci_voyage
        FOREIGN KEY (voyage_id)
            REFERENCES voyages (voyage_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_vci_cabin_type
        FOREIGN KEY (cabin_type_id)
            REFERENCES vessel_cabin_types (cabin_type_id) ON DELETE RESTRICT;

ALTER TABLE voyage_capacity_counters
    ADD CONSTRAINT fk_vcc_voyage
        FOREIGN KEY (voyage_id)
            REFERENCES voyages (voyage_id) ON DELETE RESTRICT;

ALTER TABLE capacity_allocation_ledger
    ADD CONSTRAINT fk_cal_voyage
        FOREIGN KEY (voyage_id)
            REFERENCES voyages (voyage_id) ON DELETE RESTRICT;

ALTER TABLE ledger_cabin_deltas
    ADD CONSTRAINT fk_lcd_event
        FOREIGN KEY (event_id)
            REFERENCES capacity_allocation_ledger (event_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_lcd_cabin_type
        FOREIGN KEY (cabin_type_id)
            REFERENCES vessel_cabin_types (cabin_type_id) ON DELETE RESTRICT;

ALTER TABLE holds
    ADD CONSTRAINT fk_holds_voyage
        FOREIGN KEY (voyage_id)
            REFERENCES voyages (voyage_id) ON DELETE RESTRICT;

ALTER TABLE hold_items
    ADD CONSTRAINT fk_hi_hold
        FOREIGN KEY (hold_id)
            REFERENCES holds (hold_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_hi_cabin_type
        FOREIGN KEY (cabin_type_id)
            REFERENCES vessel_cabin_types (cabin_type_id) ON DELETE RESTRICT;

ALTER TABLE bookings
    ADD CONSTRAINT fk_bookings_voyage
        FOREIGN KEY (voyage_id)
            REFERENCES voyages (voyage_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_bookings_hold
        FOREIGN KEY (hold_id)
            REFERENCES holds (hold_id) ON DELETE RESTRICT;

ALTER TABLE booking_passengers
    ADD CONSTRAINT fk_bp_booking
        FOREIGN KEY (booking_id)
            REFERENCES bookings (booking_id) ON DELETE RESTRICT;

ALTER TABLE booking_vehicles
    ADD CONSTRAINT fk_bv_booking
        FOREIGN KEY (booking_id)
            REFERENCES bookings (booking_id) ON DELETE RESTRICT;

ALTER TABLE booking_cabins
    ADD CONSTRAINT fk_bc_booking
        FOREIGN KEY (booking_id)
            REFERENCES bookings (booking_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_bc_cabin_type
        FOREIGN KEY (cabin_type_id)
            REFERENCES vessel_cabin_types (cabin_type_id) ON DELETE RESTRICT;

ALTER TABLE payments
    ADD CONSTRAINT fk_payments_hold
        FOREIGN KEY (hold_id)
            REFERENCES holds (hold_id) ON DELETE RESTRICT;

ALTER TABLE payment_attempts
    ADD CONSTRAINT fk_pa_payment
        FOREIGN KEY (payment_id)
            REFERENCES payments (payment_id) ON DELETE RESTRICT;

ALTER TABLE cancellation_records
    ADD CONSTRAINT fk_cr_booking
        FOREIGN KEY (booking_id)
            REFERENCES bookings (booking_id) ON DELETE RESTRICT;

ALTER TABLE refund_records
    ADD CONSTRAINT fk_rr_payment
        FOREIGN KEY (payment_id)
            REFERENCES payments (payment_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_rr_cancellation_record
        FOREIGN KEY (cancellation_record_id)
            REFERENCES cancellation_records (cancellation_record_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_rr_booking
        FOREIGN KEY (booking_id)
            REFERENCES bookings (booking_id) ON DELETE RESTRICT;

ALTER TABLE check_in_records
    ADD CONSTRAINT fk_cir_booking
        FOREIGN KEY (booking_id)
            REFERENCES bookings (booking_id) ON DELETE RESTRICT;


-- 5. UNIQUE CONSTRAINTS

ALTER TABLE capacity_allocation_ledger
    ADD CONSTRAINT uq_cal_voyage_ledger_seq
        UNIQUE (voyage_id, ledger_seq),
    ADD CONSTRAINT uq_cal_idempotency_key
        UNIQUE (idempotency_key);

ALTER TABLE holds
    ADD CONSTRAINT uq_holds_idempotency_key
        UNIQUE (idempotency_key);

ALTER TABLE bookings
    ADD CONSTRAINT uq_bookings_hold_id
        UNIQUE (hold_id);

ALTER TABLE payments
    ADD CONSTRAINT uq_payments_hold_id
        UNIQUE (hold_id),
    ADD CONSTRAINT uq_payments_idempotency_key
        UNIQUE (idempotency_key);

ALTER TABLE payment_attempts
    ADD CONSTRAINT uq_pa_payment_attempt_number
        UNIQUE (payment_id, attempt_number);

ALTER TABLE refund_records
    ADD CONSTRAINT uq_rr_cancellation_record_id
        UNIQUE (cancellation_record_id);


-- 6. NATIVE CHECK CONSTRAINTS

ALTER TABLE vessels
    ADD CONSTRAINT chk_vessels_base_lane_meters
        CHECK (base_lane_meters > 0),
    ADD CONSTRAINT chk_vessels_base_m2
        CHECK (base_m2 > 0),
    ADD CONSTRAINT chk_vessels_base_pax
        CHECK (base_passenger_capacity > 0);

ALTER TABLE vessel_cabin_types
    ADD CONSTRAINT chk_vct_base_count
        CHECK (base_count > 0),
    ADD CONSTRAINT chk_vct_berths
        CHECK (berths_per_cabin > 0);

ALTER TABLE voyages
    ADD CONSTRAINT chk_voyages_overbooking_delta
        CHECK (overbooking_delta >= 0),
    ADD CONSTRAINT chk_voyages_op_lane_meters
        CHECK (operational_lane_meters > 0),
    ADD CONSTRAINT chk_voyages_op_m2
        CHECK (operational_m2 > 0),
    ADD CONSTRAINT chk_voyages_op_pax
        CHECK (operational_passenger_capacity > 0),
    ADD CONSTRAINT chk_voyages_departure_arrival
        CHECK (arrival_utc > departure_utc);

ALTER TABLE voyage_cabin_inventory
    ADD CONSTRAINT chk_vci_total_count
        CHECK (total_count > 0),
    ADD CONSTRAINT chk_vci_reserved
        CHECK (reserved_count >= 0),
    ADD CONSTRAINT chk_vci_confirmed
        CHECK (confirmed_count >= 0),
    ADD CONSTRAINT chk_vci_ceiling
        CHECK (reserved_count + confirmed_count <= total_count);

ALTER TABLE voyage_capacity_counters
    ADD CONSTRAINT chk_vcc_lane_reserved
        CHECK (lane_meters_reserved >= 0),
    ADD CONSTRAINT chk_vcc_lane_confirmed
        CHECK (lane_meters_confirmed >= 0),
    ADD CONSTRAINT chk_vcc_m2_reserved
        CHECK (m2_reserved >= 0),
    ADD CONSTRAINT chk_vcc_m2_confirmed
        CHECK (m2_confirmed >= 0),
    ADD CONSTRAINT chk_vcc_pax_reserved
        CHECK (passengers_reserved >= 0),
    ADD CONSTRAINT chk_vcc_pax_confirmed
        CHECK (passengers_confirmed >= 0);

ALTER TABLE holds
    ADD CONSTRAINT chk_holds_ttl
        CHECK (expires_at > created_at);

ALTER TABLE hold_items
    ADD CONSTRAINT chk_hi_quantity
        CHECK (quantity > 0),
    ADD CONSTRAINT chk_hi_vehicle_dims
        CHECK (
            item_type != 'VEHICLE'
            OR (
                lane_meters_claimed IS NOT NULL AND
                m2_claimed          IS NOT NULL AND
                lane_meters_claimed > 0          AND
                m2_claimed          > 0
            )
        ),
    ADD CONSTRAINT chk_hi_cabin_type
        CHECK (
            item_type != 'CABIN' OR cabin_type_id IS NOT NULL
        );

ALTER TABLE booking_vehicles
    ADD CONSTRAINT chk_bv_lane_meters
        CHECK (lane_meters_allocated > 0),
    ADD CONSTRAINT chk_bv_m2
        CHECK (m2_allocated > 0),
    ADD CONSTRAINT chk_bv_length
        CHECK (length_cm > 0),
    ADD CONSTRAINT chk_bv_width
        CHECK (width_cm > 0),
    ADD CONSTRAINT chk_bv_height
        CHECK (height_cm > 0),
    ADD CONSTRAINT chk_bv_weight
        CHECK (weight_kg > 0);

ALTER TABLE booking_cabins
    ADD CONSTRAINT chk_bc_count_allocated
        CHECK (count_allocated > 0);

ALTER TABLE payments
    ADD CONSTRAINT chk_payments_amount
        CHECK (amount_kurus > 0);

ALTER TABLE cancellation_records
    ADD CONSTRAINT chk_cr_partial_consistency
        CHECK (
            (
                scope = 'PARTIAL'
                AND partial_target_type IS NOT NULL
                AND partial_target_id   IS NOT NULL
            )
            OR
            (
                scope = 'FULL'
                AND partial_target_type IS NULL
                AND partial_target_id   IS NULL
            )
        );

ALTER TABLE refund_records
    ADD CONSTRAINT chk_rr_amount_kurus
        CHECK (amount_kurus > 0);

ALTER TABLE check_in_records
    ADD CONSTRAINT chk_cir_denial_reason
        CHECK (
            outcome != 'DENIED' OR denial_reason IS NOT NULL
        );

ALTER TABLE ops_review_queue
    ADD CONSTRAINT chk_orq_resolved_consistency
        CHECK (
            status = 'OPEN' OR resolved_at IS NOT NULL
        );


-- 7. INDEXES

-- Ledger replay — primary ordering index; every capacity reconstruction uses this
CREATE INDEX idx_cal_voyage_seq
    ON capacity_allocation_ledger (voyage_id, ledger_seq ASC);

-- Ledger lookup by hold and booking — used during reconciliation
CREATE INDEX idx_cal_hold_id
    ON capacity_allocation_ledger (hold_id)
    WHERE hold_id IS NOT NULL;

CREATE INDEX idx_cal_booking_id
    ON capacity_allocation_ledger (booking_id)
    WHERE booking_id IS NOT NULL;

-- Cabin delta join from ledger replay
CREATE INDEX idx_lcd_event_id
    ON ledger_cabin_deltas (event_id);

-- Partial unique: one active hold per (user_id, voyage_id)
CREATE UNIQUE INDEX idx_holds_one_active_per_user_voyage
    ON holds (user_id, voyage_id)
    WHERE status = 'ACTIVE';

-- Sweeper: find holds approaching or past TTL
CREATE INDEX idx_holds_expires_at
    ON holds (expires_at)
    WHERE status = 'ACTIVE';

-- Voyage-level hold queries
CREATE INDEX idx_holds_voyage_status
    ON holds (voyage_id, status);

-- Voyage manifest and capacity dashboards
CREATE INDEX idx_bookings_voyage_status
    ON bookings (voyage_id, status);

-- User booking history
CREATE INDEX idx_bookings_user_id
    ON bookings (user_id);

-- Reconciliation worker: unknown payments requiring resolution
CREATE INDEX idx_payments_unknown
    ON payments (status)
    WHERE status = 'UNKNOWN';

-- Refund processor: open refund queue
CREATE INDEX idx_refund_records_open
    ON refund_records (status)
    WHERE status IN ('QUEUED', 'SUBMITTED');

-- Cancellation and check-in audit lookups
CREATE INDEX idx_cancellation_records_booking
    ON cancellation_records (booking_id);

CREATE INDEX idx_check_in_records_booking
    ON check_in_records (booking_id);

-- Voyage schedule queries
CREATE INDEX idx_voyages_departure_status
    ON voyages (departure_utc, status);

-- ops_review_queue: reconciliation worker polling and voyage-scoped review
CREATE INDEX idx_ops_review_queue_open
    ON ops_review_queue (status, issue_type)
    WHERE status = 'OPEN';

CREATE INDEX idx_ops_review_queue_voyage
    ON ops_review_queue (voyage_id, created_at)
    WHERE voyage_id IS NOT NULL;


-- 8. TRIGGER FUNCTIONS

-- Shared append-only enforcement for all immutable tables
CREATE OR REPLACE FUNCTION trg_fn_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION
        'table % is append-only: % is forbidden',
        TG_TABLE_NAME, TG_OP;
END;
$$;

-- ops_review_queue: core issue columns immutable after insert;
-- only status, resolved_at, resolution_action, resolved_by may change
CREATE OR REPLACE FUNCTION trg_fn_ops_review_queue_core_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.issue_type    IS DISTINCT FROM OLD.issue_type    OR
       NEW.voyage_id     IS DISTINCT FROM OLD.voyage_id     OR
       NEW.hold_id       IS DISTINCT FROM OLD.hold_id       OR
       NEW.booking_id    IS DISTINCT FROM OLD.booking_id    OR
       NEW.payment_id    IS DISTINCT FROM OLD.payment_id    OR
       NEW.refund_id     IS DISTINCT FROM OLD.refund_id     OR
       NEW.detected_by   IS DISTINCT FROM OLD.detected_by   OR
       NEW.description   IS DISTINCT FROM OLD.description   OR
       NEW.created_at    IS DISTINCT FROM OLD.created_at
    THEN
        RAISE EXCEPTION
            'core columns of ops_review_queue are immutable after insert (review_id: %)',
            OLD.review_id;
    END IF;
    RETURN NEW;
END;
$$;

-- bookings: allocation-affecting fields immutable after confirmation;
-- only status, cancelled_at, checked_in_at may change
CREATE OR REPLACE FUNCTION trg_fn_bookings_allocation_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.voyage_id                    IS DISTINCT FROM OLD.voyage_id                    OR
       NEW.hold_id                      IS DISTINCT FROM OLD.hold_id                      OR
       NEW.user_id                      IS DISTINCT FROM OLD.user_id                      OR
       NEW.confirmation_ledger_event_id IS DISTINCT FROM OLD.confirmation_ledger_event_id OR
       NEW.confirmed_at                 IS DISTINCT FROM OLD.confirmed_at                 OR
       NEW.created_at                   IS DISTINCT FROM OLD.created_at
    THEN
        RAISE EXCEPTION
            'allocation-affecting fields on booking % are immutable after confirmation',
            OLD.booking_id;
    END IF;
    RETURN NEW;
END;
$$;

-- voyages: operational capacity snapshot must not exceed vessel base values
CREATE OR REPLACE FUNCTION trg_fn_voyage_operational_capacity_check()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_base_lane NUMERIC;
    v_base_m2   NUMERIC;
    v_base_pax  INTEGER;
BEGIN
    SELECT base_lane_meters,
           base_m2,
           base_passenger_capacity
    INTO   v_base_lane, v_base_m2, v_base_pax
    FROM   vessels
    WHERE  vessel_id = NEW.vessel_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'vessel % not found during operational capacity check',
            NEW.vessel_id;
    END IF;

    IF NEW.operational_lane_meters > v_base_lane THEN
        RAISE EXCEPTION
            'operational_lane_meters (%) exceeds vessel base (%) for vessel %',
            NEW.operational_lane_meters, v_base_lane, NEW.vessel_id;
    END IF;

    IF NEW.operational_m2 > v_base_m2 THEN
        RAISE EXCEPTION
            'operational_m2 (%) exceeds vessel base (%) for vessel %',
            NEW.operational_m2, v_base_m2, NEW.vessel_id;
    END IF;

    IF NEW.operational_passenger_capacity > v_base_pax THEN
        RAISE EXCEPTION
            'operational_passenger_capacity (%) exceeds vessel base (%) for vessel %',
            NEW.operational_passenger_capacity, v_base_pax, NEW.vessel_id;
    END IF;

    RETURN NEW;
END;
$$;

-- voyage_cabin_inventory: total_count immutable once any booking exists for the voyage
CREATE OR REPLACE FUNCTION trg_fn_voyage_cabin_inventory_total_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.total_count IS DISTINCT FROM OLD.total_count THEN
        IF EXISTS (
            SELECT 1
            FROM   bookings
            WHERE  voyage_id = NEW.voyage_id
            LIMIT  1
        ) THEN
            RAISE EXCEPTION
                'total_count is immutable on voyage_cabin_inventory after bookings exist for voyage %',
                NEW.voyage_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- ledger_cabin_deltas: cabin_type must belong to the vessel of the parent ledger event's voyage
CREATE OR REPLACE FUNCTION trg_fn_ledger_cabin_deltas_vessel_check()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_vessel_id       UUID;
    v_cabin_vessel_id UUID;
BEGIN
    SELECT v.vessel_id
    INTO   v_vessel_id
    FROM   capacity_allocation_ledger cal
    JOIN   voyages v ON v.voyage_id = cal.voyage_id
    WHERE  cal.event_id = NEW.event_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'parent ledger event % has no associated voyage',
            NEW.event_id;
    END IF;

    SELECT vessel_id
    INTO   v_cabin_vessel_id
    FROM   vessel_cabin_types
    WHERE  cabin_type_id = NEW.cabin_type_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'cabin_type_id % does not exist in vessel_cabin_types',
            NEW.cabin_type_id;
    END IF;

    IF v_cabin_vessel_id IS DISTINCT FROM v_vessel_id THEN
        RAISE EXCEPTION
            'cabin_type_id % belongs to vessel % but ledger event % belongs to vessel %',
            NEW.cabin_type_id, v_cabin_vessel_id, NEW.event_id, v_vessel_id;
    END IF;

    RETURN NEW;
END;
$$;

-- voyage_capacity_counters: counter totals must not exceed voyage operational capacity + overbooking_delta
-- This is a trigger-enforced invariant; a native CHECK cannot reference a separate table.
CREATE OR REPLACE FUNCTION trg_fn_voyage_capacity_counters_ceiling()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_op_lane  NUMERIC;
    v_op_m2    NUMERIC;
    v_op_pax   INTEGER;
    v_ob_delta INTEGER;
BEGIN
    SELECT operational_lane_meters,
           operational_m2,
           operational_passenger_capacity,
           overbooking_delta
    INTO   v_op_lane, v_op_m2, v_op_pax, v_ob_delta
    FROM   voyages
    WHERE  voyage_id = NEW.voyage_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'voyage % not found during capacity ceiling check',
            NEW.voyage_id;
    END IF;

    IF (NEW.lane_meters_reserved + NEW.lane_meters_confirmed) > (v_op_lane + v_ob_delta) THEN
        RAISE EXCEPTION
            'lane_meters ceiling breached for voyage %: reserved(%) + confirmed(%) > operational(%) + overbooking(%)',
            NEW.voyage_id,
            NEW.lane_meters_reserved, NEW.lane_meters_confirmed,
            v_op_lane, v_ob_delta;
    END IF;

    IF (NEW.m2_reserved + NEW.m2_confirmed) > (v_op_m2 + v_ob_delta) THEN
        RAISE EXCEPTION
            'm2 ceiling breached for voyage %: reserved(%) + confirmed(%) > operational(%) + overbooking(%)',
            NEW.voyage_id,
            NEW.m2_reserved, NEW.m2_confirmed,
            v_op_m2, v_ob_delta;
    END IF;

    IF (NEW.passengers_reserved + NEW.passengers_confirmed) > (v_op_pax + v_ob_delta) THEN
        RAISE EXCEPTION
            'passenger ceiling breached for voyage %: reserved(%) + confirmed(%) > operational(%) + overbooking(%)',
            NEW.voyage_id,
            NEW.passengers_reserved, NEW.passengers_confirmed,
            v_op_pax, v_ob_delta;
    END IF;

    RETURN NEW;
END;
$$;


-- 9. TRIGGERS

-- Append-only enforcement
CREATE TRIGGER trg_ledger_append_only
    BEFORE UPDATE OR DELETE ON capacity_allocation_ledger
    FOR EACH ROW EXECUTE FUNCTION trg_fn_append_only();

CREATE TRIGGER trg_ledger_cabin_deltas_append_only
    BEFORE UPDATE OR DELETE ON ledger_cabin_deltas
    FOR EACH ROW EXECUTE FUNCTION trg_fn_append_only();

CREATE TRIGGER trg_payment_attempts_append_only
    BEFORE UPDATE OR DELETE ON payment_attempts
    FOR EACH ROW EXECUTE FUNCTION trg_fn_append_only();

CREATE TRIGGER trg_cancellation_records_append_only
    BEFORE UPDATE OR DELETE ON cancellation_records
    FOR EACH ROW EXECUTE FUNCTION trg_fn_append_only();

CREATE TRIGGER trg_check_in_records_append_only
    BEFORE UPDATE OR DELETE ON check_in_records
    FOR EACH ROW EXECUTE FUNCTION trg_fn_append_only();

-- ops_review_queue: only lifecycle fields may be updated
CREATE TRIGGER trg_ops_review_queue_core_immutable
    BEFORE UPDATE ON ops_review_queue
    FOR EACH ROW EXECUTE FUNCTION trg_fn_ops_review_queue_core_immutable();

-- bookings: allocation fields immutable after confirmation
CREATE TRIGGER trg_bookings_allocation_immutable
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION trg_fn_bookings_allocation_immutable();

-- voyages: operational snapshot must not exceed vessel base
CREATE TRIGGER trg_voyage_operational_capacity_check
    BEFORE INSERT OR UPDATE OF
        operational_lane_meters,
        operational_m2,
        operational_passenger_capacity,
        vessel_id
    ON voyages
    FOR EACH ROW EXECUTE FUNCTION trg_fn_voyage_operational_capacity_check();

-- voyage_cabin_inventory: total_count locked after first booking
CREATE TRIGGER trg_voyage_cabin_inventory_total_immutable
    BEFORE UPDATE OF total_count ON voyage_cabin_inventory
    FOR EACH ROW EXECUTE FUNCTION trg_fn_voyage_cabin_inventory_total_immutable();

-- ledger_cabin_deltas: cabin must belong to the voyage's vessel
CREATE TRIGGER trg_ledger_cabin_deltas_vessel_check
    BEFORE INSERT ON ledger_cabin_deltas
    FOR EACH ROW EXECUTE FUNCTION trg_fn_ledger_cabin_deltas_vessel_check();

-- voyage_capacity_counters: enforce ceiling on every write
CREATE TRIGGER trg_voyage_capacity_counters_ceiling
    BEFORE INSERT OR UPDATE ON voyage_capacity_counters
    FOR EACH ROW EXECUTE FUNCTION trg_fn_voyage_capacity_counters_ceiling();


-- =============================================================
-- AUDIT FIXES — applied after initial schema
-- =============================================================


-- FIX 1: TRUNCATE protection for append-only tables
-- Row-level triggers do not fire on TRUNCATE; statement-level triggers required.

CREATE TRIGGER trg_ledger_no_truncate
    BEFORE TRUNCATE ON capacity_allocation_ledger
    FOR EACH STATEMENT EXECUTE FUNCTION trg_fn_append_only();

CREATE TRIGGER trg_ledger_cabin_deltas_no_truncate
    BEFORE TRUNCATE ON ledger_cabin_deltas
    FOR EACH STATEMENT EXECUTE FUNCTION trg_fn_append_only();


-- FIX 2: Missing FK payments.booking_id -> bookings.booking_id

ALTER TABLE payments
    ADD CONSTRAINT fk_payments_booking
        FOREIGN KEY (booking_id)
            REFERENCES bookings (booking_id) ON DELETE RESTRICT;


-- FIX 3: Missing FKs for ledger event references on CHAR(26) columns

ALTER TABLE bookings
    ADD CONSTRAINT fk_bookings_confirmation_event
        FOREIGN KEY (confirmation_ledger_event_id)
            REFERENCES capacity_allocation_ledger (event_id) ON DELETE RESTRICT;

ALTER TABLE holds
    ADD CONSTRAINT fk_holds_confirmation_event
        FOREIGN KEY (confirmation_ledger_event_id)
            REFERENCES capacity_allocation_ledger (event_id) ON DELETE RESTRICT;

ALTER TABLE cancellation_records
    ADD CONSTRAINT fk_cr_cancellation_event
        FOREIGN KEY (cancellation_ledger_event_id)
            REFERENCES capacity_allocation_ledger (event_id) ON DELETE RESTRICT;


-- FIX 4: Missing uniqueness on vessel_cabin_types (vessel_id, label)

ALTER TABLE vessel_cabin_types
    ADD CONSTRAINT uq_vct_vessel_label
        UNIQUE (vessel_id, label);


-- FIX 5: Missing FK-support indexes on child table booking_id / hold_id columns

CREATE INDEX idx_booking_passengers_booking_id
    ON booking_passengers (booking_id);

CREATE INDEX idx_booking_vehicles_booking_id
    ON booking_vehicles (booking_id);

CREATE INDEX idx_booking_cabins_booking_id
    ON booking_cabins (booking_id);

CREATE INDEX idx_hold_items_hold_id
    ON hold_items (hold_id);


-- FIX 6: Auto-create voyage_capacity_counters row on voyage insert
-- Without this, SELECT FOR UPDATE NOWAIT returns 0 rows, bypassing all capacity enforcement.

CREATE OR REPLACE FUNCTION trg_fn_voyage_create_counter()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO voyage_capacity_counters (voyage_id)
    VALUES (NEW.voyage_id)
    ON CONFLICT (voyage_id) DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_voyage_create_counter
    AFTER INSERT ON voyages
    FOR EACH ROW EXECUTE FUNCTION trg_fn_voyage_create_counter();


-- FIX 7: Missing index on refund_records(payment_id)

CREATE INDEX idx_refund_records_payment_id
    ON refund_records (payment_id);


-- FIX 8: Vessel base capacity immutability
-- Prevents the TOCTOU race in trg_fn_voyage_operational_capacity_check where the trigger
-- reads vessel base values without a lock. Eliminating mutation at the source is
-- stronger than adding FOR SHARE to the voyage trigger.

CREATE OR REPLACE FUNCTION trg_fn_vessels_base_capacity_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.base_lane_meters          IS DISTINCT FROM OLD.base_lane_meters          OR
       NEW.base_m2                   IS DISTINCT FROM OLD.base_m2                   OR
       NEW.base_passenger_capacity   IS DISTINCT FROM OLD.base_passenger_capacity
    THEN
        RAISE EXCEPTION
            'base capacity fields on vessel % are immutable after commissioning',
            OLD.vessel_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vessels_base_capacity_immutable
    BEFORE UPDATE OF base_lane_meters, base_m2, base_passenger_capacity
    ON vessels
    FOR EACH ROW EXECUTE FUNCTION trg_fn_vessels_base_capacity_immutable();


-- FIX 9: Trigger-based existence enforcement for cancellation_records.partial_target_id
-- partial_target_id is a polymorphic reference; a single FK cannot cover it.
-- This trigger validates the referenced row exists in the correct child table
-- and belongs to the same booking.

CREATE OR REPLACE FUNCTION trg_fn_cancellation_partial_target_exists()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.scope = 'PARTIAL' THEN
        IF NEW.partial_target_type = 'PASSENGER' THEN
            IF NOT EXISTS (
                SELECT 1 FROM booking_passengers
                WHERE  booking_passenger_id = NEW.partial_target_id
                AND    booking_id           = NEW.booking_id
            ) THEN
                RAISE EXCEPTION
                    'partial_target_id % does not exist in booking_passengers for booking %',
                    NEW.partial_target_id, NEW.booking_id;
            END IF;

        ELSIF NEW.partial_target_type = 'VEHICLE' THEN
            IF NOT EXISTS (
                SELECT 1 FROM booking_vehicles
                WHERE  booking_vehicle_id = NEW.partial_target_id
                AND    booking_id         = NEW.booking_id
            ) THEN
                RAISE EXCEPTION
                    'partial_target_id % does not exist in booking_vehicles for booking %',
                    NEW.partial_target_id, NEW.booking_id;
            END IF;

        ELSIF NEW.partial_target_type = 'CABIN' THEN
            IF NOT EXISTS (
                SELECT 1 FROM booking_cabins
                WHERE  booking_cabin_id = NEW.partial_target_id
                AND    booking_id       = NEW.booking_id
            ) THEN
                RAISE EXCEPTION
                    'partial_target_id % does not exist in booking_cabins for booking %',
                    NEW.partial_target_id, NEW.booking_id;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cancellation_partial_target_exists
    BEFORE INSERT ON cancellation_records
    FOR EACH ROW EXECUTE FUNCTION trg_fn_cancellation_partial_target_exists();


-- FIX 10: Narrow voyage_cabin_inventory total_count immutability to non-cancelled bookings.
-- A voyage where all bookings are cancelled must allow inventory correction before re-opening.
-- Replaces the previous function body; trigger definition is unchanged.

CREATE OR REPLACE FUNCTION trg_fn_voyage_cabin_inventory_total_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.total_count IS DISTINCT FROM OLD.total_count THEN
        IF EXISTS (
            SELECT 1
            FROM   bookings
            WHERE  voyage_id = NEW.voyage_id
            AND    status   != 'CANCELLED'
            LIMIT  1
        ) THEN
            RAISE EXCEPTION
                'total_count is immutable on voyage_cabin_inventory while non-cancelled bookings exist for voyage %',
                NEW.voyage_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
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
-- =============================================================
-- ANTSO DENİZCİLİK — ROW LEVEL SECURITY POLICIES
-- 007_rls_policies.sql
-- =============================================================


-- 1. ENABLE RLS ON ALL TABLES

ALTER TABLE vessels ENABLE ROW LEVEL SECURITY;
ALTER TABLE vessel_cabin_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE voyages ENABLE ROW LEVEL SECURITY;
ALTER TABLE voyage_capacity_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE voyage_cabin_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacity_allocation_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_cabin_deltas ENABLE ROW LEVEL SECURITY;
ALTER TABLE holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE hold_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_cabins ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_in_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_review_queue ENABLE ROW LEVEL SECURITY;


-- 2. PUBLIC READ POLICIES (no auth required)

CREATE POLICY voyages_public_read ON voyages
    FOR SELECT
    USING (status IN ('OPEN', 'CLOSED', 'DEPARTED'));

CREATE POLICY vessels_public_read ON vessels
    FOR SELECT
    USING (true);

CREATE POLICY vessel_cabin_types_public_read ON vessel_cabin_types
    FOR SELECT
    USING (true);

CREATE POLICY vci_public_read ON voyage_cabin_inventory
    FOR SELECT
    USING (true);

CREATE POLICY vcc_public_read ON voyage_capacity_counters
    FOR SELECT
    USING (true);


-- 3. AUTHENTICATED USER POLICIES (own data only)

CREATE POLICY holds_user_select ON holds
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY bookings_user_select ON bookings
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY booking_passengers_user_select ON booking_passengers
    FOR SELECT TO authenticated
    USING (
        booking_id IN (
            SELECT booking_id FROM bookings WHERE user_id = auth.uid()
        )
    );

CREATE POLICY booking_vehicles_user_select ON booking_vehicles
    FOR SELECT TO authenticated
    USING (
        booking_id IN (
            SELECT booking_id FROM bookings WHERE user_id = auth.uid()
        )
    );

CREATE POLICY booking_cabins_user_select ON booking_cabins
    FOR SELECT TO authenticated
    USING (
        booking_id IN (
            SELECT booking_id FROM bookings WHERE user_id = auth.uid()
        )
    );

CREATE POLICY payments_user_select ON payments
    FOR SELECT TO authenticated
    USING (
        hold_id IN (
            SELECT hold_id FROM holds WHERE user_id = auth.uid()
        )
    );

CREATE POLICY refund_records_user_select ON refund_records
    FOR SELECT TO authenticated
    USING (
        booking_id IN (
            SELECT booking_id FROM bookings WHERE user_id = auth.uid()
        )
    );

CREATE POLICY cancellation_records_user_select ON cancellation_records
    FOR SELECT TO authenticated
    USING (
        booking_id IN (
            SELECT booking_id FROM bookings WHERE user_id = auth.uid()
        )
    );

CREATE POLICY check_in_records_user_select ON check_in_records
    FOR SELECT TO authenticated
    USING (
        booking_id IN (
            SELECT booking_id FROM bookings WHERE user_id = auth.uid()
        )
    );


-- 4. NO WRITE POLICIES FOR anon/authenticated ROLES
-- All mutations go through SECURITY DEFINER RPC functions
-- (fn_create_hold, fn_cancel_booking, etc.) which run as the
-- function owner and bypass RLS.

-- 5. SERVICE ROLE bypasses RLS entirely (used by workers/webhooks).
-- No additional policies needed.

-- 6. TABLES WITH NO PUBLIC/USER ACCESS
-- These are only accessible via service_role or SECURITY DEFINER RPCs:
--   capacity_allocation_ledger
--   ledger_cabin_deltas
--   hold_items
--   payment_attempts
--   ops_review_queue
-- RLS is enabled but no SELECT policies exist for anon/authenticated,
-- so direct queries return zero rows.  All access is via RPC.
