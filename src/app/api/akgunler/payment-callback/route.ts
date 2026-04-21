import { NextResponse } from "next/server";
import { bileteDonustur3D } from "@/lib/akgunler/client";
import { verifyCartToken } from "@/lib/akgunler/cart-token";
import { AkgunlerApiError } from "@/lib/akgunler/errors";

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

    // Callback'ten gelen tüm alan adlarını logla (değer yok)
    const allKeys = Array.from(formData.keys());
    console.log("[callback] step=entry fields_present:", allKeys);

    const sepetId = parseInt((formData.get("sepet_id") as string) ?? "0");
    const result = formData.get("result") as string;
    const price100Raw = (formData.get("price_100") as string) ?? "";
    const price100 = parseInt(price100Raw || "0");
    const cavv = (formData.get("cavv") as string) ?? "";
    const eci = (formData.get("eci") as string) ?? "";
    const xid = (formData.get("xid") as string) ?? "";
    const md = (formData.get("md") as string) ?? "";
    const email = (formData.get("email") as string) ?? "";
    const ccHolder = (formData.get("cc_holder") as string) ?? "";

    // Alan varlık özeti — değer yok
    console.log("[callback] step=fields_summary", {
      sepetId,
      result,
      price100_raw: price100Raw || "(yok)",
      price100_parsed: price100,
      email: !!email,
      ccHolder: !!ccHolder,
      ct: !!ct,
      cavv: !!cavv,
      eci: !!eci,
      xid: !!xid,
      md: !!md,
    });

    // 1. 3D Secure sonucu — hata callback'inde sepet_id gelmeyebilir, önce bunu kontrol et
    console.log("[callback] step=result_check result:", result);
    if (result !== "success") {
      // Akgünler hata mesajını error_description veya error_message alanında gönderebilir
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
      console.log("[callback] step=fail reason=gecersiz_price100 price100:", price100, "raw:", price100Raw || "(yok)");
      return failRedirect("Gecersiz fiyat");
    }

    const ctValid = verifyCartToken(sepetId, ct);
    console.log("[callback] step=ct_verify result:", ctValid);
    if (!ctValid) return failRedirect("Gecersiz istek");

    if (!cavv && !eci && !xid && !md) {
      console.log("[callback] step=fail reason=3d_fields_missing");
      return failRedirect("3D dogrulama verileri eksik");
    }

    // bileteDonustur3D'ye gönderilecek payload şekli
    console.log("[callback] step=bileteDonustur3D_payload_shape", {
      s_id: sepetId,
      cc_holder: !!ccHolder,
      email: !!email,
      price_100: price100,
      cavv: !!cavv,
      eci: !!eci,
      xid: !!xid,
      md: !!md,
    });

    console.log("[callback] step=bileteDonustur3D_calling");
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
    console.log("[callback] step=bileteDonustur3D_success");

    return NextResponse.redirect(
      `${appUrl}/akgunler/confirmation/${sepetId}?ct=${ct}`
    );
  } catch (error) {
    if (error instanceof AkgunlerApiError) {
      console.error("[callback] step=akgunler_error", {
        hata: error.hata,
        hata_aciklama: error.hataAciklama,
      });
    } else {
      console.error("[callback] step=unexpected_error", error instanceof Error ? error.message : String(error));
    }
    const msg = error instanceof Error ? error.message : "Bilet olusturulamadi";
    return failRedirect(msg);
  }
}
