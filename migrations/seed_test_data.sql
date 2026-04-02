-- =============================================================
-- TEST SEED DATA — Supabase SQL Editor'a yapıştır
-- =============================================================

DO $$
DECLARE
  v_vessel_id UUID;
BEGIN
  -- Gemi oluştur
  INSERT INTO vessels (name, base_lane_meters, base_m2, base_passenger_capacity, commissioned_at)
  VALUES ('Antso Star', 200, 300, 500, now())
  RETURNING vessel_id INTO v_vessel_id;

  -- 6 farklı sefer oluştur (hepsi OPEN, gelecek tarihli)
  INSERT INTO voyages (vessel_id, origin_port, destination_port, departure_utc, arrival_utc, operational_lane_meters, operational_m2, operational_passenger_capacity, status)
  VALUES
    (v_vessel_id, 'ANAMUR', 'GİRNE', now() + interval '1 day', now() + interval '1 day 4 hours', 200, 300, 500, 'OPEN'),
    (v_vessel_id, 'GİRNE', 'ANAMUR', now() + interval '1 day 6 hours', now() + interval '1 day 10 hours', 200, 300, 500, 'OPEN'),
    (v_vessel_id, 'ANAMUR', 'GİRNE', now() + interval '2 days', now() + interval '2 days 4 hours', 200, 300, 500, 'OPEN'),
    (v_vessel_id, 'GİRNE', 'ANAMUR', now() + interval '2 days 6 hours', now() + interval '2 days 10 hours', 200, 300, 500, 'OPEN'),
    (v_vessel_id, 'ANAMUR', 'GİRNE', now() + interval '3 days', now() + interval '3 days 4 hours', 200, 300, 500, 'OPEN'),
    (v_vessel_id, 'GİRNE', 'ANAMUR', now() + interval '3 days 6 hours', now() + interval '3 days 10 hours', 200, 300, 500, 'OPEN');
END $$;
