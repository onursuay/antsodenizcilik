import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/db-errors";

export async function processRefundSubmission(
  supabase: SupabaseClient,
  refundId: string,
  gatewayRefundReference: string
): Promise<void> {
  const { error } = await supabase.rpc("fn_process_refund_submission", {
    p_refund_id: refundId,
    p_gateway_refund_reference: gatewayRefundReference,
  });
  if (error) throw mapDbError(error);
}

export async function markRefundConfirmed(
  supabase: SupabaseClient,
  refundId: string
): Promise<void> {
  const { error } = await supabase.rpc("fn_mark_refund_confirmed", {
    p_refund_id: refundId,
  });
  if (error) throw mapDbError(error);
}

export async function markRefundFailed(
  supabase: SupabaseClient,
  refundId: string,
  manualReview = false,
  failureReason: string | null = null
): Promise<void> {
  const { error } = await supabase.rpc("fn_mark_refund_failed", {
    p_refund_id: refundId,
    p_manual_review: manualReview,
    p_failure_reason: failureReason,
  });
  if (error) throw mapDbError(error);
}
