import { verifyCronSecret } from "@/lib/api/cron";
import { workerOk, workerError } from "@/lib/api/worker";
import { jsonError } from "@/lib/api/response";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { assertCapacityConsistency } from "@/lib/db/reconciliation";

export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return jsonError("Unauthorized", 401);
  }

  const startTime = Date.now();

  try {
    const supabase = createAdminSupabase();
    let voyagesChecked = 0;
    let driftCount = 0;
    const alerts: string[] = [];

    // Check 1: Capacity consistency for active voyages
    const { data: voyages } = await supabase
      .from("voyages")
      .select("voyage_id")
      .in("status", ["OPEN", "CLOSED"])
      .limit(10);

    for (const voyage of voyages ?? []) {
      voyagesChecked++;
      try {
        await assertCapacityConsistency(supabase, voyage.voyage_id);
      } catch {
        driftCount++;
      }
    }

    // Check 2: Open ops queue count
    const { count: openOpsCount } = await supabase
      .from("ops_review_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "OPEN");

    // Check 3: Stale active holds (expired > 30 min ago, still ACTIVE)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { count: staleHoldsCount } = await supabase
      .from("holds")
      .select("*", { count: "exact", head: true })
      .eq("status", "ACTIVE")
      .lt("expires_at", thirtyMinutesAgo);

    // Check 4: Stale UNKNOWN payments (> 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: staleUnknownCount } = await supabase
      .from("payments")
      .select("*", { count: "exact", head: true })
      .eq("status", "UNKNOWN")
      .lt("created_at", oneHourAgo);

    // Build alerts
    if (driftCount > 0) {
      alerts.push(`Capacity drift detected on ${driftCount} voyage(s)`);
    }
    if ((openOpsCount ?? 0) > 10) {
      alerts.push(`${openOpsCount} open ops review entries (threshold: 10)`);
    }
    if ((staleHoldsCount ?? 0) > 0) {
      alerts.push(`${staleHoldsCount} stale active hold(s) expired > 30 min ago — sweeper may be stalled`);
    }
    if ((staleUnknownCount ?? 0) > 5) {
      alerts.push(`${staleUnknownCount} UNKNOWN payment(s) older than 1 hour (threshold: 5)`);
    }

    return workerOk("health", {
      voyages_checked: voyagesChecked,
      drift_count: driftCount,
      open_ops_count: openOpsCount ?? 0,
      stale_holds_count: staleHoldsCount ?? 0,
      stale_unknown_payments_count: staleUnknownCount ?? 0,
      alerts,
    }, startTime);
  } catch (error) {
    console.error("health worker error:", error);
    return workerError(
      "health",
      error instanceof Error ? error.message : "Unknown error",
      startTime
    );
  }
}
