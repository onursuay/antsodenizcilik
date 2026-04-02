import { createServerSupabase } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/handler";
import { jsonOk } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/guards";
import { parseBody } from "@/lib/api/body";
import { createVoyageSchema } from "@/lib/validation/voyages";

export const GET = withApiHandler(async (request) => {
  const supabase = await createServerSupabase();
  await requireAdmin(supabase);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = supabase
    .from("voyages")
    .select(`
      *,
      vessels!inner ( name )
    `)
    .order("departure_utc", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;

  const voyages = (data ?? []).map((v) => ({
    ...v,
    vessel_name: (v.vessels as unknown as { name: string })?.name ?? null,
    vessels: undefined,
  }));

  return jsonOk({ voyages });
});

export const POST = withApiHandler(async (request) => {
  const supabase = await createServerSupabase();
  await requireAdmin(supabase);

  const body = await parseBody(request, createVoyageSchema);

  const { data: voyage, error } = await supabase
    .from("voyages")
    .insert({
      vessel_id: body.vesselId,
      origin_port: body.originPort,
      destination_port: body.destinationPort,
      departure_utc: body.departureUtc,
      arrival_utc: body.arrivalUtc,
      operational_lane_meters: body.operationalLaneMeters,
      operational_m2: body.operationalM2,
      operational_passenger_capacity: body.operationalPassengerCapacity,
      overbooking_delta: body.overbookingDelta ?? 0,
    })
    .select()
    .single();

  if (error || !voyage) throw error;

  return jsonOk({ voyage }, 201);
});
