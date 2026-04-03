"use client";

import { useEffect, useRef, useState } from "react";

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

function formatPrice(amount: number) {
  return amount.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
        {label}
      </label>
      {children}
      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
    </div>
  );
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
      const response = await fetch("/api/akgunler/checkout", {
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

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Ödeme başlatılamadı");
      }

      setThreeDParams(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Ödeme işlemi başarısız"
      );
    } finally {
      setLoading(false);
    }
  }

  const cardPreviewNumber = cardNumber || "0000 0000 0000 0000";
  const cardPreviewName = cardHolder || "AD SOYAD";
  const cardPreviewExpiry = expMonth && expYear ? `${expMonth}/${expYear.slice(-2)}` : "AA/YY";

  return (
    <div>
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

      <div className="grid antso-box-gap xl:grid-cols-[1.08fr_0.92fr]">
        <div className="antso-box-stack">
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-brand-ocean/60">Ödeme</p>
                <h2 className="mt-3 text-3xl font-semibold text-slate-900">
                  Güvenli ödeme ile rezervasyonu tamamlayın
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Kart bilgileriniz şifreli iletilir ve ödeme Akgünler&apos;in 3D Secure ekranında
                  tamamlanır.
                </p>
              </div>

              <div className="rounded-[24px] bg-brand-mist px-5 py-4 text-brand-ink">
                <p className="text-[11px] uppercase tracking-[0.2em] text-brand-ocean/70">
                  Toplam tutar
                </p>
                <p className="mt-2 text-3xl font-semibold">{formatPrice(toplamFiyat)} TL</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-[24px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-[0_18px_40px_rgba(239,68,68,0.08)]">
              {error}
            </div>
          )}

          {loading && (
            <div className="rounded-[24px] border border-brand-sky/20 bg-brand-mist px-5 py-4 text-sm text-brand-ink">
              3D Secure doğrulama ekranına yönlendiriliyorsunuz.
            </div>
          )}

          <form onSubmit={handleSubmit} className="antso-box-stack">
            <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <div className="bg-brand-ink px-6 py-6 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-brand-seafoam">
                      Kart önizleme
                    </p>
                    <p className="mt-3 text-2xl font-semibold">{cardPreviewNumber}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-[#f7b64b]/90" />
                    <div className="-ml-4 h-10 w-10 rounded-full bg-[#ef5d5d]/90" />
                  </div>
                </div>
                <div className="mt-10 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/42">Kart sahibi</p>
                    <p className="mt-2 text-sm font-semibold text-white">{cardPreviewName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/42">Son kullanma</p>
                    <p className="mt-2 text-sm font-semibold text-white">{cardPreviewExpiry}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-5 p-6">
                <Field label="Kart numarası" hint="16 haneli kart numaranızı aralarda boşluk bırakarak girin.">
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm tracking-[0.25em] text-slate-900 outline-none transition focus:border-brand-sky focus:bg-white"
                  />
                </Field>

                <Field label="Kart üzerindeki isim">
                  <input
                    type="text"
                    required
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                    placeholder="AD SOYAD"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium uppercase tracking-[0.12em] text-slate-900 outline-none transition focus:border-brand-sky focus:bg-white"
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Ay">
                    <select
                      required
                      value={expMonth}
                      onChange={(e) => setExpMonth(e.target.value)}
                      className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-brand-sky focus:bg-white"
                    >
                      <option value="">MM</option>
                      {Array.from({ length: 12 }, (_, index) => {
                        const month = String(index + 1).padStart(2, "0");
                        return (
                          <option key={month} value={month}>
                            {month}
                          </option>
                        );
                      })}
                    </select>
                  </Field>

                  <Field label="Yıl">
                    <select
                      required
                      value={expYear}
                      onChange={(e) => setExpYear(e.target.value)}
                      className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-brand-sky focus:bg-white"
                    >
                      <option value="">YYYY</option>
                      {Array.from({ length: 10 }, (_, index) => {
                        const year = String(new Date().getFullYear() + index);
                        return (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        );
                      })}
                    </select>
                  </Field>

                  <Field label="CVV">
                    <input
                      type="text"
                      required
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="•••"
                      maxLength={4}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center font-mono text-sm tracking-[0.2em] text-slate-900 outline-none transition focus:border-brand-sky focus:bg-white"
                    />
                  </Field>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <label className="flex cursor-pointer items-start gap-4">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-slate-300 text-brand-sky focus:ring-brand-sky"
                  required
                />
                <div>
                  <p className="text-base font-semibold text-slate-900">Satış ve ödeme onayı</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Satış sözleşmesini kabul ediyor, ödemenin 3D Secure doğrulama adımı ile güvenli
                    şekilde tamamlanacağını onaylıyorsunuz.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex flex-col antso-box-gap sm:flex-row">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Yolcu bilgilerine dön
              </button>
              <button
                type="submit"
                disabled={loading || !agreed}
                className="inline-flex flex-1 items-center justify-center rounded-full bg-brand-ink px-6 py-3 text-sm font-semibold text-white shadow-[0_24px_50px_rgba(16,37,61,0.22)] transition hover:bg-[#0c1f34] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {loading ? "Yönlendiriliyor..." : `Güvenli öde · ${formatPrice(toplamFiyat)} TL`}
              </button>
            </div>
          </form>
        </div>

        <div className="antso-box-stack">
          <div className="rounded-[32px] bg-brand-ink p-6 text-white shadow-[0_30px_90px_rgba(16,37,61,0.24)]">
            <p className="text-xs uppercase tracking-[0.24em] text-brand-seafoam">Sipariş özeti</p>
            <div className="mt-5 antso-box-stack">
              <SummaryRow label="Rota" value={`${cikisSehirAd} → ${varisSehirAd}`} />
              <SummaryRow
                label="Sefer"
                value={sefer ? `${sefer.sefer_tarih} · ${sefer.gemi}` : "Sefer bilgisi bekleniyor"}
              />
              {sefer?.trip_number && <SummaryRow label="Sefer no" value={sefer.trip_number} />}
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <p className="text-xs uppercase tracking-[0.24em] text-brand-ocean/60">Yolcu kırılımı</p>
            <div className="mt-5 antso-box-stack">
              {yolcular.map((yolcu, index) => (
                <div
                  key={yolcu.yolcu_id}
                  className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {index + 1}. {yolcu.yolcu_tur_ad}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Akgünler biletleme tutarı</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">
                    {formatPrice(yolcu.toplam_fiyat_genel)} TL
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-[24px] bg-brand-mist px-4 py-4">
              <span className="text-sm font-semibold text-brand-ink">Toplam</span>
              <span className="text-2xl font-semibold text-brand-ink">{formatPrice(toplamFiyat)} TL</span>
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <p className="text-xs uppercase tracking-[0.24em] text-brand-ocean/60">Güvenli ödeme</p>
            <div className="mt-4 antso-box-stack text-sm text-slate-600">
              <ChecklistItem text="Kart bilgileriniz sunucuda saklanmaz." />
              <ChecklistItem text="Ödeme Akgünler 3D Secure ekranında tamamlanır." />
              <ChecklistItem text="Ödeme sonrası biletleriniz anında oluşturulur." />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.05] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.2em] text-white/42">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function ChecklistItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="m5 13 4 4L19 7" />
        </svg>
      </span>
      <span>{text}</span>
    </div>
  );
}
