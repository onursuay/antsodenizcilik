import { createServerSupabase } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/handler";
import { jsonOk } from "@/lib/api/response";
import { requireOps } from "@/lib/auth/guards";
import { ApiError } from "@/lib/errors/db-errors";

export const GET = withApiHandler(async (_request, context) => {
  const { id } = await context.params;
  const supabase = await createServerSupabase();
  await requireOps(supabase);

  const { data: entry, error } = await supabase
    .from("ops_review_queue")
    .select("*")
    .eq("review_id", id)
    .single();

  if (error || !entry) {
    throw new ApiError("Ops entry not found", 404, "not_found");
  }

  // Fetch related entities if IDs are present
  const [hold, booking, payment, refund] = await Promise.all([
    entry.hold_id
      ? supabase.from("holds").select("*").eq("hold_id", entry.hold_id).single().then((r) => r.data)
      : null,
    entry.booking_id
      ? supabase.from("bookings").select("*").eq("booking_id", entry.booking_id).single().then((r) => r.data)
      : null,
    entry.payment_id
      ? supabase.from("payments").select("*").eq("payment_id", entry.payment_id).single().then((r) => r.data)
      : null,
    entry.refund_id
      ? supabase.from("refund_records").select("*").eq("refund_id", entry.refund_id).single().then((r) => r.data)
      : null,
  ]);

  return jsonOk({ entry, hold, booking, payment, refund });
});
