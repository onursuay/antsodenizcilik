import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/db-errors";
import type { Json } from "@/types/database";

interface CreateHoldParams {
  voyageId: string;
  userId: string;
  sessionId: string;
  idempotencyKey: string;
  items: Json;
  ttlSeconds?: number;
}

interface CreateHoldResult {
  o_hold_id: string;
  o_expires_at: string;
}

export async function createHold(
  supabase: SupabaseClient,
  params: CreateHoldParams
): Promise<CreateHoldResult> {
  const { data, error } = await supabase.rpc("fn_create_hold", {
    p_voyage_id: params.voyageId,
    p_user_id: params.userId,
    p_session_id: params.sessionId,
    p_idempotency_key: params.idempotencyKey,
    p_items: params.items,
    p_ttl_seconds: params.ttlSeconds ?? 720,
  });

  if (error) throw mapDbError(error);
  return data[0] as CreateHoldResult;
}

export async function releaseHold(
  supabase: SupabaseClient,
  holdId: string
): Promise<void> {
  const { error } = await supabase.rpc("fn_release_hold", {
    p_hold_id: holdId,
  });

  if (error) throw mapDbError(error);
}
