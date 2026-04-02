import { NextResponse } from "next/server";
import { getGuzergahlar, getGuzergahBilgileri } from "@/lib/akgunler/client";

export async function GET() {
  try {
    const guzergahlar = await getGuzergahlar();

    // Her güzergah için şehirleri de al
    const enriched = await Promise.all(
      guzergahlar.map(async (g) => {
        try {
          const bilgi = await getGuzergahBilgileri(g.id);
          return {
            id: g.id,
            baslik: g.baslik,
            sehirler: bilgi.sehirler,
            yolcu_turleri: bilgi.yolcu_turleri.filter(
              (yt) => yt.yolcu_tipi === "insan"
            ),
            arac_turleri: bilgi.yolcu_turleri.filter(
              (yt) => yt.yolcu_tipi === "diger"
            ),
          };
        } catch {
          return { id: g.id, baslik: g.baslik, sehirler: [], yolcu_turleri: [], arac_turleri: [] };
        }
      })
    );

    return NextResponse.json({ guzergahlar: enriched });
  } catch (error) {
    console.error("Akgunler routes error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Guzergah yuklenemedi" },
      { status: 502 }
    );
  }
}
