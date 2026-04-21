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
  cartToken: string;
  toplamFiyat: number;
  onBack: () => void;
  sefer: SeferData | undefined;
  cikisSehirAd: string;
  varisSehirAd: string;
  yolcular: YolcuData[];
}

interface CheckoutInitData {
  formAction: string;
  staticParams: Record<string, string>;
}

function formatCardNumber(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatPrice(amount: number) {
  // Akgünler API fiyatları kuruş (×100). TL'ye çevir.
  return (amount / 100).toLocaleString("tr-TR", {
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
  cartToken,
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
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [initData, setInitData] = useState<CheckoutInitData | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Bileşen yüklendiğinde sunucudan statik form alanlarını al.
  // Kart verisi bu istekte YOK — sunucuya asla ulaşmaz.
  useEffect(() => {
    fetch("/api/akgunler/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sepetId, email: "", cartToken }),
    })
      .then((res) => res.json())
      .then((data: CheckoutInitData) => setInitData(data))
      .catch(() => setInitError("Ödeme ekranı yüklenemedi. Lütfen sayfayı yenileyin."));
  }, [sepetId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!initData) {
      setSubmitError("Ödeme bilgileri henüz hazır değil. Lütfen bekleyin.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    // E-posta alanını staticParams içine güncelle, ardından formu doğrudan Akgünler'e gönder.
    // Kart verisi (cc_nr, cc_cvc2) sunucuya hiç gitmez; tarayıcıdan Akgünler'e doğrudan POST edilir.
    const emailInput = formRef.current?.querySelector<HTMLInputElement>('input[name="email"]');
    if (emailInput) emailInput.value = email;

    formRef.current?.submit();
  }

  const cardPreviewNumber = cardNumber || "0000 0000 0000 0000";
  const cardPreviewName = cardHolder || "AD SOYAD";
  const cardPreviewExpiry = expMonth && expYear ? `${expMonth}/${expYear.slice(-2)}` : "AA/YY";

  if (initError) {
    return (
      <div className="rounded-[24px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-[0_18px_40px_rgba(239,68,68,0.08)]">
        {initError}
      </div>
    );
  }

  return (
    <div>
      <div className="grid antso-box-gap xl:grid-cols-[1.08fr_0.92fr]">
        <div className="antso-box-stack">
          <div className="antso-elevated-card rounded-[32px] p-6 sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-brand-ocean/60">Ödeme</p>
                <h2 className="mt-3 font-heading text-4xl font-extrabold tracking-[-0.04em] text-slate-900">
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

          {submitError && (
            <div className="rounded-[24px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-[0_18px_40px_rgba(239,68,68,0.08)]">
              {submitError}
            </div>
          )}

          {submitting && (
            <div className="rounded-[24px] border border-brand-sky/20 bg-brand-mist px-5 py-4 text-sm text-brand-ink">
              3D Secure doğrulama ekranına yönlendiriliyorsunuz.
            </div>
          )}

          {/*
            Bu form doğrudan Akgünler'e POST eder.
            Statik hidden alanlar sunucudan gelir (sepet_id, dil, _redirection_url).
            Kart alanları (cc_nr, cc_cvc2 vb.) yalnızca burada — tarayıcıdan Akgünler'e gider,
            bizim sunucumuza asla ulaşmaz.
          */}
          <form
            ref={formRef}
            method="POST"
            action={initData?.formAction ?? ""}
            onSubmit={handleSubmit}
            className="antso-box-stack"
          >
            {/* Sunucudan gelen statik hidden alanlar */}
            {initData &&
              Object.entries(initData.staticParams).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={name === "email" ? email : value} />
              ))}

            {/* Kart alanları — tarayıcıda kalır, sunucuya gitmez */}
            <div className="overflow-hidden rounded-[32px] bg-white shadow-[0_18px_46px_rgba(18,38,60,0.06)] ring-1 ring-white">
              <div className="bg-[linear-gradient(135deg,#1b7a85_0%,#5ebcd5_100%)] px-6 py-6 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-white/72">
                      Kart önizleme
                    </p>
                    <p className="mt-3 font-heading text-2xl font-extrabold tracking-[0.08em]">{cardPreviewNumber}</p>
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
                    name="cc_nr"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                    autoComplete="cc-number"
                    className="w-full rounded-2xl border border-slate-200/70 bg-white px-4 py-3 font-mono text-sm tracking-[0.25em] text-slate-900 outline-none transition focus:border-brand-sky focus:bg-white"
                  />
                </Field>

                <Field label="Kart üzerindeki isim">
                  <input
                    type="text"
                    required
                    name="cc_holder"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                    placeholder="AD SOYAD"
                    autoComplete="cc-name"
                    className="w-full rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-sm font-medium uppercase tracking-[0.12em] text-slate-900 outline-none transition focus:border-brand-sky focus:bg-white"
                  />
                </Field>

                <Field label="E-posta" hint="Ödeme onayı ve bilet bilgileri bu adrese gönderilir.">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@eposta.com"
                    autoComplete="email"
                    className="w-full rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-sky focus:bg-white"
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Ay">
                    <select
                      required
                      name="cc_exp_month"
                      value={expMonth}
                      onChange={(e) => setExpMonth(e.target.value)}
                      className="w-full appearance-none rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-brand-sky focus:bg-white"
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
                      name="cc_exp_year"
                      value={expYear}
                      onChange={(e) => setExpYear(e.target.value)}
                      className="w-full appearance-none rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-brand-sky focus:bg-white"
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
                      name="cc_cvc2"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="•••"
                      maxLength={4}
                      autoComplete="cc-csc"
                      className="w-full rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-center font-mono text-sm tracking-[0.2em] text-slate-900 outline-none transition focus:border-brand-sky focus:bg-white"
                    />
                  </Field>
                </div>
              </div>
            </div>

            <div className="antso-elevated-card rounded-[32px] p-6">
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
                disabled={submitting || !agreed || !initData}
                className="antso-gradient-cta inline-flex flex-1 items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {submitting ? "Yönlendiriliyor..." : `Güvenli öde · ${formatPrice(toplamFiyat)} TL`}
              </button>
            </div>
          </form>
        </div>

        <div className="antso-box-stack">
          <div className="overflow-hidden rounded-[32px] bg-white shadow-[0_18px_46px_rgba(18,38,60,0.08)] ring-1 ring-white">
            <div className="bg-[linear-gradient(135deg,#1b7a85_0%,#5ebcd5_100%)] px-6 py-5 text-white">
              <p className="text-xs uppercase tracking-[0.24em] text-white/72">Sipariş özeti</p>
              <p className="mt-3 font-heading text-2xl font-extrabold tracking-[-0.03em]">Yolculuk özeti</p>
            </div>
            <div className="p-6 antso-box-stack">
              <SummaryRow label="Rota" value={`${cikisSehirAd} → ${varisSehirAd}`} />
              <SummaryRow
                label="Sefer"
                value={sefer ? `${sefer.sefer_tarih} · ${sefer.gemi}` : "Sefer bilgisi bekleniyor"}
              />
              {sefer?.trip_number && <SummaryRow label="Sefer no" value={sefer.trip_number} />}
            </div>
          </div>

          <div className="antso-elevated-card rounded-[32px] p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-brand-ocean/60">Yolcu kırılımı</p>
            <div className="mt-5 antso-box-stack">
              {yolcular.map((yolcu, index) => (
                <div
                  key={yolcu.yolcu_id}
                  className="flex items-center justify-between rounded-2xl bg-[#f2f8fa] px-4 py-3"
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

          <div className="antso-elevated-card rounded-[32px] p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-brand-ocean/60">Güvenli ödeme</p>
            <div className="mt-4 antso-box-stack text-sm text-slate-600">
              <ChecklistItem text="Kart bilgileriniz sunucumuzdan geçmez, doğrudan Akgünler'e iletilir." />
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
    <div className="rounded-[24px] bg-[#f2f8fa] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.2em] text-brand-ocean/55">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
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
