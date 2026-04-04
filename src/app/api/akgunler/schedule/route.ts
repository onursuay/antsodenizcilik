import { NextResponse } from "next/server";
import { getFerrySchedule } from "@/lib/akgunler/schedule";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const route = searchParams.get("route") ?? undefined;
    const data = await getFerrySchedule(route);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Akgunler schedule error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Sefer takvimi alınamadı.",
      },
      { status: 502 }
    );
  }
}
