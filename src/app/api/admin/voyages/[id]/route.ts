import { createServerSupabase } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/handler";
import { jsonOk } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/guards";
import { parseBody } from "@/lib/api/body";
import { updateVoyageSchema } from "@/lib/validation/voyages";
import { ApiError } from "@/lib/errors/db-errors";

export const GET = withApiHandler(async (_request, context) => {
  const { id } = await context.params;
  const supabase = await createServerSupabase();
  await requireAdmin(supabase);

  const { data: voyage, error: voyageError } = await supabase
    .from("voyages")
    .select("*, vessels!inner ( name )")
    .eq("voyage_id", id)
    .single();

  if (voyageError || !voyage) {
    throw new ApiError("Voyage not found", 404, "not_found");
  }

  const [
    { data: capacityCounters },
    { data: cabinInventory },
  ] = await Promise.all([
    supabase
      .from("voyage_capacity_counters")
      .select("*")
      .eq("voyage_id", id)
      .single(),
    supabase
      .from("voyage_cabin_inventory")
      .select("*")
      .eq("voyage_id", id),
  ]);

  // Booking counts by status
  const { data: bookingRows } = await supabase
    .from("bookings")
    .select("status")
    .eq("voyage_id", id);

  const bookingCounts = { CONFIRMED: 0, CHECKED_IN: 0, CANCELLED: 0 };
  for (const row of bookingRows ?? []) {
    if (row.status in bookingCounts) {
      bookingCounts[row.status as keyof typeof bookingCounts]++;
    }
  }

  return jsonOk({
    voyage: {
      ...voyage,
      vessel_name: (voyage.vessels as unknown as { name: string })?.name ?? null,
      vessels: undefined,
    },
    capacityCounters: capacityCounters ?? null,
    cabinInventory: cabinInventory ?? [],
    bookingCounts,
  });
});

export const PATCH = withApiHandler(async (request, context) => {
  const { id } = await context.params;
  const supabase = await createServerSupabase();
  await requireAdmin(supabase);

  // Verify voyage is DRAFT
  const { data: existing } = await supabase
    .from("voyages")
    .select("status")
    .eq("voyage_id", id)
    .single();

  if (!existing) {
    throw new ApiError("Voyage not found", 404, "not_found");
  }
  if (existing.status !== "DRAFT") {
    throw new ApiError(
      "Only DRAFT voyages can be updated",
      422,
      "business_rule_violation"
    );
  }

  const body = await parseBody(request, updateVoyageSchema);

  const updateData: Record<string, unknown> = {};
  if (body.vesselId !== undefined) updateData.vessel_id = body.vesselId;
  if (body.originPort !== undefined) updateData.origin_port = body.originPort;
  if (body.destinationPort !== undefined) updateData.destination_port = body.destinationPort;
  if (body.departureUtc !== undefined) updateData.departure_utc = body.departureUtc;
  if (body.arrivalUtc !== undefined) updateData.arrival_utc = body.arrivalUtc;
  if (body.operationalLaneMeters !== undefined) updateData.operational_lane_meters = body.operationalLaneMeters;
  if (body.operationalM2 !== undefined) updateData.operational_m2 = body.operationalM2;
  if (body.operationalPassengerCapacity !== undefined) updateData.operational_passenger_capacity = body.operationalPassengerCapacity;
  if (body.overbookingDelta !== undefined) updateData.overbooking_delta = body.overbookingDelta;

  if (Object.keys(updateData).length === 0) {
    throw new ApiError("No fields to update", 422, "business_rule_violation");
  }

  const { data: voyage, error } = await supabase
    .from("voyages")
    .update(updateData)
    .eq("voyage_id", id)
    .select()
    .single();

  if (error || !voyage) throw error;

  return jsonOk({ voyage });
});
