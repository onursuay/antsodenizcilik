import crypto from "crypto";

const PIXEL_ID = process.env.META_PIXEL_ID;
const TOKEN = process.env.META_CAPI_TOKEN;

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export async function sendPurchaseEvent(params: {
  email: string;
  phone?: string;
  value: number;
  currency?: string;
  orderId: string | number;
  eventId?: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
}): Promise<void> {
  if (!PIXEL_ID || !TOKEN) {
    console.warn(
      "[meta-capi] META_PIXEL_ID veya META_CAPI_TOKEN tanımlı değil — Purchase CAPI GÖNDERİLMEDİ. " +
        "Vercel env değişkenlerini kontrol edin."
    );
    return;
  }

  const userData: Record<string, string> = { em: sha256(params.email) };
  if (params.phone) {
    userData.ph = sha256(params.phone.replace(/\D/g, ""));
  }
  if (params.clientIpAddress) userData.client_ip_address = params.clientIpAddress;
  if (params.clientUserAgent) userData.client_user_agent = params.clientUserAgent;

  const body = {
    data: [
      {
        event_name: "Purchase",
        event_id: params.eventId ?? `purchase.${params.orderId}`,
        event_time: Math.floor(Date.now() / 1000),
        event_source_url: `${process.env.NEXT_PUBLIC_APP_URL}/akgunler/confirmation/${params.orderId}`,
        action_source: "website",
        user_data: userData,
        custom_data: {
          value: params.value,
          currency: params.currency ?? "TRY",
          order_id: String(params.orderId),
        },
      },
    ],
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${TOKEN}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
    if (!res.ok) {
      console.error("[meta-capi] Purchase failed:", res.status, await res.text());
    } else {
      console.log("[meta-capi] Purchase sent ok");
    }
  } catch (err) {
    console.error("[meta-capi] Purchase error:", err);
  }
}
