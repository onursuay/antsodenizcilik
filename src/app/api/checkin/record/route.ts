import { z } from "zod/v4";
import { createServerSupabase } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/handler";
import { jsonOk } from "@/lib/api/response";
import { getAuthUser } from "@/lib/api/auth";
import { requireOperator } from "@/lib/auth/guards";
import { parseBody } from "@/lib/api/body";
import { recordCheckInAttempt } from "@/lib/db/checkin";

const checkInSchema = z
  .object({
    bookingId: z.string().uuid(),
    outcome: z.enum(["APPROVED", "DENIED"]),
    documentVerified: z.boolean(),
    denialReason: z.string().min(1).optional(),
    writeAuditIfAlreadyCheckedIn: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.outcome === "DENIED") {
        return data.denialReason != null && data.denialReason.length > 0;
      }
      return true;
    },
    { message: "denialReason is required when outcome is DENIED" }
  );

export const POST = withApiHandler(async (request) => {
  const supabase = await createServerSupabase();
  await requireOperator(supabase);
  const user = await getAuthUser(supabase);

  const body = await parseBody(request, checkInSchema);

  const result = await recordCheckInAttempt(supabase, {
    bookingId: body.bookingId,
    operatorId: user.email ?? user.id,
    outcome: body.outcome,
    documentVerified: body.documentVerified,
    denialReason: body.denialReason ?? null,
    writeAuditIfAlreadyCheckedIn: body.writeAuditIfAlreadyCheckedIn ?? false,
  });

  return jsonOk(
    {
      checkInRecordId: result.o_check_in_record_id,
      bookingStatus: result.o_booking_status,
    },
    201
  );
});
