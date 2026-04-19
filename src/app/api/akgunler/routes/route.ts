import { NextResponse } from "next/server";
import { getGuzergahlar, getGuzergahBilgileri } from "@/lib/akgunler/client";

// Antso sadece Anamur-Girne güzergahını satar (Akgünler id: 61)
const ANTSO_GUZERGAH_ID = 61;

// Vercel Edge cache: 1 saat fresh, 1 gün stale-while-revalidate
const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
};

export async function GET() {
  try {
    const guzergahlar = await getGuzergahlar();
    const filtered = guzergahlar.filter((g) => g.id === ANTSO_GUZERGAH_ID);

    const enriched = await Promise.all(
      filtered.map(async (g) => {
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
            kabin_turleri: bilgi.yolcu_turleri.filter(
              (yt) => yt.yolcu_tipi === "kabin"
            ),
          };
        } catch {
          return { id: g.id, baslik: g.baslik, sehirler: [], yolcu_turleri: [], arac_turleri: [], kabin_turleri: [] };
        }
      })
    );

    return NextResponse.json({ guzergahlar: enriched }, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error("Akgunler routes error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Guzergah yuklenemedi" },
      { status: 502 }
    );
  }
}
