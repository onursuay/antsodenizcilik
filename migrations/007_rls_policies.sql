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
