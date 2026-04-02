import { createServerSupabase } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/handler";
import { jsonOk } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/guards";
import { revenueSummary } from "@/lib/db/revenue";

export const GET = withApiHandler(async (_request, context) => {
  const { id } = await context.params;
  const supabase = await createServerSupabase();
  await requireAdmin(supabase);
  const revenue = await revenueSummary(supabase, id);
  return jsonOk({ revenue });
});
