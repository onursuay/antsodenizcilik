import { createServerSupabase } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/handler";
import { jsonOk } from "@/lib/api/response";
import { verifyOwnership } from "@/lib/api/auth";
import { releaseHold } from "@/lib/db/holds";

export const DELETE = withApiHandler(async (_request, context) => {
  const { id } = await context.params;
  const supabase = await createServerSupabase();

  await verifyOwnership(supabase, "holds", "hold_id", id);
  await releaseHold(supabase, id);

  return jsonOk({ success: true });
});
