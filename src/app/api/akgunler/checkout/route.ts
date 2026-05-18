import { NextResponse } from "next/server";
import { buildStaticFormParams, AKGUNLER_3D_PAYMENT_URL } from "@/lib/akgunler/client";
import { verifyCartToken, generatePaymentCallbackToken } from "@/lib/akgunler/cart-token";
import { sanitizePhone } from "@/lib/akgunler/phone";
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

    const { sepetId, email, ccHolder, toplamFiyat, phone, cartToken } = body as unknown as CheckoutRequestBody;

    if (!sepetId || !email || !ccHolder || !toplamFiyat) {
      return NextResponse.json({ error: "Eksik parametreler" }, { status: 400 });
    }

    if (!verifyCartToken(sepetId, cartToken)) {
      return NextResponse.json({ error: "Gecersiz oturum" }, { status: 403 });
    }

    // Telefonu sunucu tarafında temizle — eski/kirli sepetlerde Akgünler bileteDonustur3D
    // "yanlis_formatli_deger: tel_no" dönüyor. tel_no parametresi tüm yolcuların telefonunu üzerine yazar.
    const sanitizedPhone = phone ? sanitizePhone(phone) : "";

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bilet.antsodenizcilik.com";

    // Akgünler 3DS callback'i sadece cavv/eci/xid/md/result POST eder.
    // sepetId, price_100, email, ccHolder, phone bizim sorumluluğumuzda — URL'e HMAC ile imzalı koyuyoruz.
    // ct (cart token) confirmation/tickets sayfası için aynen geri taşınır.
    const pt = generatePaymentCallbackToken(sepetId, toplamFiyat, email, ccHolder, sanitizedPhone);
    const callbackUrl = new URL(`${appUrl}/api/akgunler/payment-callback`);
    callbackUrl.searchParams.set("sid", String(sepetId));
    callbackUrl.searchParams.set("p", String(toplamFiyat));
    callbackUrl.searchParams.set("em", email);
    callbackUrl.searchParams.set("cn", ccHolder);
    callbackUrl.searchParams.set("tel", sanitizedPhone);
    callbackUrl.searchParams.set("pt", pt);
    callbackUrl.searchParams.set("ct", cartToken);

    const staticParams = buildStaticFormParams({
      sepetId,
      email,
      redirectionUrl: callbackUrl.toString(),
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
