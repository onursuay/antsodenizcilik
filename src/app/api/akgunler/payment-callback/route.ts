import { NextResponse } from "next/server";
import { bileteDonustur3D } from "@/lib/akgunler/client";
import { verifyCartToken } from "@/lib/akgunler/cart-token";

export async function POST(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bilet.antsodenizcilik.com";

  function failRedirect(msg: string) {
    return NextResponse.redirect(
      `${appUrl}/akgunler/confirmation/error?hata=${encodeURIComponent(msg)}`
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const ct = searchParams.get("ct") ?? "";

    const formData = await request.formData();

    const sepetId = parseInt((formData.get("sepet_id") as string) ?? "0");
    const result = formData.get("result") as string;
    const price100 = parseInt((formData.get("price_100") as string) ?? "0");
    const cavv = (formData.get("cavv") as string) ?? "";
    const eci = (formData.get("eci") as string) ?? "";
    const xid = (formData.get("xid") as string) ?? "";
    const md = (formData.get("md") as string) ?? "";
    const email = (formData.get("email") as string) ?? "";
    const ccHolder = (formData.get("cc_holder") as string) ?? "";

    // 1. Temel alan varlık kontrolleri
    if (!sepetId || sepetId <= 0) return failRedirect("Gecersiz sepet");
    if (!price100 || price100 <= 0) return failRedirect("Gecersiz fiyat");

    // 2. Callback imza doğrulaması — sahte POST gönderimini engeller
    if (!verifyCartToken(sepetId, ct)) {
      return failRedirect("Gecersiz istek");
    }

    // 3. 3D Secure sonucu
    if (result !== "success") {
      const errorMsg = (formData.get("error_message") as string) ?? "3D Secure basarisiz";
      return failRedirect(errorMsg);
    }

    // 4. 3D token alanlarının varlığı — Akgünler bu alanları doldurmalı
    if (!cavv && !eci && !xid && !md) {
      return failRedirect("3D dogrulama verileri eksik");
    }

    await bileteDonustur3D({
      sepetId,
      ccHolder,
      email,
      price100,
      cavv,
      eci,
      xid,
      md,
    });

    return NextResponse.redirect(
      `${appUrl}/akgunler/confirmation/${sepetId}?ct=${ct}`
    );
  } catch (error) {
    console.error("Akgunler payment callback error:", error);
    const msg = error instanceof Error ? error.message : "Bilet olusturulamadi";
    return failRedirect(msg);
  }
}
