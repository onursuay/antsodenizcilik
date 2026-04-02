import { createServerSupabase } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/handler";
import { jsonOk } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/guards";
import { departVoyage } from "@/lib/db/voyages";

export const POST = withApiHandler(async (_request, context) => {
  const { id } = await context.params;
  const supabase = await createServerSupabase();
  await requireAdmin(supabase);
  await departVoyage(supabase, id);
  return jsonOk({ success: true });
});
