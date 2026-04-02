import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/db-errors";
import type { OpsIssueType } from "@/types/domain";

interface OpsQueueSummaryRow {
  issue_type: OpsIssueType;
  open_count: number;
  oldest_open_at: string;
  newest_open_at: string;
}

export async function opsQueueSummary(
  supabase: SupabaseClient
): Promise<OpsQueueSummaryRow[]> {
  const { data, error } = await supabase.rpc("fn_ops_queue_summary");
  if (error) throw mapDbError(error);
  return data as OpsQueueSummaryRow[];
}

interface ResolveOpsReviewParams {
  reviewId: string;
  resolutionAction: string;
  resolvedBy: string;
}

export async function resolveOpsReview(
  supabase: SupabaseClient,
  params: ResolveOpsReviewParams
): Promise<void> {
  const { error } = await supabase.rpc("fn_resolve_ops_review", {
    p_review_id: params.reviewId,
    p_resolution_action: params.resolutionAction,
    p_resolved_by: params.resolvedBy,
  });
  if (error) throw mapDbError(error);
}
