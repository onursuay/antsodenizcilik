import { createServerSupabase } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/handler";
import { jsonOk } from "@/lib/api/response";
import { ApiError } from "@/lib/errors/db-errors";

export const GET = withApiHandler(async (_request, context) => {
  const { id } = await context.params;
  const supabase = await createServerSupabase();

  const { data: voyage, error: voyageError } = await supabase
    .from("voyages")
    .select("*")
    .eq("voyage_id", id)
    .in("status", ["OPEN", "CLOSED", "DEPARTED"])
    .single();

  if (voyageError || !voyage) {
    throw new ApiError("Voyage not found", 404, "not_found");
  }

  const { data: capacityCounters } = await supabase
    .from("voyage_capacity_counters")
    .select("*")
    .eq("voyage_id", id)
    .single();

  const { data: cabinInventory } = await supabase
    .from("voyage_cabin_inventory")
    .select("*")
    .eq("voyage_id", id);

  return jsonOk({
    voyage,
    capacityCounters: capacityCounters ?? null,
    cabinInventory: cabinInventory ?? [],
  });
});
