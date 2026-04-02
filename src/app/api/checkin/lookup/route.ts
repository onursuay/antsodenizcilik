import { createServerSupabase } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/handler";
import { jsonOk } from "@/lib/api/response";
import { requireOperator } from "@/lib/auth/guards";
import { ApiError } from "@/lib/errors/db-errors";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GET = withApiHandler(async (request) => {
  const supabase = await createServerSupabase();
  await requireOperator(supabase);

  const { searchParams } = new URL(request.url);
  const bookingId = searchParams.get("bookingId");

  if (!bookingId || !UUID_REGEX.test(bookingId)) {
    throw new ApiError(
      "bookingId query parameter is required and must be a valid UUID",
      400,
      "validation_error"
    );
  }

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("booking_id, voyage_id, hold_id, user_id, status, confirmed_at, cancelled_at, checked_in_at")
    .eq("booking_id", bookingId)
    .single();

  if (bookingError || !booking) {
    throw new ApiError("Booking not found", 404, "not_found");
  }

  const [
    { data: passengers },
    { data: vehicles },
    { data: checkInHistory },
  ] = await Promise.all([
    supabase
      .from("booking_passengers")
      .select("*")
      .eq("booking_id", bookingId),
    supabase
      .from("booking_vehicles")
      .select("*")
      .eq("booking_id", bookingId),
    supabase
      .from("check_in_records")
      .select("*")
      .eq("booking_id", bookingId)
      .order("attempted_at", { ascending: false }),
  ]);

  return jsonOk({
    booking,
    passengers: passengers ?? [],
    vehicles: vehicles ?? [],
    checkInHistory: checkInHistory ?? [],
  });
});
