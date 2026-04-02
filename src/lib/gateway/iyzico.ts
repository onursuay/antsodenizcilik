import crypto from "crypto";
import type { PaymentGateway } from "./types";

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`${name} environment variable is required`);
  return val;
}

export function createIyzicoGateway(): PaymentGateway {
  const apiKey = requireEnv("PAYMENT_GATEWAY_API_KEY");
  const secretKey = requireEnv("PAYMENT_GATEWAY_SECRET_KEY");
  const baseUrl = process.env.IYZICO_BASE_URL ?? "https://api.iyzipay.com";
  const appUrl = requireEnv("NEXT_PUBLIC_APP_URL");

  function generateAuthHeader(uri: string, body: string): Record<string, string> {
    const randomStr = crypto.randomBytes(8).toString("hex");
    const hashStr = `${apiKey}${randomStr}${secretKey}${body}`;
    const hash = crypto
      .createHash("sha1")
      .update(hashStr, "utf8")
      .digest("base64");
    const authValue = `IYZWS ${apiKey}:${hash}`;

    return {
      Authorization: authValue,
      "x-iyzi-rnd": randomStr,
      "Content-Type": "application/json",
    };
  }

  async function apiCall<T>(
    method: string,
    uri: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const bodyStr = body ? JSON.stringify(body) : "";
    const headers = generateAuthHeader(uri, bodyStr);
    const url = `${baseUrl}${uri}`;

    const res = await fetch(url, {
      method,
      headers,
      body: bodyStr || undefined,
    });

    const data = await res.json();

    if (data.status === "failure" || !res.ok) {
      throw new Error(
        data.errorMessage ?? data.message ?? `Gateway error: ${res.status}`
      );
    }

    return data as T;
  }

  return {
    async createCheckoutUrl(
      paymentId: string,
      amountKurus: number,
      currency: string
    ): Promise<string> {
      const amountStr = (amountKurus / 100).toFixed(2);

      const result = await apiCall<{ checkoutFormContent: string; token: string }>(
        "POST",
        "/payment/iyzi-init/checkoutform/initialize",
        {
          locale: "tr",
          conversationId: paymentId,
          price: amountStr,
          paidPrice: amountStr,
          currency: currency === "TRY" ? "TRY" : currency,
          basketId: paymentId,
          paymentGroup: "PRODUCT",
          callbackUrl: `${appUrl}/api/webhooks/payment`,
          buyer: {
            id: "BUYER",
            name: "Yolcu",
            surname: "Antso",
            email: "yolcu@antso.com",
            identityNumber: "11111111111",
            registrationAddress: "Istanbul",
            ip: "127.0.0.1",
            city: "Istanbul",
            country: "Turkey",
          },
          shippingAddress: {
            contactName: "Yolcu Antso",
            city: "Istanbul",
            country: "Turkey",
            address: "Istanbul",
          },
          billingAddress: {
            contactName: "Yolcu Antso",
            city: "Istanbul",
            country: "Turkey",
            address: "Istanbul",
          },
          basketItems: [
            {
              id: paymentId,
              name: "Feribot Bileti",
              category1: "Ulasim",
              itemType: "VIRTUAL",
              price: amountStr,
            },
          ],
        }
      );

      // iyzico returns an HTML form in checkoutFormContent.
      // Return the token — the frontend redirects to iyzico's hosted page.
      if (!result.token) {
        throw new Error("Gateway did not return checkout token");
      }

      return `${baseUrl}/payment/iyzi-init/checkoutform/auth?token=${result.token}`;
    },

    verifyWebhookSignature(body: string, signature: string): boolean {
      const computed = crypto
        .createHmac("sha256", secretKey)
        .update(body, "utf8")
        .digest("base64");
      return crypto.timingSafeEqual(
        Buffer.from(computed),
        Buffer.from(signature)
      );
    },

    async pollPaymentStatus(
      gatewayReferenceId: string
    ): Promise<"SETTLED" | "FAILED" | "PENDING"> {
      const result = await apiCall<{ paymentStatus: string }>(
        "POST",
        "/payment/detail",
        {
          locale: "tr",
          paymentId: gatewayReferenceId,
        }
      );

      switch (result.paymentStatus) {
        case "SUCCESS":
          return "SETTLED";
        case "FAILURE":
          return "FAILED";
        default:
          return "PENDING";
      }
    },

    async submitRefund(
      gatewayReferenceId: string,
      amountKurus: number
    ): Promise<string> {
      const result = await apiCall<{ paymentTransactionId: string }>(
        "POST",
        "/payment/refund",
        {
          locale: "tr",
          paymentTransactionId: gatewayReferenceId,
          price: (amountKurus / 100).toFixed(2),
          currency: "TRY",
        }
      );

      return result.paymentTransactionId;
    },
  };
}
