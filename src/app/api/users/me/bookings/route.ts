import { createServerSupabase } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/handler";
import { jsonOk } from "@/lib/api/response";
import { getAuthUserId } from "@/lib/api/auth";

export const GET = withApiHandler(async (request) => {
  const supabase = await createServerSupabase();
  const userId = await getAuthUserId(supabase);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 1),
    100
  );
  const offset = Math.max(
    parseInt(searchParams.get("offset") ?? "0", 10) || 0,
    0
  );

  let query = supabase
    .from("bookings")
    .select(
      "booking_id, voyage_id, status, confirmed_at, cancelled_at, checked_in_at",
      { count: "exact" }
    )
    .eq("user_id", userId)
    .order("confirmed_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return jsonOk({
    bookings: data ?? [],
    total: count ?? 0,
  });
});
