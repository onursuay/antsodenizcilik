import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/db-errors";

export async function assertCapacityConsistency(
  supabase: SupabaseClient,
  voyageId: string
): Promise<void> {
  const { error } = await supabase.rpc("fn_assert_capacity_consistency", {
    p_voyage_id: voyageId,
  });
  if (error) throw mapDbError(error);
}

export async function detectAndQueueCounterDrift(
  supabase: SupabaseClient,
  voyageId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc(
    "fn_detect_and_queue_counter_drift",
    { p_voyage_id: voyageId }
  );
  if (error) throw mapDbError(error);
  return data as boolean;
}

export async function reconcileCounterDrift(
  supabase: SupabaseClient,
  voyageId: string
): Promise<void> {
  const { error } = await supabase.rpc("fn_reconcile_counter_drift", {
    p_voyage_id: voyageId,
  });
  if (error) throw mapDbError(error);
}

interface ReconcilePaymentParams {
  paymentId: string;
  authoritativeOutcome: "SETTLED" | "FAILED";
  amountCapturedKurus?: number | null;
}

export async function reconcilePaymentUnknown(
  supabase: SupabaseClient,
  params: ReconcilePaymentParams
): Promise<void> {
  const { error } = await supabase.rpc("fn_reconcile_payment_unknown", {
    p_payment_id: params.paymentId,
    p_authoritative_outcome: params.authoritativeOutcome,
    p_amount_captured_kurus: params.amountCapturedKurus ?? null,
  });
  if (error) throw mapDbError(error);
}
