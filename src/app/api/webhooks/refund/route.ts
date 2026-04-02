import { jsonOk, jsonError } from "@/lib/api/response";
import { verifyRefundWebhook } from "@/lib/gateway/webhook";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { markRefundConfirmed, markRefundFailed } from "@/lib/db/refunds";

/**
 * Parses gateway-specific refund webhook payload.
 */
function parseRefundPayload(raw: unknown): {
  gatewayRefundReference: string;
  status: "CONFIRMED" | "FAILED";
} | null {
  if (!raw || typeof raw !== "object") return null;

  const data = raw as Record<string, unknown>;
  const gateway = process.env.PAYMENT_GATEWAY;

  // iyzico: { paymentTransactionId, status: "SUCCESS"|"FAILURE" }
  if (gateway === "iyzico") {
    const ref = data.paymentTransactionId as string | undefined;
    const iyziStatus = data.status as string | undefined;
    if (!ref || !iyziStatus) return null;
    return {
      gatewayRefundReference: ref,
      status: iyziStatus === "SUCCESS" ? "CONFIRMED" : "FAILED",
    };
  }

  // Generic: { gatewayRefundReference, status }
  const ref = data.gatewayRefundReference as string | undefined;
  const status = data.status as string | undefined;
  if (!ref || !status) return null;
  if (status !== "CONFIRMED" && status !== "FAILED") return null;
  return { gatewayRefundReference: ref, status };
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-webhook-signature") ?? "";

  if (!verifyRefundWebhook(body, signature)) {
    return jsonError("Invalid webhook signature", 401, "invalid_signature");
  }

  // After signature passes: always return 200
  try {
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      console.error("Refund webhook: malformed JSON body");
      return jsonOk({ received: true, error: "malformed_json" });
    }

    const payload = parseRefundPayload(parsed);
    if (!payload) {
      console.error("Refund webhook: unrecognized payload structure", parsed);
      return jsonOk({ received: true, error: "unrecognized_payload" });
    }

    const supabase = createAdminSupabase();

    const { data: refund } = await supabase
      .from("refund_records")
      .select("refund_id")
      .eq("gateway_refund_reference", payload.gatewayRefundReference)
      .single();

    if (!refund) {
      console.warn(
        "Refund webhook: no refund found for gateway ref",
        payload.gatewayRefundReference
      );
      return jsonOk({ received: true });
    }

    if (payload.status === "CONFIRMED") {
      await markRefundConfirmed(supabase, refund.refund_id);
    } else {
      await markRefundFailed(supabase, refund.refund_id, false);
    }
  } catch (error) {
    console.error("Refund webhook processing error:", error);
  }

  return jsonOk({ received: true });
}
