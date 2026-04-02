import { createServerSupabase } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/handler";
import { jsonOk } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/guards";
import { passengerManifest } from "@/lib/db/manifests";

export const GET = withApiHandler(async (_request, context) => {
  const { id } = await context.params;
  const supabase = await createServerSupabase();
  await requireAdmin(supabase);
  const passengers = await passengerManifest(supabase, id);
  return jsonOk({ passengers });
});
