import { verifyCronSecret } from "@/lib/api/cron";
import { workerOk, workerError } from "@/lib/api/worker";
import { jsonError } from "@/lib/api/response";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { sweepExpiredHolds } from "@/lib/db/sweep";

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return jsonError("Unauthorized", 401);
  }

  const startTime = Date.now();

  try {
    const supabase = createAdminSupabase();
    const result = await sweepExpiredHolds(supabase, 20);

    return workerOk("sweep-holds", {
      scanned_count: result.scanned_count,
      expired_count: result.expired_count,
      skipped_locked_count: result.skipped_locked_count,
      skipped_payment_ambiguous_count: result.skipped_payment_ambiguous_count,
      error_count: result.error_count,
    }, startTime);
  } catch (error) {
    console.error("sweep-holds worker error:", error);
    return workerError(
      "sweep-holds",
      error instanceof Error ? error.message : "Unknown error",
      startTime
    );
  }
}
