import { createServerSupabase } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/handler";
import { jsonOk } from "@/lib/api/response";
import { requireOperator } from "@/lib/auth/guards";

export const GET = withApiHandler(async (request) => {
  const supabase = await createServerSupabase();
  await requireOperator(supabase);

  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 1),
    100
  );
  const offset = Math.max(
    parseInt(searchParams.get("offset") ?? "0", 10) || 0,
    0
  );
  const outcome = searchParams.get("outcome");

  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  ).toISOString();

  let query = supabase
    .from("check_in_records")
    .select("*", { count: "exact" })
    .gte("attempted_at", twentyFourHoursAgo)
    .order("attempted_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (outcome === "APPROVED" || outcome === "DENIED") {
    query = query.eq("outcome", outcome);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return jsonOk({
    records: data ?? [],
    total: count ?? 0,
  });
});
