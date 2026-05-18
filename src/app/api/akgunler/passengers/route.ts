import { NextResponse } from "next/server";
import { getYolcular, setYolcuBilgisi } from "@/lib/akgunler/client";
import { verifyCartToken } from "@/lib/akgunler/cart-token";
import type { YolcuBilgiInput } from "@/lib/akgunler/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sId = searchParams.get("s_id");
    const gsId = searchParams.get("gs_id");
    const dsId = searchParams.get("ds_id");
    const yMod = searchParams.get("y_mod") ?? "tek-gidis";
    const cartToken = searchParams.get("cart_token") ?? "";

    if (!sId || !gsId) {
      return NextResponse.json({ error: "s_id ve gs_id zorunlu" }, { status: 400 });
    }

    if (!verifyCartToken(parseInt(sId), cartToken)) {
      return NextResponse.json({ error: "Gecersiz oturum" }, { status: 403 });
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

// Akgünler tel_no regex: /^[A-Za-z0-9-+ ]*$/, max 32 karakter.
// Daha güvenli olması için ham veriyi sadece rakam + opsiyonel başta '+' bırakacak şekilde normalize ediyoruz.
function sanitizePhone(phone: string): string {
  const digitsAndPlus = phone.replace(/[^\d+]/g, "");
  // Sadece baştaki + işaretine izin ver, diğerlerini sil
  const cleaned = digitsAndPlus.replace(/(?!^)\+/g, "");
  return cleaned.slice(0, 32);
}

// Diagnostic: gizli/unicode karakterleri görmek için char-code listesi üret
function charCodes(s: string): string {
  return Array.from(s).map((c) => c.charCodeAt(0)).join(",");
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      s_id: number;
      yolcular: YolcuBilgiInput[];
      cart_token: string;
    };

    if (!body.s_id || !body.yolcular?.length) {
      return NextResponse.json({ error: "s_id ve yolcular zorunlu" }, { status: 400 });
    }

    if (!verifyCartToken(body.s_id, body.cart_token)) {
      return NextResponse.json({ error: "Gecersiz oturum" }, { status: 403 });
    }

    // Ham telefon değerlerini logla (char-code ile)
    console.log("[passengers] step=raw_phones", body.yolcular.map((y, i) => ({
      idx: i,
      tel: y.yolcu_tel_no ?? null,
      tel_len: y.yolcu_tel_no?.length ?? 0,
      tel_codes: y.yolcu_tel_no ? charCodes(y.yolcu_tel_no) : null,
    })));

    const sanitizedYolcular = body.yolcular.map((y) => ({
      ...y,
      yolcu_tel_no: y.yolcu_tel_no ? sanitizePhone(y.yolcu_tel_no) : y.yolcu_tel_no,
    }));

    console.log("[passengers] step=sanitized_phones", sanitizedYolcular.map((y, i) => ({
      idx: i,
      tel: y.yolcu_tel_no ?? null,
      tel_len: y.yolcu_tel_no?.length ?? 0,
      tel_codes: y.yolcu_tel_no ? charCodes(y.yolcu_tel_no) : null,
    })));

    const result = await setYolcuBilgisi(body.s_id, sanitizedYolcular);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Akgunler passengers POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Yolcu bilgisi atanamadi" },
      { status: 502 }
    );
  }
}
