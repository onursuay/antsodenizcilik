import crypto from "crypto";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";
}

function hmacVerify(body: string, signature: string, secret: string): boolean {
  if (!signature) return false;

  const computed = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("base64");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

export function verifyPaymentWebhook(
  body: string,
  signature: string
): boolean {
  // In production, bypass is impossible
  if (!isProduction() && process.env.WEBHOOK_SKIP_VERIFICATION === "true") {
    return true;
  }

  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("PAYMENT_WEBHOOK_SECRET is not configured");
  }

  return hmacVerify(body, signature, secret);
}

export function verifyRefundWebhook(
  body: string,
  signature: string
): boolean {
  if (!isProduction() && process.env.WEBHOOK_SKIP_VERIFICATION === "true") {
    return true;
  }

  const secret = process.env.REFUND_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("REFUND_WEBHOOK_SECRET is not configured");
  }

  return hmacVerify(body, signature, secret);
}
