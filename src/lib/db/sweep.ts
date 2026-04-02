import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/db-errors";

interface SweepResult {
  scanned_count: number;
  expired_count: number;
  skipped_locked_count: number;
  skipped_payment_ambiguous_count: number;
  error_count: number;
}

export async function sweepExpiredHolds(
  supabase: SupabaseClient,
  batchLimit = 20
): Promise<SweepResult> {
  const { data, error } = await supabase.rpc("fn_sweep_expired_holds", {
    p_batch_limit: batchLimit,
  });

  if (error) throw mapDbError(error);
  return data[0] as SweepResult;
}
