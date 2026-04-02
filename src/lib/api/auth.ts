import type { SupabaseClient, User } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/guards";
import { ApiError } from "@/lib/errors/db-errors";

export async function getAuthUser(supabase: SupabaseClient): Promise<User> {
  return requireAuth(supabase);
}

export async function getAuthUserId(supabase: SupabaseClient): Promise<string> {
  const user = await requireAuth(supabase);
  return user.id;
}

export async function verifyOwnership(
  supabase: SupabaseClient,
  table: string,
  idColumn: string,
  idValue: string,
  userIdColumn = "user_id"
): Promise<void> {
  const userId = await getAuthUserId(supabase);

  const { data, error } = await supabase
    .from(table)
    .select(userIdColumn)
    .eq(idColumn, idValue)
    .single();

  if (error || !data) {
    throw new ApiError("Not found", 404, "not_found");
  }

  const row = data as unknown as Record<string, unknown>;
  if (row[userIdColumn] !== userId) {
    throw new ApiError("Not found", 404, "not_found");
  }
}
