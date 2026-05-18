import { createHmac, timingSafeEqual } from "crypto";

const TTL_SECONDS = 4 * 60 * 60; // 4 saat — tam booking akışını kapsar

function secret(): string {
  const s = process.env.AKGUNLER_CART_SECRET;
  if (!s) throw new Error("AKGUNLER_CART_SECRET env degiskeni tanimli degil");
  return s;
}

export function generateCartToken(sepetId: number): string {
  const expiresAt = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const mac = createHmac("sha256", secret())
    .update(`${sepetId}:${expiresAt}`)
    .digest("hex");
  return `${expiresAt}.${mac}`;
}

export function verifyCartToken(sepetId: number, token: string): boolean {
  if (!token || !sepetId) return false;

  const dot = token.indexOf(".");
  if (dot === -1) return false;

  const expiresAt = parseInt(token.slice(0, dot), 10);
  const mac = token.slice(dot + 1);

  if (isNaN(expiresAt) || Math.floor(Date.now() / 1000) > expiresAt) return false;

  const expected = createHmac("sha256", secret())
    .update(`${sepetId}:${expiresAt}`)
    .digest("hex");

  if (mac.length !== expected.length) return false;

  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(mac, "hex"));
  } catch {
    return false;
  }
}

// Payment callback token — Akgünler 3DS callback'inde sepetId/price100/email/ccHolder/phone
// POST body'sinde dönmüyor; bu değerleri URL'e koyup HMAC ile bağlıyoruz.
function paymentPayload(
  sepetId: number,
  price100: number,
  email: string,
  ccHolder: string,
  phone: string,
  expiresAt: number
) {
  return `payment-cb:${sepetId}:${price100}:${email}:${ccHolder}:${phone}:${expiresAt}`;
}

export function generatePaymentCallbackToken(
  sepetId: number,
  price100: number,
  email: string,
  ccHolder: string,
  phone: string
): string {
  const expiresAt = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const mac = createHmac("sha256", secret())
    .update(paymentPayload(sepetId, price100, email, ccHolder, phone, expiresAt))
    .digest("hex");
  return `${expiresAt}.${mac}`;
}

export function verifyPaymentCallbackToken(
  sepetId: number,
  price100: number,
  email: string,
  ccHolder: string,
  phone: string,
  token: string
): boolean {
  if (!token || !sepetId || !price100) return false;

  const dot = token.indexOf(".");
  if (dot === -1) return false;

  const expiresAt = parseInt(token.slice(0, dot), 10);
  const mac = token.slice(dot + 1);

  if (isNaN(expiresAt) || Math.floor(Date.now() / 1000) > expiresAt) return false;

  const expected = createHmac("sha256", secret())
    .update(paymentPayload(sepetId, price100, email, ccHolder, phone, expiresAt))
    .digest("hex");

  if (mac.length !== expected.length) return false;

  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(mac, "hex"));
  } catch {
    return false;
  }
}
