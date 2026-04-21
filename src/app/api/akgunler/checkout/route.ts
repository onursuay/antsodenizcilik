import { NextResponse } from "next/server";
import { buildStaticFormParams, AKGUNLER_3D_PAYMENT_URL } from "@/lib/akgunler/client";
import { verifyCartToken, generateCartToken } from "@/lib/akgunler/cart-token";
import type { CheckoutRequestBody } from "@/lib/akgunler/types";

// Kart verisi bu endpoint'e asla gelmemeli.
// Yanlışlıkla gönderilirse hard-reject et.
const FORBIDDEN_CARD_FIELDS = ["ccNr", "cc_nr", "ccCvc2", "cc_cvc2", "cvv", "kart_no", "cardNumber"];

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;

    if (FORBIDDEN_CARD_FIELDS.some((f) => f in body)) {
      return NextResponse.json({ error: "Gecersiz istek" }, { status: 400 });
    }

    const { sepetId, email, cartToken } = body as unknown as CheckoutRequestBody;

    if (!sepetId || !email) {
      return NextResponse.json({ error: "Eksik parametreler" }, { status: 400 });
    }

    if (!verifyCartToken(sepetId, cartToken)) {
      return NextResponse.json({ error: "Gecersiz oturum" }, { status: 403 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bilet.antsodenizcilik.com";
    const ct = generateCartToken(sepetId);
    const callbackUrl = `${appUrl}/api/akgunler/payment-callback?ct=${ct}`;

    const staticParams = buildStaticFormParams({
      sepetId,
      email,
      redirectionUrl: callbackUrl,
    });

    return NextResponse.json({
      formAction: AKGUNLER_3D_PAYMENT_URL,
      staticParams,
    });
  } catch (error) {
    console.error("Akgunler checkout error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Odeme baslatilamadi" },
      { status: 502 }
    );
  }
}
