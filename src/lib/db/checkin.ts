import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/db-errors";

interface RecordCheckInParams {
  bookingId: string;
  operatorId: string;
  outcome: "APPROVED" | "DENIED";
  documentVerified: boolean;
  denialReason?: string | null;
  writeAuditIfAlreadyCheckedIn?: boolean;
}

interface RecordCheckInResult {
  o_check_in_record_id: string | null;
  o_booking_status: string;
}

export async function recordCheckInAttempt(
  supabase: SupabaseClient,
  params: RecordCheckInParams
): Promise<RecordCheckInResult> {
  const { data, error } = await supabase.rpc("fn_record_check_in_attempt", {
    p_booking_id: params.bookingId,
    p_operator_id: params.operatorId,
    p_outcome: params.outcome,
    p_document_verified: params.documentVerified,
    p_denial_reason: params.denialReason ?? null,
    p_write_audit_if_already_checked_in:
      params.writeAuditIfAlreadyCheckedIn ?? false,
  });

  if (error) throw mapDbError(error);
  return data[0] as RecordCheckInResult;
}
