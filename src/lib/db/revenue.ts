import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/db-errors";

interface RevenueSummaryRow {
  voyage_id: string;
  confirmed_booking_count: number;
  cancelled_booking_count: number;
  checked_in_booking_count: number;
  gross_captured_kurus: number;
  total_refunded_kurus: number;
  net_realized_kurus: number;
  open_refund_liability_kurus: number;
  unknown_payment_count: number;
  failed_payment_count: number;
}

export async function revenueSummary(
  supabase: SupabaseClient,
  voyageId: string
): Promise<RevenueSummaryRow> {
  const { data, error } = await supabase.rpc("fn_revenue_summary", {
    p_voyage_id: voyageId,
  });
  if (error) throw mapDbError(error);
  return data[0] as RevenueSummaryRow;
}
