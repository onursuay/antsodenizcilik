import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/db-errors";

export async function openVoyage(
  supabase: SupabaseClient,
  voyageId: string
): Promise<void> {
  const { error } = await supabase.rpc("fn_open_voyage", {
    p_voyage_id: voyageId,
  });
  if (error) throw mapDbError(error);
}

export async function closeVoyage(
  supabase: SupabaseClient,
  voyageId: string
): Promise<void> {
  const { error } = await supabase.rpc("fn_close_voyage", {
    p_voyage_id: voyageId,
  });
  if (error) throw mapDbError(error);
}

export async function departVoyage(
  supabase: SupabaseClient,
  voyageId: string
): Promise<void> {
  const { error } = await supabase.rpc("fn_depart_voyage", {
    p_voyage_id: voyageId,
  });
  if (error) throw mapDbError(error);
}

export async function cancelVoyage(
  supabase: SupabaseClient,
  voyageId: string
): Promise<void> {
  const { error } = await supabase.rpc("fn_cancel_voyage", {
    p_voyage_id: voyageId,
  });
  if (error) throw mapDbError(error);
}
