import { createServerSupabase } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/handler";
import { jsonOk } from "@/lib/api/response";
import { getAuthUser } from "@/lib/api/auth";
import { getIdempotencyKey } from "@/lib/api/idempotency";
import { parseBody } from "@/lib/api/body";
import { createHoldSchema } from "@/lib/validation/holds";
import { createHold } from "@/lib/db/holds";

export const POST = withApiHandler(async (request) => {
  const supabase = await createServerSupabase();
  const user = await getAuthUser(supabase);
  const idempotencyKey = getIdempotencyKey(request);
  const body = await parseBody(request, createHoldSchema);

  const sessionId =
    request.headers.get("X-Session-Id") ?? crypto.randomUUID();

  const result = await createHold(supabase, {
    voyageId: body.voyageId,
    userId: user.id,
    sessionId,
    idempotencyKey,
    items: body.items,
    ttlSeconds: body.ttlSeconds,
  });

  return jsonOk(
    {
      holdId: result.o_hold_id,
      expiresAt: result.o_expires_at,
    },
    201
  );
});
