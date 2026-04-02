import { z } from "zod/v4";
import { createServerSupabase } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/handler";
import { jsonOk } from "@/lib/api/response";
import { requireOps } from "@/lib/auth/guards";
import { parseBody } from "@/lib/api/body";
import { reconcilePaymentUnknown } from "@/lib/db/reconciliation";

const reconcilePaymentSchema = z.object({
  authoritativeOutcome: z.enum(["SETTLED", "FAILED"]),
  amountCapturedKurus: z.number().int().nonnegative().optional(),
});

export const POST = withApiHandler(async (request, context) => {
  const { paymentId } = await context.params;
  const supabase = await createServerSupabase();
  await requireOps(supabase);

  const body = await parseBody(request, reconcilePaymentSchema);

  await reconcilePaymentUnknown(supabase, {
    paymentId,
    authoritativeOutcome: body.authoritativeOutcome,
    amountCapturedKurus: body.amountCapturedKurus ?? null,
  });

  return jsonOk({ success: true });
});
