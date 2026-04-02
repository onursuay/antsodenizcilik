import { createServerSupabase } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/handler";
import { jsonOk } from "@/lib/api/response";
import { requireOps } from "@/lib/auth/guards";
import { reconcileCounterDrift } from "@/lib/db/reconciliation";

export const POST = withApiHandler(async (_request, context) => {
  const { voyageId } = await context.params;
  const supabase = await createServerSupabase();
  await requireOps(supabase);
  await reconcileCounterDrift(supabase, voyageId);
  return jsonOk({ success: true });
});
