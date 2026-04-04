import { NextResponse } from "next/server";
import { getYolcular, setYolcuBilgisi } from "@/lib/akgunler/client";
import type { YolcuBilgiInput } from "@/lib/akgunler/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sId = searchParams.get("s_id");
    const gsId = searchParams.get("gs_id");
    const dsId = searchParams.get("ds_id");
    const yMod = searchParams.get("y_mod") ?? "tek-gidis";

    if (!sId || !gsId) {
      return NextResponse.json({ error: "s_id ve gs_id zorunlu" }, { status: 400 });
    }

    const result = await getYolcular({
      sepetId: parseInt(sId),
      gidisSeferId: parseInt(gsId),
      donusSeferId: dsId ? parseInt(dsId) : undefined,
      yolculukModu: yMod as "tek-gidis" | "gidis-donus" | "donus-acik",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Akgunler passengers GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Yolcular yuklenemedi" },
      { status: 502 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      s_id: number;
      yolcular: YolcuBilgiInput[];
    };

    if (!body.s_id || !body.yolcular?.length) {
      return NextResponse.json({ error: "s_id ve yolcular zorunlu" }, { status: 400 });
    }

    const result = await setYolcuBilgisi(body.s_id, body.yolcular);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Akgunler passengers POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Yolcu bilgisi atanamadi" },
      { status: 502 }
    );
  }
}
