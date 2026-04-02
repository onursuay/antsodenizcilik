"use client";

import { useState, useRef, useEffect } from "react";

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

interface PaymentFormProps {
  sepetId: number;
  toplamFiyat: number;
  onBack: () => void;
  sefer: SeferData | undefined;
  cikisSehirAd: string;
  varisSehirAd: string;
  yolcular: YolcuData[];
}

interface ThreeDFormParams {
  action_url: string;
  fields: Record<string, string>;
}

function formatCardNumber(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

export function PaymentForm({
  sepetId,
  toplamFiyat,
  onBack,
  sefer,
  cikisSehirAd,
  varisSehirAd,
  yolcular,
}: PaymentFormProps) {
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threeDParams, setThreeDParams] = useState<ThreeDFormParams | null>(null);
  const autoFormRef = useRef<HTMLFormElement>(null);

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
      if (!res.ok) throw new Error(data.error ?? "Ödeme başlatılamadı");
      setThreeDParams(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ödeme işlemi başarısız");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Hidden 3D Secure auto-submit form */}
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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main payment form */}
        <div className="space-y-5 lg:col-span-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Ödeme Bilgileri</h2>
            <p className="mt-1 text-sm text-slate-500">
              Kart bilgileriniz şifreli iletilir ve saklanmaz.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              3D Secure sayfasına yönlendiriliyorsunuz…
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Card form */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              {/* Card visual strip */}
              <div className="flex items-center justify-between rounded-t-2xl bg-slate-900 px-6 py-4">
                <p className="text-sm font-semibold text-white">Kart Bilgileri</p>
                <div className="flex items-center gap-2">
                  <div className="h-7 w-11 rounded bg-white/20 flex items-center justify-center">
                    <div className="h-4 w-4 rounded-full bg-yellow-400 opacity-80" />
                    <div className="-ml-2 h-4 w-4 rounded-full bg-red-400 opacity-80" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-6">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Kart Numarası
                  </label>
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="0000  0000  0000  0000"
                    maxLength={19}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm tracking-widest text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Kart Üzerindeki İsim
                  </label>
                  <input
                    type="text"
                    required
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                    placeholder="AD SOYAD"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm uppercase tracking-wide text-slate-900 placeholder-slate-300 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Ay
                    </label>
                    <select
                      required
                      value={expMonth}
                      onChange={(e) => setExpMonth(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">MM</option>
                      {Array.from({ length: 12 }, (_, i) => {
                        const m = String(i + 1).padStart(2, "0");
                        return (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Yıl
                    </label>
                    <select
                      required
                      value={expYear}
                      onChange={(e) => setExpYear(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">YYYY</option>
                      {Array.from({ length: 10 }, (_, i) => {
                        const y = String(new Date().getFullYear() + i);
                        return (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      CVV
                    </label>
                    <input
                      type="text"
                      required
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="•••"
                      maxLength={4}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-center font-mono text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Agreement */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  required
                />
                <p className="text-sm leading-relaxed text-slate-600">
                  <span className="font-semibold text-slate-900">Satış Sözleşmesi</span>'ni okudum
                  ve kabul ediyorum. Ödemenin{" "}
                  <span className="font-semibold text-slate-900">3D Secure</span> ile
                  güvenle işleneceğini onaylıyorum.
                </p>
              </label>
            </div>

            {/* Pay CTA */}
            <button
              type="submit"
              disabled={loading || !agreed}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-blue-600 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              {loading
                ? "İşleniyor…"
                : `Güvenli Öde — ${toplamFiyat.toFixed(2)} TL`}
            </button>

            {/* Security badge */}
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <svg className="h-3.5 w-3.5 text-slate-300" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              256-bit SSL şifrelemesi · 3D Secure ile güvende
            </div>
          </form>

          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Yolcu bilgilerine geri dön
          </button>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-32 space-y-4">
            {/* Trip summary */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Sefer Özeti
              </p>
              <div className="flex items-center gap-2 text-base font-bold text-slate-900">
                <span>{cikisSehirAd}</span>
                <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span>{varisSehirAd}</span>
              </div>
              {sefer && (
                <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tarih / Saat</span>
                    <span className="font-medium text-slate-900">{sefer.sefer_tarih}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Gemi</span>
                    <span className="font-medium text-slate-900">{sefer.gemi}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Price breakdown */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Fiyat Özeti
              </p>
              <div className="space-y-2">
                {yolcular.map((y, i) => (
                  <div key={y.yolcu_id} className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      {i + 1}. {y.yolcu_tur_ad}
                    </span>
                    <span className="font-medium text-slate-900">
                      {y.toplam_fiyat_genel > 0
                        ? `${y.toplam_fiyat_genel.toFixed(2)} TL`
                        : "—"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3">
                <span className="text-sm font-bold text-blue-900">Toplam</span>
                <span className="text-xl font-bold text-blue-700">
                  {toplamFiyat.toFixed(2)} TL
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
