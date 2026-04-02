import { createServerSupabase } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/handler";
import { jsonOk } from "@/lib/api/response";
import { requireOps } from "@/lib/auth/guards";

export const GET = withApiHandler(async (_request, context) => {
  const { issueType } = await context.params;
  const supabase = await createServerSupabase();
  await requireOps(supabase);

  const { data, error } = await supabase
    .from("ops_review_queue")
    .select("*")
    .eq("status", "OPEN")
    .eq("issue_type", issueType)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return jsonOk({ entries: data ?? [] });
});
