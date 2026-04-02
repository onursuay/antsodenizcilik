import { NextResponse } from "next/server";
import { getRezervasyonaAitBiletler } from "@/lib/akgunler/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sId = searchParams.get("s_id");

    if (!sId) {
      return NextResponse.json({ error: "s_id zorunlu" }, { status: 400 });
    }

    const result = await getRezervasyonaAitBiletler(parseInt(sId));
    return NextResponse.json(result);
  } catch (error) {
    console.error("Akgunler tickets error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Biletler yuklenemedi" },
      { status: 502 }
    );
  }
}
