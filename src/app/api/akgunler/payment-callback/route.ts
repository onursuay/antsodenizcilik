import { NextResponse } from "next/server";
import { bileteDonustur3D } from "@/lib/akgunler/client";
import { verifyPaymentCallbackToken } from "@/lib/akgunler/cart-token";
import { AkgunlerApiError } from "@/lib/akgunler/errors";
import { sendPurchaseEvent } from "@/lib/analytics/meta-capi";

export async function POST(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bilet.antsodenizcilik.com";

  function failRedirect(msg: string) {
    return NextResponse.redirect(
      `${appUrl}/akgunler/confirmation/error?hata=${encodeURIComponent(msg)}`
    );
  }

  try {
    const { searchParams } = new URL(request.url);

    // URL query'den (imzalı) — sepetId/price100/email/ccHolder Akgünler POST'unda dönmez
    const sepetId = parseInt(searchParams.get("sid") ?? "0", 10);
    const price100 = parseInt(searchParams.get("p") ?? "0", 10);
    const email = searchParams.get("em") ?? "";
    const ccHolder = searchParams.get("cn") ?? "";
    const phone = searchParams.get("tel") ?? "";
    const pt = searchParams.get("pt") ?? "";
    const ct = searchParams.get("ct") ?? "";

    const formData = await request.formData();

    // Akgünler'in callback'inde gelen alan adlarını logla (değer yok)
    const allKeys = Array.from(formData.keys());
    console.log("[callback] step=entry fields_present:", allKeys);

    const result = (formData.get("result") as string) ?? "";
    const cavv = (formData.get("cavv") as string) ?? "";
    const eci = (formData.get("eci") as string) ?? "";
    const xid = (formData.get("xid") as string) ?? "";
    const md = (formData.get("md") as string) ?? "";

    console.log("[callback] step=fields_summary", {
      sepetId,
      price100,
      result,
      email_present: !!email,
      ccHolder_present: !!ccHolder,
      pt_present: !!pt,
      cavv_present: !!cavv,
      eci_present: !!eci,
      xid_present: !!xid,
      md_present: !!md,
    });

    // 1. 3D Secure sonucu — hata callback'inde sepet_id gelmeyebilir, önce bunu kontrol et
    if (result !== "success") {
      const errorMsg =
        (formData.get("error_description") as string) ||
        (formData.get("error_message") as string) ||
        (formData.get("error") as string) ||
        "3D Secure basarisiz";
      console.log("[callback] step=fail reason=3d_failed error_msg:", errorMsg);
      return failRedirect(errorMsg);
    }

    if (!sepetId || sepetId <= 0) {
      console.log("[callback] step=fail reason=gecersiz_sepetId sepetId:", sepetId);
      return failRedirect("Gecersiz sepet");
    }
    if (!price100 || price100 <= 0) {
      console.log("[callback] step=fail reason=gecersiz_price100 price100:", price100);
      return failRedirect("Gecersiz fiyat");
    }
    if (!email) {
      console.log("[callback] step=fail reason=email_missing");
      return failRedirect("E-posta bilgisi eksik");
    }

    const ptValid = verifyPaymentCallbackToken(sepetId, price100, email, ccHolder, phone, pt);
    console.log("[callback] step=pt_verify result:", ptValid, "phone_present:", !!phone);
    if (!ptValid) return failRedirect("Gecersiz istek");

    if (!cavv && !eci && !xid && !md) {
      console.log("[callback] step=fail reason=3d_fields_missing");
      return failRedirect("3D dogrulama verileri eksik");
    }

    console.log("[callback] step=bileteDonustur3D_calling tel_len:", phone.length);
    await bileteDonustur3D({
      sepetId,
      ccHolder,
      email,
      price100,
      cavv,
      eci,
      xid,
      md,
      telNo: phone, // tüm yolcuların telefonunu üzerine yazar — eski kirli sepetleri kurtarır
    });
    console.log("[callback] step=bileteDonustur3D_success");

    sendPurchaseEvent({
      email,
      phone: phone || undefined,
      value: price100 / 100,
      orderId: sepetId,
      clientIpAddress: request.headers.get("x-forwarded-for") ?? undefined,
      clientUserAgent: request.headers.get("user-agent") ?? undefined,
    }).catch(() => {});

    return NextResponse.redirect(
      `${appUrl}/akgunler/confirmation/${sepetId}?ct=${encodeURIComponent(ct)}`
    );
  } catch (error) {
    if (error instanceof AkgunlerApiError) {
      console.error("[callback] step=akgunler_error_full", {
        hata: error.hata,
        hata_aciklama: error.hataAciklama,
        message: error.message,
        stack: error.stack,
      });
      // hata_aciklama'yı kullanıcıya doğrudan göster (sadece hata kodu değil)
      return failRedirect(error.hataAciklama || error.hata || "Akgunler hatasi");
    }
    console.error("[callback] step=unexpected_error", error instanceof Error ? error.message : String(error));
    const msg = error instanceof Error ? error.message : "Bilet olusturulamadi";
    return failRedirect(msg);
  }
}
