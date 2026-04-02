import { createServerSupabase } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/handler";
import { jsonOk } from "@/lib/api/response";
import { requireOps } from "@/lib/auth/guards";
import { assertCapacityConsistency } from "@/lib/db/reconciliation";
import { ApiError } from "@/lib/errors/db-errors";

export const GET = withApiHandler(async (_request, context) => {
  const { voyageId } = await context.params;
  const supabase = await createServerSupabase();
  await requireOps(supabase);

  try {
    await assertCapacityConsistency(supabase, voyageId);
    return jsonOk({ consistent: true });
  } catch (error) {
    if (error instanceof ApiError && error.status === 422) {
      return jsonOk({ consistent: false, error: error.message });
    }
    throw error;
  }
});
