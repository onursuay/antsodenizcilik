"use client";

import { useState, useRef, useEffect } from "react";

interface PaymentFormProps {
  sepetId: number;
  toplamFiyat: number;
  onBack: () => void;
}

interface ThreeDFormParams {
  action_url: string;
  fields: Record<string, string>;
}

export function PaymentForm({ sepetId, toplamFiyat, onBack }: PaymentFormProps) {
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threeDParams, setThreeDParams] = useState<ThreeDFormParams | null>(null);

  const autoFormRef = useRef<HTMLFormElement>(null);

  // Auto-submit the hidden 3D form when params arrive
  useEffect(() => {
    if (threeDParams && autoFormRef.current) {
      autoFormRef.current.submit();
    }
  }, [threeDParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/akgunler/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          s_id: sepetId,
          kart_sahibi: cardHolder,
          kart_no: cardNumber.replace(/\s/g, ""),
          son_kullanma_ay: expMonth,
          son_kullanma_yil: expYear,
          cvv,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Odeme baslatılamadı");

      setThreeDParams(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Odeme islemi basarısız");
    } finally {
      setLoading(false);
    }
  }

  function formatCardNumber(value: string) {
    return value
      .replace(/\D/g, "")
      .slice(0, 16)
      .replace(/(.{4})/g, "$1 ")
      .trim();
  }

  return (
    <div>
      {/* Hidden auto-submit form for 3D Secure redirect */}
      {threeDParams && (
        <form
          ref={autoFormRef}
          method="POST"
          action={threeDParams.action_url}
          style={{ display: "none" }}
        >
          {Object.entries(threeDParams.fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
        </form>
      )}

      <div className="mb-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
        Toplam Tutar:{" "}
        <span className="font-semibold">
          {toplamFiyat.toFixed(2)} TL
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {loading && (
        <div className="mb-4 rounded bg-gray-50 p-3 text-sm text-gray-500">
          3D Secure sayfasına yonlendiriliyorsunuz...
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Kart Uzerindeki Isim</label>
          <input
            type="text"
            required
            value={cardHolder}
            onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
            placeholder="AD SOYAD"
            className="mt-1 w-full rounded border px-3 py-2 text-sm uppercase"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Kart Numarası</label>
          <input
            type="text"
            required
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            placeholder="0000 0000 0000 0000"
            maxLength={19}
            className="mt-1 w-full rounded border px-3 py-2 text-sm tracking-widest"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium">Ay</label>
            <select
              required
              value={expMonth}
              onChange={(e) => setExpMonth(e.target.value)}
              className="mt-1 w-full rounded border px-2 py-2 text-sm"
            >
              <option value="">MM</option>
              {Array.from({ length: 12 }, (_, i) => {
                const m = String(i + 1).padStart(2, "0");
                return <option key={m} value={m}>{m}</option>;
              })}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Yil</label>
            <select
              required
              value={expYear}
              onChange={(e) => setExpYear(e.target.value)}
              className="mt-1 w-full rounded border px-2 py-2 text-sm"
            >
              <option value="">YYYY</option>
              {Array.from({ length: 10 }, (_, i) => {
                const y = String(new Date().getFullYear() + i);
                return <option key={y} value={y}>{y}</option>;
              })}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">CVV</label>
            <input
              type="text"
              required
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="123"
              maxLength={4}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
          <svg className="h-4 w-4 shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Odemeniz 3D Secure ile guvenli sekilde islenmektedir.
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={loading}
            className="rounded border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            ← Geri
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Isleniyor..." : `Ode — ${toplamFiyat.toFixed(2)} TL`}
          </button>
        </div>
      </form>
    </div>
  );
}
