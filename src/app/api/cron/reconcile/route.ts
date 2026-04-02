import { verifyCronSecret } from "@/lib/api/cron";
import { workerOk, workerError } from "@/lib/api/worker";
import { jsonError } from "@/lib/api/response";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { detectAndQueueCounterDrift, reconcilePaymentUnknown } from "@/lib/db/reconciliation";
import { getGateway } from "@/lib/gateway/client";

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return jsonError("Unauthorized", 401);
  }

  const startTime = Date.now();

  try {
    const supabase = createAdminSupabase();
    let voyagesChecked = 0;
    let driftDetected = 0;
    let paymentsChecked = 0;
    let paymentsResolved = 0;
    let paymentErrors = 0;

    // Step 1–2: Check active voyages for counter drift
    const { data: voyages } = await supabase
      .from("voyages")
      .select("voyage_id")
      .in("status", ["OPEN", "CLOSED"])
      .order("departure_utc", { ascending: true })
      .limit(10);

    for (const voyage of voyages ?? []) {
      voyagesChecked++;
      try {
        const hasDrift = await detectAndQueueCounterDrift(supabase, voyage.voyage_id);
        if (hasDrift) driftDetected++;
      } catch (error) {
        console.error("reconcile: drift check failed for voyage", voyage.voyage_id, error);
      }
    }

    // Step 3–4: Resolve UNKNOWN payments via gateway poll
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { data: unknownPayments } = await supabase
      .from("payments")
      .select("payment_id, gateway_reference_id")
      .eq("status", "UNKNOWN")
      .lt("created_at", fifteenMinutesAgo)
      .limit(10);

    const gateway = getGateway();

    for (const payment of unknownPayments ?? []) {
      paymentsChecked++;
      try {
        if (!payment.gateway_reference_id) continue;

        const gatewayStatus = await gateway.pollPaymentStatus(payment.gateway_reference_id);

        if (gatewayStatus === "PENDING") continue;

        await reconcilePaymentUnknown(supabase, {
          paymentId: payment.payment_id,
          authoritativeOutcome: gatewayStatus,
          amountCapturedKurus: null,
        });
        paymentsResolved++;
      } catch (error) {
        console.error("reconcile: payment poll failed for", payment.payment_id, error);
        paymentErrors++;
      }
    }

    return workerOk("reconcile", {
      voyages_checked: voyagesChecked,
      drift_detected: driftDetected,
      payments_checked: paymentsChecked,
      payments_resolved: paymentsResolved,
      payment_errors: paymentErrors,
    }, startTime);
  } catch (error) {
    console.error("reconcile worker error:", error);
    return workerError(
      "reconcile",
      error instanceof Error ? error.message : "Unknown error",
      startTime
    );
  }
}
