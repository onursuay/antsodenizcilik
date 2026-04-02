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
