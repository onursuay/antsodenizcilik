import { createServerSupabase } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/handler";
import { jsonOk } from "@/lib/api/response";
import { requireOps } from "@/lib/auth/guards";
import { opsQueueSummary } from "@/lib/db/ops";

export const GET = withApiHandler(async () => {
  const supabase = await createServerSupabase();
  await requireOps(supabase);
  const summary = await opsQueueSummary(supabase);
  return jsonOk({ summary });
});
