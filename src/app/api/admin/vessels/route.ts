import { createServerSupabase } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/handler";
import { jsonOk } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/guards";
import { parseBody } from "@/lib/api/body";
import { createVesselSchema } from "@/lib/validation/vessels";

export const GET = withApiHandler(async () => {
  const supabase = await createServerSupabase();
  await requireAdmin(supabase);

  const { data, error } = await supabase
    .from("vessels")
    .select(`
      *,
      vessel_cabin_types ( cabin_type_id )
    `)
    .order("commissioned_at", { ascending: false });

  if (error) throw error;

  const vessels = (data ?? []).map((v) => ({
    ...v,
    cabin_type_count: Array.isArray(v.vessel_cabin_types)
      ? v.vessel_cabin_types.length
      : 0,
    vessel_cabin_types: undefined,
  }));

  return jsonOk({ vessels });
});

export const POST = withApiHandler(async (request) => {
  const supabase = await createServerSupabase();
  await requireAdmin(supabase);

  const body = await parseBody(request, createVesselSchema);

  const { data: vessel, error: vesselError } = await supabase
    .from("vessels")
    .insert({
      name: body.name,
      base_lane_meters: body.baseLaneMeters,
      base_m2: body.baseM2,
      base_passenger_capacity: body.basePassengerCapacity,
      commissioned_at: body.commissionedAt,
    })
    .select()
    .single();

  if (vesselError || !vessel) throw vesselError;

  if (body.cabinTypes.length > 0) {
    const cabinRows = body.cabinTypes.map((ct) => ({
      vessel_id: vessel.vessel_id,
      label: ct.label,
      base_count: ct.baseCount,
      berths_per_cabin: ct.berthsPerCabin,
    }));

    const { error: cabinError } = await supabase
      .from("vessel_cabin_types")
      .insert(cabinRows);

    if (cabinError) throw cabinError;
  }

  return jsonOk({ vessel }, 201);
});
