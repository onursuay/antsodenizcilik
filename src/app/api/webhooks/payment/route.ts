import { jsonOk, jsonError } from "@/lib/api/response";
import { verifyPaymentWebhook } from "@/lib/gateway/webhook";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { confirmBooking } from "@/lib/db/bookings";

/**
 * Parses the gateway-specific webhook payload into a normalized format.
 * Each gateway sends a different JSON structure.
 * Add cases here when adding new gateway adapters.
 */
function parseGatewayPayload(raw: unknown): {
  gatewayReferenceId: string;
  status: "SETTLED" | "FAILED";
} | null {
  if (!raw || typeof raw !== "object") return null;

  const data = raw as Record<string, unknown>;
  const gateway = process.env.PAYMENT_GATEWAY;

  // iyzico: { paymentId, status: "SUCCESS"|"FAILURE", ... }
  if (gateway === "iyzico") {
    const paymentId = data.paymentId as string | undefined;
    const iyziStatus = data.status as string | undefined;
    if (!paymentId || !iyziStatus) return null;
    return {
      gatewayReferenceId: paymentId,
      status: iyziStatus === "SUCCESS" ? "SETTLED" : "FAILED",
    };
  }

  // Generic: { gatewayReferenceId, status }
  const ref = data.gatewayReferenceId as string | undefined;
  const status = data.status as string | undefined;
  if (!ref || !status) return null;
  if (status !== "SETTLED" && status !== "FAILED") return null;
  return { gatewayReferenceId: ref, status };
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-webhook-signature") ?? "";

  if (!verifyPaymentWebhook(body, signature)) {
    return jsonError("Invalid webhook signature", 401, "invalid_signature");
  }

  // After signature passes: always return 200. Never return 5xx to gateway.
  try {
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      console.error("Payment webhook: malformed JSON body");
      return jsonOk({ received: true, error: "malformed_json" });
    }

    const payload = parseGatewayPayload(parsed);
    if (!payload) {
      console.error("Payment webhook: unrecognized payload structure", parsed);
      return jsonOk({ received: true, error: "unrecognized_payload" });
    }

    const supabase = createAdminSupabase();

    if (payload.status === "SETTLED") {
      const { data: payment, error: updateError } = await supabase
        .from("payments")
        .update({ status: "SETTLED", settled_at: new Date().toISOString() })
        .eq("gateway_reference_id", payload.gatewayReferenceId)
        .eq("status", "PENDING")
        .select("payment_id, hold_id")
        .single();

      if (updateError || !payment) {
        console.warn(
          "Payment webhook: could not update payment for ref",
          payload.gatewayReferenceId,
          updateError?.message ?? "already settled or not found"
        );
        return jsonOk({ received: true });
      }

      // Auto-confirm booking. The DB function is idempotent — if the user
      // already submitted passenger details via confirm-booking endpoint,
      // the existing booking is returned.
      try {
        await confirmBooking(supabase, {
          paymentId: payment.payment_id,
          passengers: [],
          vehicles: [],
          cabins: [],
        });
      } catch (confirmError) {
        console.warn(
          "Payment webhook: auto-confirm failed for payment",
          payment.payment_id,
          confirmError
        );
      }
    } else {
      const { error: updateError } = await supabase
        .from("payments")
        .update({ status: "FAILED" })
        .eq("gateway_reference_id", payload.gatewayReferenceId)
        .eq("status", "PENDING");

      if (updateError) {
        console.warn(
          "Payment webhook: could not update failed payment for ref",
          payload.gatewayReferenceId,
          updateError.message
        );
      }
    }
  } catch (error) {
    console.error("Payment webhook processing error:", error);
  }

  return jsonOk({ received: true });
}
