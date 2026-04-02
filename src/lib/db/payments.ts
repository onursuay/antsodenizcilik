import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/db-errors";

interface StartPaymentParams {
  holdId: string;
  amountKurus: number;
  currency: string;
  gateway: string;
  idempotencyKey: string;
}

interface StartPaymentResult {
  o_payment_id: string;
  o_status: string;
  o_is_existing: boolean;
}

export async function startPayment(
  supabase: SupabaseClient,
  params: StartPaymentParams
): Promise<StartPaymentResult> {
  const { data, error } = await supabase.rpc("fn_start_payment", {
    p_hold_id: params.holdId,
    p_amount_kurus: params.amountKurus,
    p_currency: params.currency,
    p_gateway: params.gateway,
    p_idempotency_key: params.idempotencyKey,
  });

  if (error) throw mapDbError(error);
  return data[0] as StartPaymentResult;
}
