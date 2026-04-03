"use client";

import { useEffect, useState } from "react";

interface YolcuData {
  yolcu_id: number;
  yolcu_tur_id: number;
  yolcu_tipi: string;
  yolcu_tur_ad: string;
  toplam_fiyat_genel: number;
  vergi_turleri: Array<{ id: number; aciklama: string }>;
  insan_ulke_id?: number;
  insan_ad?: string;
  insan_soyad?: string;
  insan_pasaport_no?: string;
  insan_cinsiyet?: string;
  insan_dogum_tarihi?: string | null;
  yolcu_tel_no?: string;
  vergi_tur_id?: number | null;
}

interface SeferData {
  id: number;
  sefer_tarih: string;
  gemi: string;
  ucret: number;
  formatted_price: string;
  trip_number?: string;
  full_date?: string;
}

interface Ulke {
  id: number;
  title: string;
  ulke_kodu: string;
}

interface PassengerFormProps {
  yolcular: YolcuData[];
  onSubmit: (yolcuBilgileri: Array<Record<string, unknown>>) => void;
  onBack: () => void;
  sefer: SeferData | undefined;
  cikisSehirAd: string;
  varisSehirAd: string;
}

function buildInitialFormData(yolcular: YolcuData[]) {
  const initialData: Record<number, Record<string, unknown>> = {};

  yolcular.forEach((yolcu, index) => {
    initialData[index] = {
      id: yolcu.yolcu_id,
      insan_ad: yolcu.insan_ad ?? "",
      insan_soyad: yolcu.insan_soyad ?? "",
      insan_cinsiyet: yolcu.insan_cinsiyet ?? "",
      insan_pasaport_no: yolcu.insan_pasaport_no ?? "",
      insan_dogum_tarihi: yolcu.insan_dogum_tarihi ?? "",
      insan_ulke_id: yolcu.insan_ulke_id ?? 0,
      yolcu_tel_no: yolcu.yolcu_tel_no ?? "",
      vergi_tur_id: yolcu.vergi_tur_id ?? null,
    };
  });

  return initialData;
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

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-brand-sky focus:bg-white"
    />
  );
}

function Select({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-brand-sky focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
    >
      {children}
    </select>
  );
}

function PassengerCard({
  yolcu,
  index,
  ulkeler,
  values,
  onChange,
  isFirst,
}: {
  yolcu: YolcuData;
  index: number;
  ulkeler: Ulke[];
  values: Record<string, unknown>;
  onChange: (i: number, field: string, value: string | number | null) => void;
  isFirst: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-ink text-sm font-semibold text-white">
              {index + 1}
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900">{index + 1}. yolcu bilgileri</p>
              <p className="mt-1 text-sm text-slate-500">{yolcu.yolcu_tur_ad}</p>
            </div>
          </div>
          <div className="rounded-full bg-brand-mist px-4 py-2 text-sm font-semibold text-brand-ocean">
            {formatPrice(yolcu.toplam_fiyat_genel)} TL
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-6 md:grid-cols-2">
        <Field label="Ad">
          <Input
            type="text"
            required
            placeholder="AHMET"
            value={String(values.insan_ad ?? "")}
            onChange={(e) => onChange(index, "insan_ad", e.target.value.toUpperCase())}
          />
        </Field>

        <Field label="Soyad">
          <Input
            type="text"
            required
            placeholder="YILMAZ"
            value={String(values.insan_soyad ?? "")}
            onChange={(e) => onChange(index, "insan_soyad", e.target.value.toUpperCase())}
          />
        </Field>

        <Field label="Cinsiyet">
          <Select
            required
            value={String(values.insan_cinsiyet ?? "")}
            onChange={(e) => onChange(index, "insan_cinsiyet", e.target.value)}
          >
            <option value="">Seçin</option>
            <option value="E">Erkek</option>
            <option value="K">Kadın</option>
          </Select>
        </Field>

        <Field label="Doğum tarihi">
          <Input
            type="date"
            required
            value={String(values.insan_dogum_tarihi ?? "")}
            onChange={(e) => onChange(index, "insan_dogum_tarihi", e.target.value)}
          />
        </Field>

        <Field label="Pasaport / TC kimlik no" hint="Seyahat belgesinde yazdığı şekilde girin.">
          <Input
            type="text"
            required
            placeholder="Belge numarası"
            value={String(values.insan_pasaport_no ?? "")}
            onChange={(e) => onChange(index, "insan_pasaport_no", e.target.value)}
          />
        </Field>

        <Field label="Uyruk">
          <Select
            required
            value={String(values.insan_ulke_id ?? "")}
            onChange={(e) => onChange(index, "insan_ulke_id", Number(e.target.value))}
          >
            <option value="">Ülke seçin</option>
            {ulkeler.map((ulke) => (
              <option key={ulke.id} value={ulke.id}>
                {ulke.title}
              </option>
            ))}
          </Select>
        </Field>

        {isFirst && (
          <div className="md:col-span-2">
            <Field label="Telefon" hint="Bilet veya ödeme ile ilgili gerektiğinde bu numara kullanılır.">
              <Input
                type="tel"
                placeholder="+90 5xx xxx xx xx"
                value={String(values.yolcu_tel_no ?? "")}
                onChange={(e) => onChange(index, "yolcu_tel_no", e.target.value)}
              />
            </Field>
          </div>
        )}

        {yolcu.vergi_turleri.length > 0 && (
          <div className="md:col-span-2">
            <Field label="Vergi türü">
              <Select
                value={String(values.vergi_tur_id ?? "")}
                onChange={(e) =>
                  onChange(index, "vergi_tur_id", e.target.value ? Number(e.target.value) : null)
                }
              >
                <option value="">Seçin</option>
                {yolcu.vergi_turleri.map((vergi) => (
                  <option key={vergi.id} value={vergi.id}>
                    {vergi.aciklama}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}
      </div>
    </div>
  );
}

export function PassengerForm({
  yolcular,
  onSubmit,
  onBack,
  sefer,
  cikisSehirAd,
  varisSehirAd,
}: PassengerFormProps) {
  const [ulkeler, setUlkeler] = useState<Ulke[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [formData, setFormData] = useState<Record<number, Record<string, unknown>>>(() =>
    buildInitialFormData(yolcular)
  );

  useEffect(() => {
    setFormData(buildInitialFormData(yolcular));
  }, [yolcular]);

  useEffect(() => {
    fetch("/api/akgunler/countries")
      .then((response) => response.json())
      .then((data) => setUlkeler(data.ulkeler ?? []))
      .catch(() => undefined);
  }, []);

  function handleFieldChange(index: number, field: string, value: string | number | null) {
    setFormData((current) => ({
      ...current,
      [index]: {
        ...current[index],
        [field]: value,
      },
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(yolcular.map((_, index) => formData[index]));
  }

  const totalFiyat = yolcular.reduce((sum, yolcu) => sum + (yolcu.toplam_fiyat_genel ?? 0), 0);

  return (
    <form onSubmit={handleSubmit} className="grid antso-box-gap xl:grid-cols-[1.18fr_0.82fr]">
      <div className="antso-box-stack">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-brand-ocean/60">
                Yolcu bilgileri
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-900">
                Biletleme için gerekli bilgileri tamamlayın
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Pasaport veya kimlik üzerinde yer alan ad, soyad ve belge numarası bilgilerini eksiksiz
                girmeniz gerekir.
              </p>
            </div>

            <div className="rounded-[24px] bg-brand-mist px-5 py-4 text-brand-ink">
              <p className="text-[11px] uppercase tracking-[0.2em] text-brand-ocean/70">
                Toplam yolcu
              </p>
              <p className="mt-2 text-2xl font-semibold">{yolcular.length}</p>
            </div>
          </div>
        </div>

        {yolcular.map((yolcu, index) => (
          <PassengerCard
            key={yolcu.yolcu_id}
            yolcu={yolcu}
            index={index}
            ulkeler={ulkeler}
            values={formData[index] ?? {}}
            onChange={handleFieldChange}
            isFirst={index === 0}
          />
        ))}

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
              <p className="text-base font-semibold text-slate-900">Taşıma ve gizlilik koşulları</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Taşıma sözleşmesi ile gizlilik politikasını okuduğunuzu, seyahat belgelerinizin geçerli
                olduğunu ve girdiğiniz yolcu bilgilerinin doğru olduğunu onaylıyorsunuz.
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
            Seferlere geri dön
          </button>
          <button
            type="submit"
            disabled={!agreed}
            className="inline-flex flex-1 items-center justify-center rounded-full bg-brand-ink px-6 py-3 text-sm font-semibold text-white shadow-[0_24px_50px_rgba(16,37,61,0.22)] transition hover:bg-[#0c1f34] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Ödeme adımına geç
          </button>
        </div>
      </div>

      <div className="antso-box-stack">
        <div className="rounded-[32px] bg-brand-ink p-6 text-white shadow-[0_30px_90px_rgba(16,37,61,0.24)]">
          <p className="text-xs uppercase tracking-[0.24em] text-brand-seafoam">Rezervasyon özeti</p>
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
          <p className="text-xs uppercase tracking-[0.24em] text-brand-ocean/60">Fiyat özeti</p>
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
            <span className="text-2xl font-semibold text-brand-ink">{formatPrice(totalFiyat)} TL</span>
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <p className="text-xs uppercase tracking-[0.24em] text-brand-ocean/60">Hazırlık kontrolü</p>
          <div className="mt-4 antso-box-stack text-sm text-slate-600">
            <ChecklistItem text="Belge üzerindeki ad ve soyadı eksiksiz girin." />
            <ChecklistItem text="Uyruk ve doğum tarihi bilgisini kontrol edin." />
            <ChecklistItem text="İletişim numarasını ilk yolcu için ekleyin." />
          </div>
        </div>
      </div>
    </form>
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
