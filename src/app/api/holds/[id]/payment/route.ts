import { createServerSupabase } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/handler";
import { jsonOk } from "@/lib/api/response";
import { verifyOwnership } from "@/lib/api/auth";
import { startPayment } from "@/lib/db/payments";
import { getGateway } from "@/lib/gateway/client";
import { computeHoldPrice } from "@/lib/pricing";
import { generateIdempotencyKey } from "@/lib/utils/idempotency";

export const POST = withApiHandler(async (_request, context) => {
  const { id: holdId } = await context.params;
  const supabase = await createServerSupabase();

  await verifyOwnership(supabase, "holds", "hold_id", holdId);

  // Server-side pricing — never trust client amounts
  const { amountKurus, currency } = await computeHoldPrice(supabase, holdId);

  const gateway = getGateway();
  const idempotencyKey = generateIdempotencyKey();

  const result = await startPayment(supabase, {
    holdId,
    amountKurus,
    currency,
    gateway: process.env.PAYMENT_GATEWAY ?? "iyzico",
    idempotencyKey,
  });

  let checkoutUrl: string | null = null;
  if (!result.o_is_existing) {
    checkoutUrl = await gateway.createCheckoutUrl(
      result.o_payment_id,
      amountKurus,
      currency
    );
  }

  return jsonOk(
    {
      paymentId: result.o_payment_id,
      status: result.o_status,
      isExisting: result.o_is_existing,
      amountKurus,
      currency,
      checkoutUrl,
    },
    result.o_is_existing ? 200 : 201
  );
});
