import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/db-errors";
import type { Json } from "@/types/database";

interface ConfirmBookingParams {
  paymentId: string;
  passengers: Json;
  vehicles: Json;
  cabins: Json;
}

interface ConfirmBookingResult {
  o_booking_id: string;
  o_confirmation_ledger_event_id: string;
}

export async function confirmBooking(
  supabase: SupabaseClient,
  params: ConfirmBookingParams
): Promise<ConfirmBookingResult> {
  const { data, error } = await supabase.rpc(
    "fn_confirm_booking_from_settled_payment",
    {
      p_payment_id: params.paymentId,
      p_passengers: params.passengers,
      p_vehicles: params.vehicles,
      p_cabins: params.cabins,
    }
  );

  if (error) throw mapDbError(error);
  return data[0] as ConfirmBookingResult;
}

interface CancelBookingParams {
  bookingId: string;
  scope: "FULL" | "PARTIAL";
  initiatedBy: string;
  refundAmountKurus: number;
  partialTargetType?: "PASSENGER" | "VEHICLE" | "CABIN" | null;
  partialTargetId?: string | null;
}

interface CancelBookingResult {
  o_cancellation_record_id: string;
  o_refund_id: string;
}

export async function cancelBooking(
  supabase: SupabaseClient,
  params: CancelBookingParams
): Promise<CancelBookingResult> {
  const { data, error } = await supabase.rpc("fn_cancel_booking", {
    p_booking_id: params.bookingId,
    p_scope: params.scope,
    p_initiated_by: params.initiatedBy,
    p_refund_amount_kurus: params.refundAmountKurus,
    p_partial_target_type: params.partialTargetType ?? null,
    p_partial_target_id: params.partialTargetId ?? null,
  });

  if (error) throw mapDbError(error);
  return data[0] as CancelBookingResult;
}
