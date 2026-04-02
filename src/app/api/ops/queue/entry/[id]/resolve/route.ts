import { z } from "zod/v4";
import { createServerSupabase } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/handler";
import { jsonOk } from "@/lib/api/response";
import { requireOps } from "@/lib/auth/guards";
import { parseBody } from "@/lib/api/body";
import { resolveOpsReview } from "@/lib/db/ops";

const resolveSchema = z.object({
  resolutionAction: z.string().min(1),
  resolvedBy: z.string().min(1),
});

export const POST = withApiHandler(async (request, context) => {
  const { id } = await context.params;
  const supabase = await createServerSupabase();
  await requireOps(supabase);

  const body = await parseBody(request, resolveSchema);

  await resolveOpsReview(supabase, {
    reviewId: id,
    resolutionAction: body.resolutionAction,
    resolvedBy: body.resolvedBy,
  });

  return jsonOk({ success: true });
});
