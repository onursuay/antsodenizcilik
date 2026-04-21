import { NextResponse } from "next/server";
import { getSeferler } from "@/lib/akgunler/client";
import { generateCartToken } from "@/lib/akgunler/cart-token";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const scId = searchParams.get("sc_id");
    const svId = searchParams.get("sv_id");
    const tarih = searchParams.get("tarih");
    const yMod = searchParams.get("y_mod") ?? "tek-gidis";
    const dTarih = searchParams.get("d_tarih") ?? "";
    const yolcuTurleri = searchParams.get("y_t");

    if (!scId || !svId || !tarih) {
      return NextResponse.json(
        { error: "sc_id, sv_id ve tarih parametreleri zorunlu" },
        { status: 400 }
      );
    }

    const result = await getSeferler({
      cikisSehirId: parseInt(scId),
      varisSehirId: parseInt(svId),
      yolculukModu: yMod as "tek-gidis" | "gidis-donus" | "donus-acik",
      gidisTarih: tarih,
      donusTarih: dTarih || undefined,
      yolcuTurleri: yolcuTurleri ? JSON.parse(yolcuTurleri) : [{ id: 1, sayi: 1 }],
    });

    const sepetId = (result as Record<string, unknown>).s_id as number | undefined;

    return NextResponse.json({
      ...result,
      ...(sepetId ? { cart_token: generateCartToken(sepetId) } : {}),
    });
  } catch (error) {
    console.error("Akgunler sailings error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Seferler yuklenemedi" },
      { status: 502 }
    );
  }
}
