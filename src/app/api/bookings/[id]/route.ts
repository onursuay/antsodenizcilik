import { createServerSupabase } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/handler";
import { jsonOk } from "@/lib/api/response";
import { verifyOwnership } from "@/lib/api/auth";
import { ApiError } from "@/lib/errors/db-errors";

export const GET = withApiHandler(async (_request, context) => {
  const { id } = await context.params;
  const supabase = await createServerSupabase();

  await verifyOwnership(supabase, "bookings", "booking_id", id);

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("*")
    .eq("booking_id", id)
    .single();

  if (bookingError || !booking) {
    throw new ApiError("Booking not found", 404, "not_found");
  }

  const [
    { data: passengers },
    { data: vehicles },
    { data: cabins },
    { data: cancellations },
    { data: refunds },
  ] = await Promise.all([
    supabase
      .from("booking_passengers")
      .select("*")
      .eq("booking_id", id),
    supabase
      .from("booking_vehicles")
      .select("*")
      .eq("booking_id", id),
    supabase
      .from("booking_cabins")
      .select("*")
      .eq("booking_id", id),
    supabase
      .from("cancellation_records")
      .select("*")
      .eq("booking_id", id)
      .order("initiated_at", { ascending: true }),
    supabase
      .from("refund_records")
      .select("*")
      .eq("booking_id", id)
      .order("queued_at", { ascending: true }),
  ]);

  // Payment is linked through hold_id
  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("hold_id", booking.hold_id)
    .single();

  return jsonOk({
    booking,
    passengers: passengers ?? [],
    vehicles: vehicles ?? [],
    cabins: cabins ?? [],
    payment: payment ?? null,
    refunds: refunds ?? [],
    cancellations: cancellations ?? [],
  });
});
