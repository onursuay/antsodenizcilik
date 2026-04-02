import { createServerSupabase } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/handler";
import { jsonOk } from "@/lib/api/response";
import { getAuthUserId } from "@/lib/api/auth";
import { parseBody } from "@/lib/api/body";
import { confirmBookingSchema } from "@/lib/validation/bookings";
import { confirmBooking } from "@/lib/db/bookings";
import { ApiError } from "@/lib/errors/db-errors";

export const POST = withApiHandler(async (request, context) => {
  const { id: paymentId } = await context.params;
  const supabase = await createServerSupabase();
  const userId = await getAuthUserId(supabase);

  // Verify ownership: payment → hold → user_id
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("payment_id, hold_id")
    .eq("payment_id", paymentId)
    .single();

  if (paymentError || !payment) {
    throw new ApiError("Payment not found", 404, "not_found");
  }

  const { data: hold, error: holdError } = await supabase
    .from("holds")
    .select("user_id")
    .eq("hold_id", payment.hold_id)
    .single();

  if (holdError || !hold || hold.user_id !== userId) {
    throw new ApiError("Payment not found", 404, "not_found");
  }

  const body = await parseBody(request, confirmBookingSchema);

  // Transform camelCase input to snake_case JSONB for fn_confirm_booking_from_settled_payment
  const passengers = body.passengers.map((p) => ({
    full_name: p.fullName,
    date_of_birth: p.dateOfBirth,
    document_type: p.documentType,
    document_number: p.documentNumber,
    nationality: p.nationality,
  }));

  const vehicles = body.vehicles.map((v) => ({
    plate_number: v.plateNumber,
    vehicle_type: v.vehicleType,
    length_cm: v.lengthCm,
    width_cm: v.widthCm,
    height_cm: v.heightCm,
    weight_kg: v.weightKg,
    lane_meters_allocated: v.laneMetersAllocated,
    m2_allocated: v.m2Allocated,
  }));

  const cabins = body.cabins.map((c) => ({
    cabin_type_id: c.cabinTypeId,
    count_allocated: c.countAllocated,
  }));

  const result = await confirmBooking(supabase, {
    paymentId,
    passengers,
    vehicles,
    cabins,
  });

  return jsonOk(
    {
      bookingId: result.o_booking_id,
      confirmationLedgerEventId: result.o_confirmation_ledger_event_id,
    },
    201
  );
});
