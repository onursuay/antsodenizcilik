import { createServerSupabase } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/handler";
import { jsonOk } from "@/lib/api/response";

export const GET = withApiHandler(async (request) => {
  const supabase = await createServerSupabase();
  const { searchParams } = new URL(request.url);

  const origin = searchParams.get("origin");
  const destination = searchParams.get("destination");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabase
    .from("voyages")
    .select(
      `
      voyage_id,
      vessel_id,
      origin_port,
      destination_port,
      departure_utc,
      arrival_utc,
      status,
      operational_lane_meters,
      operational_m2,
      operational_passenger_capacity,
      overbooking_delta,
      voyage_capacity_counters (
        lane_meters_reserved,
        lane_meters_confirmed,
        m2_reserved,
        m2_confirmed,
        passengers_reserved,
        passengers_confirmed
      )
    `
    )
    .eq("status", "OPEN")
    .gt("departure_utc", new Date().toISOString())
    .order("departure_utc", { ascending: true });

  if (origin) {
    query = query.ilike("origin_port", `%${origin}%`);
  }
  if (destination) {
    query = query.ilike("destination_port", `%${destination}%`);
  }
  if (from) {
    query = query.gte("departure_utc", from);
  }
  if (to) {
    query = query.lte("departure_utc", to);
  }

  const { data, error } = await query;

  if (error) throw error;

  const voyages = (data ?? []).map((v) => {
    const c = Array.isArray(v.voyage_capacity_counters)
      ? v.voyage_capacity_counters[0]
      : v.voyage_capacity_counters;
    const ceiling = v.operational_passenger_capacity + v.overbooking_delta;

    return {
      voyage_id: v.voyage_id,
      vessel_id: v.vessel_id,
      origin_port: v.origin_port,
      destination_port: v.destination_port,
      departure_utc: v.departure_utc,
      arrival_utc: v.arrival_utc,
      status: v.status,
      capacity: {
        lane_meters_available: c
          ? v.operational_lane_meters +
            v.overbooking_delta -
            (c.lane_meters_reserved + c.lane_meters_confirmed)
          : null,
        m2_available: c
          ? v.operational_m2 +
            v.overbooking_delta -
            (c.m2_reserved + c.m2_confirmed)
          : null,
        passengers_available: c
          ? ceiling - (c.passengers_reserved + c.passengers_confirmed)
          : null,
      },
    };
  });

  return jsonOk({ voyages });
});
