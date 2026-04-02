import { NextResponse } from "next/server";
import { getUlkeler } from "@/lib/akgunler/client";

export async function GET() {
  try {
    const ulkeler = await getUlkeler();
    return NextResponse.json({ ulkeler });
  } catch (error) {
    console.error("Akgunler countries error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ulkeler yuklenemedi" },
      { status: 502 }
    );
  }
}
