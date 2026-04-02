import { verifyCronSecret } from "@/lib/api/cron";
import { workerOk, workerError } from "@/lib/api/worker";
import { jsonError } from "@/lib/api/response";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { processRefundSubmission, markRefundConfirmed, markRefundFailed } from "@/lib/db/refunds";
import { getGateway } from "@/lib/gateway/client";

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return jsonError("Unauthorized", 401);
  }

  const startTime = Date.now();

  try {
    const supabase = createAdminSupabase();
    const gateway = getGateway();
    let queuedProcessed = 0;
    let queuedSubmitted = 0;
    let queuedFailed = 0;
    let staleChecked = 0;
    let staleResolved = 0;
    let staleManualReview = 0;
    let errors = 0;

    // Step 1–2: Process QUEUED refunds
    const { data: queuedRefunds } = await supabase
      .from("refund_records")
      .select(`
        refund_id,
        amount_kurus,
        payment_id,
        payments!inner ( gateway_reference_id )
      `)
      .eq("status", "QUEUED")
      .order("queued_at", { ascending: true })
      .limit(10);

    for (const refund of queuedRefunds ?? []) {
      queuedProcessed++;
      try {
        const payments = refund.payments as unknown as { gateway_reference_id: string | null };
        const gatewayRef = payments?.gateway_reference_id;
        if (!gatewayRef) {
          console.warn("refund-retry: no gateway ref for refund", refund.refund_id);
          errors++;
          continue;
        }

        const refundRef = await gateway.submitRefund(gatewayRef, refund.amount_kurus);
        await processRefundSubmission(supabase, refund.refund_id, refundRef);
        queuedSubmitted++;
      } catch (error) {
        console.error("refund-retry: submit failed for", refund.refund_id, error);
        try {
          await markRefundFailed(supabase, refund.refund_id, false);
          queuedFailed++;
        } catch (failError) {
          console.error("refund-retry: markRefundFailed also failed for", refund.refund_id, failError);
          errors++;
        }
      }
    }

    // Step 3–4: Check stale SUBMITTED refunds (> 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: staleRefunds } = await supabase
      .from("refund_records")
      .select(`
        refund_id,
        gateway_refund_reference
      `)
      .eq("status", "SUBMITTED")
      .lt("queued_at", oneHourAgo)
      .limit(10);

    for (const refund of staleRefunds ?? []) {
      staleChecked++;
      try {
        if (!refund.gateway_refund_reference) {
          await markRefundFailed(supabase, refund.refund_id, true, "No gateway reference after 1 hour");
          staleManualReview++;
          continue;
        }

        const status = await gateway.pollPaymentStatus(refund.gateway_refund_reference);

        if (status === "SETTLED") {
          // Gateway uses SETTLED for confirmed refunds
          await markRefundConfirmed(supabase, refund.refund_id);
          staleResolved++;
        } else if (status === "FAILED") {
          await markRefundFailed(supabase, refund.refund_id, true, "Gateway reported FAILED after 1 hour");
          staleManualReview++;
        }
        // PENDING: leave as SUBMITTED, check again next run
      } catch (error) {
        console.error("refund-retry: stale check failed for", refund.refund_id, error);
        errors++;
      }
    }

    return workerOk("refund-retry", {
      queued_processed: queuedProcessed,
      queued_submitted: queuedSubmitted,
      queued_failed: queuedFailed,
      stale_checked: staleChecked,
      stale_resolved: staleResolved,
      stale_manual_review: staleManualReview,
      errors,
    }, startTime);
  } catch (error) {
    console.error("refund-retry worker error:", error);
    return workerError(
      "refund-retry",
      error instanceof Error ? error.message : "Unknown error",
      startTime
    );
  }
}
