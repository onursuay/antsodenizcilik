import { createServerSupabase } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/handler";
import { jsonOk } from "@/lib/api/response";
import { verifyOwnership } from "@/lib/api/auth";
import { parseBody } from "@/lib/api/body";
import { cancelBookingSchema } from "@/lib/validation/bookings";
import { cancelBooking } from "@/lib/db/bookings";

export const POST = withApiHandler(async (request, context) => {
  const { id: bookingId } = await context.params;
  const supabase = await createServerSupabase();

  await verifyOwnership(supabase, "bookings", "booking_id", bookingId);

  const body = await parseBody(request, cancelBookingSchema);

  const result = await cancelBooking(supabase, {
    bookingId,
    scope: body.scope,
    initiatedBy: body.initiatedBy,
    refundAmountKurus: body.refundAmountKurus,
    partialTargetType: body.partialTargetType ?? null,
    partialTargetId: body.partialTargetId ?? null,
  });

  return jsonOk({
    cancellationRecordId: result.o_cancellation_record_id,
    refundId: result.o_refund_id,
  });
});
