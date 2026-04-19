import { NextResponse } from "next/server";
import { build3DSecureFormParams, AKGUNLER_3D_PAYMENT_URL } from "@/lib/akgunler/client";

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      sepetId: number;
      ccHolder: string;
      ccNr: string;
      ccCvc2: string;
      ccExpMonth: string;
      ccExpYear: string;
      email: string;
    };

    if (!body.sepetId || !body.ccHolder || !body.ccNr || !body.ccCvc2 || !body.email) {
      return NextResponse.json({ error: "Eksik odeme bilgileri" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bilet.antsodenizcilik.com";
    const callbackUrl = `${appUrl}/api/akgunler/payment-callback`;

    const formParams = build3DSecureFormParams({
      ...body,
      redirectionUrl: callbackUrl,
    });

    return NextResponse.json({
      formAction: AKGUNLER_3D_PAYMENT_URL,
      formParams,
    });
  } catch (error) {
    console.error("Akgunler checkout error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Odeme baslatilamadi" },
      { status: 502 }
    );
  }
}
