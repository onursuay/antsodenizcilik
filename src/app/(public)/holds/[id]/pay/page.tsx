"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CountdownTimer } from "@/components/domain/countdown-timer";

interface PaymentResponse {
  paymentId: string;
  status: string;
  isExisting: boolean;
  amountKurus: number;
  currency: string;
  checkoutUrl: string | null;
}

export default function PaymentPage() {
  const params = useParams<{ id: string }>();
  const holdId = params.id;

  const [expired, setExpired] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [payResult, setPayResult] = useState<PaymentResponse | null>(null);

  // Hold TTL estimate — 12 minutes from page load.
  // In a future iteration, a hold detail endpoint can provide the real expires_at.
  const [expiresAt] = useState(() =>
    new Date(Date.now() + 12 * 60 * 1000).toISOString()
  );

  const handleExpired = useCallback(() => {
    setExpired(true);
  }, []);

  async function handlePay() {
    setPaying(true);
    setPayError(null);

    try {
      // Server computes amount — no client-side pricing.
      // POST body is empty; server reads hold_items and prices server-side.
      const res = await fetch(`/api/holds/${holdId}/payment`, {
        method: "POST",
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 422 && json.error?.includes("expired")) {
          setExpired(true);
          return;
        }
        throw new Error(json.error ?? `Hata: ${res.status}`);
      }

      const result = json as PaymentResponse;
      setPayResult(result);

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Odeme baslatilamadi");
    } finally {
      setPaying(false);
    }
  }

  if (expired) {
    return (
      <div className="max-w-md">
        <h1 className="mb-2 text-2xl font-bold">Sure Doldu</h1>
        <p className="mb-4 text-sm text-gray-600">
          Rezervasyon suresi doldu. Lutfen yeni bir rezervasyon olusturun.
        </p>
        <Link
          href="/"
          className="inline-block rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          Seferlere Don
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <h1 className="mb-2 text-2xl font-bold">Odeme</h1>
      <p className="mb-1 text-sm text-gray-500">
        Rezervasyon: {holdId.slice(0, 8)}...
      </p>

      {/* Countdown */}
      <div className="mb-6 flex items-center gap-2">
        <span className="text-sm text-gray-500">Kalan sure:</span>
        <CountdownTimer expiresAt={expiresAt} onExpired={handleExpired} />
      </div>

      {/* Payment amount from server */}
      {payResult && (
        <div className="mb-4 rounded border p-3 text-sm">
          <p>
            Tutar:{" "}
            <span className="font-semibold">
              {(payResult.amountKurus / 100).toLocaleString("tr-TR", {
                minimumFractionDigits: 2,
              })}{" "}
              TL
            </span>
          </p>
        </div>
      )}

      {payResult && payResult.isExisting && (
        <div className="mb-4 rounded bg-blue-50 p-3 text-sm text-blue-700">
          Mevcut odeme bulundu. Durum: {payResult.status}
        </div>
      )}

      {/* Error */}
      {payError && (
        <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">
          {payError}
        </div>
      )}

      {/* Pay button */}
      {!payResult?.checkoutUrl && (
        <button
          onClick={handlePay}
          disabled={paying}
          className="w-full rounded bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {paying ? "Odeme baslatiliyor..." : "Odeme Yap"}
        </button>
      )}

      {payResult?.checkoutUrl && (
        <p className="mt-4 text-sm text-gray-500">
          Odeme sayfasina yonlendiriliyorsunuz...
        </p>
      )}
    </div>
  );
}
