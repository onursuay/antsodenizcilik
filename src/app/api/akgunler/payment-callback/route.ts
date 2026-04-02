import { NextResponse } from "next/server";
import { bileteDonustur3D } from "@/lib/akgunler/client";

export async function POST(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://antsodenizcilik.vercel.app";

  try {
    const formData = await request.formData();
    const result = formData.get("result") as string;
    const cavv = (formData.get("cavv") as string) ?? "";
    const eci = (formData.get("eci") as string) ?? "";
    const xid = (formData.get("xid") as string) ?? "";
    const md = (formData.get("md") as string) ?? "";
    const sepetId = parseInt((formData.get("sepet_id") as string) ?? "0");
    const email = (formData.get("email") as string) ?? "";
    const ccHolder = (formData.get("cc_holder") as string) ?? "";
    const price100 = parseInt((formData.get("price_100") as string) ?? "0");

    if (result !== "success" || !sepetId) {
      const errorMsg = (formData.get("error_message") as string) ?? "3D Secure basarisiz";
      return NextResponse.redirect(
        `${appUrl}/akgunler/confirmation/error?hata=${encodeURIComponent(errorMsg)}`
      );
    }

    // 3D başarılı — bilete dönüştür
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
      `${appUrl}/akgunler/confirmation/${sepetId}`
    );
  } catch (error) {
    console.error("Akgunler payment callback error:", error);
    const msg = error instanceof Error ? error.message : "Bilet olusturulamadi";
    return NextResponse.redirect(
      `${appUrl}/akgunler/confirmation/error?hata=${encodeURIComponent(msg)}`
    );
  }
}
