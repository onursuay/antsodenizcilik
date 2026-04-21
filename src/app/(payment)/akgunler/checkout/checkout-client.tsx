"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentForm } from "@/components/domain/akgunler/payment-form";

interface SeferData {
  id: number;
  sefer_tarih: string;
  gemi: string;
  ucret: number;
  formatted_price: string;
  trip_number?: string;
  full_date?: string;
}

interface YolcuData {
  yolcu_id: number;
  yolcu_tur_ad: string;
  toplam_fiyat_genel: number;
}

interface CheckoutSession {
  toplamFiyat: number;
  sefer: SeferData | undefined;
  cikisSehirAd: string;
  varisSehirAd: string;
  yolcular: YolcuData[];
}

export const CHECKOUT_SESSION_KEY = "akgunler_payment_session";

export function CheckoutClient({
  sepetId,
  cartToken,
}: {
  sepetId: number;
  cartToken: string;
}) {
  const router = useRouter();
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(CHECKOUT_SESSION_KEY);
    if (raw) {
      try {
        setSession(JSON.parse(raw) as CheckoutSession);
        sessionStorage.removeItem(CHECKOUT_SESSION_KEY);
      } catch {
        setMissing(true);
      }
    } else {
      setMissing(true);
    }
  }, []);

  if (missing) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md text-center">
          <p className="text-base font-semibold text-slate-900">Oturum süresi doldu</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Ödeme ekranına yeniden ulaşmak için lütfen bilet arama akışını tekrar başlatın.
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-brand-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0c1f34]"
          >
            Ana sayfaya dön
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="mx-auto max-w-[86rem] px-4 py-10 sm:px-6 lg:px-8">
      <PaymentForm
        sepetId={sepetId}
        cartToken={cartToken}
        toplamFiyat={session.toplamFiyat}
        onBack={() => router.push("/")}
        sefer={session.sefer}
        cikisSehirAd={session.cikisSehirAd}
        varisSehirAd={session.varisSehirAd}
        yolcular={session.yolcular}
      />
    </div>
  );
}
