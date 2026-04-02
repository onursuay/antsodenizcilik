"use client";

import { useState, useEffect } from "react";

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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
      {children}
    </label>
  );
}

function Input({
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-300 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
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
      className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-400"
    >
      {children}
    </select>
  );
}

function PassengerCard({
  yolcu,
  index,
  ulkeler,
  onChange,
  isFirst,
}: {
  yolcu: YolcuData;
  index: number;
  ulkeler: Ulke[];
  onChange: (i: number, field: string, value: string | number) => void;
  isFirst: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
          {index + 1}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {index + 1}. Yolcu
          </p>
          <p className="text-xs text-slate-400">{yolcu.yolcu_tur_ad}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
        <div>
          <FieldLabel>Ad</FieldLabel>
          <Input
            type="text"
            required
            placeholder="Ahmet"
            defaultValue={yolcu.insan_ad ?? ""}
            onChange={(e) => onChange(index, "insan_ad", e.target.value.toUpperCase())}
          />
        </div>
        <div>
          <FieldLabel>Soyad</FieldLabel>
          <Input
            type="text"
            required
            placeholder="YILMAZ"
            defaultValue={yolcu.insan_soyad ?? ""}
            onChange={(e) => onChange(index, "insan_soyad", e.target.value.toUpperCase())}
          />
        </div>
        <div>
          <FieldLabel>Cinsiyet</FieldLabel>
          <Select
            required
            defaultValue={yolcu.insan_cinsiyet ?? ""}
            onChange={(e) => onChange(index, "insan_cinsiyet", e.target.value)}
          >
            <option value="">Seçin…</option>
            <option value="E">Erkek</option>
            <option value="K">Kadın</option>
          </Select>
        </div>
        <div>
          <FieldLabel>Doğum Tarihi</FieldLabel>
          <Input
            type="date"
            required
            defaultValue={yolcu.insan_dogum_tarihi ?? ""}
            onChange={(e) => onChange(index, "insan_dogum_tarihi", e.target.value)}
          />
        </div>
        <div>
          <FieldLabel>Pasaport / TC Kimlik No</FieldLabel>
          <Input
            type="text"
            required
            placeholder="Pasaport veya TC no"
            defaultValue={yolcu.insan_pasaport_no ?? ""}
            onChange={(e) => onChange(index, "insan_pasaport_no", e.target.value)}
          />
        </div>
        <div>
          <FieldLabel>Uyruk</FieldLabel>
          <Select
            required
            defaultValue={yolcu.insan_ulke_id ?? ""}
            onChange={(e) => onChange(index, "insan_ulke_id", parseInt(e.target.value))}
          >
            <option value="">Ülke seçin…</option>
            {ulkeler.map((u) => (
              <option key={u.id} value={u.id}>
                {u.title}
              </option>
            ))}
          </Select>
        </div>
        {isFirst && (
          <div className="sm:col-span-2">
            <FieldLabel>Telefon (opsiyonel)</FieldLabel>
            <Input
              type="tel"
              placeholder="+90 5xx xxx xx xx"
              defaultValue={yolcu.yolcu_tel_no ?? ""}
              onChange={(e) => onChange(index, "yolcu_tel_no", e.target.value)}
            />
          </div>
        )}
        {yolcu.vergi_turleri && yolcu.vergi_turleri.length > 0 && (
          <div className="sm:col-span-2">
            <FieldLabel>Vergi Türü</FieldLabel>
            <Select
              defaultValue={yolcu.vergi_tur_id ?? ""}
              onChange={(e) => onChange(index, "vergi_tur_id", parseInt(e.target.value))}
            >
              <option value="">Seçin…</option>
              {yolcu.vergi_turleri.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.aciklama}
                </option>
              ))}
            </Select>
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
  const [formData, setFormData] = useState<Record<number, Record<string, unknown>>>(
    () => {
      const init: Record<number, Record<string, unknown>> = {};
      yolcular.forEach((y, i) => {
        init[i] = {
          id: y.yolcu_id,
          insan_ad: y.insan_ad ?? "",
          insan_soyad: y.insan_soyad ?? "",
          insan_cinsiyet: y.insan_cinsiyet ?? "",
          insan_pasaport_no: y.insan_pasaport_no ?? "",
          insan_dogum_tarihi: y.insan_dogum_tarihi ?? "",
          insan_ulke_id: y.insan_ulke_id ?? 0,
          yolcu_tel_no: y.yolcu_tel_no ?? "",
          vergi_tur_id: y.vergi_tur_id ?? null,
        };
      });
      return init;
    }
  );

  useEffect(() => {
    fetch("/api/akgunler/countries")
      .then((r) => r.json())
      .then((data) => setUlkeler(data.ulkeler ?? []))
      .catch(() => {});
  }, []);

  function handleFieldChange(index: number, field: string, value: string | number) {
    setFormData((prev) => ({
      ...prev,
      [index]: { ...prev[index], [field]: value },
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(Object.values(formData));
  }

  const totalFiyat = yolcular.reduce((sum, y) => sum + (y.toplam_fiyat_genel ?? 0), 0);

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main form */}
        <div className="space-y-5 lg:col-span-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Yolcu Bilgileri</h2>
            <p className="mt-1 text-sm text-slate-500">
              Pasaport veya kimlik bilgilerinizi giriniz.
            </p>
          </div>

          {yolcular.map((yolcu, i) => (
            <PassengerCard
              key={yolcu.yolcu_id}
              yolcu={yolcu}
              index={i}
              ulkeler={ulkeler}
              onChange={handleFieldChange}
              isFirst={i === 0}
            />
          ))}

          {/* Agreement */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <label className="flex cursor-pointer items-start gap-3">
              <div className="mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  required
                />
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                <span className="font-semibold text-slate-900">Taşıma Sözleşmesi</span> ve{" "}
                <span className="font-semibold text-slate-900">Gizlilik Politikası</span>'nı
                okudum ve kabul ediyorum. Seyahat belgelerimin geçerli olduğunu onaylıyorum.
              </p>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Geri
            </button>
            <button
              type="submit"
              disabled={!agreed}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Ödemeye Geç
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-32 space-y-4">
            <TripSummaryCard
              sefer={sefer}
              cikisSehirAd={cikisSehirAd}
              varisSehirAd={varisSehirAd}
            />
            {totalFiyat > 0 && (
              <PriceSummaryCard yolcular={yolcular} totalFiyat={totalFiyat} />
            )}
          </div>
        </div>
      </div>
    </form>
  );
}

function TripSummaryCard({
  sefer,
  cikisSehirAd,
  varisSehirAd,
}: {
  sefer: SeferData | undefined;
  cikisSehirAd: string;
  varisSehirAd: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        Sefer Özeti
      </p>
      <div className="flex items-center gap-3 text-base font-bold text-slate-900">
        <span>{cikisSehirAd}</span>
        <svg className="h-4 w-4 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span>{varisSehirAd}</span>
      </div>
      {sefer && (
        <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Tarih / Saat</span>
            <span className="font-medium text-slate-900">{sefer.sefer_tarih}</span>
          </div>
          {sefer.full_date && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Tam Tarih</span>
              <span className="font-medium text-slate-900 text-right max-w-[160px]">{sefer.full_date}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Gemi</span>
            <span className="font-medium text-slate-900">{sefer.gemi}</span>
          </div>
          {sefer.trip_number && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Sefer No</span>
              <span className="font-medium text-slate-900">{sefer.trip_number}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PriceSummaryCard({
  yolcular,
  totalFiyat,
}: {
  yolcular: YolcuData[];
  totalFiyat: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        Fiyat Özeti
      </p>
      <div className="space-y-2">
        {yolcular.map((y, i) => (
          <div key={y.yolcu_id} className="flex items-center justify-between text-sm">
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
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-sm font-semibold text-slate-900">Toplam</span>
        <span className="text-lg font-bold text-blue-600">{totalFiyat.toFixed(2)} TL</span>
      </div>
    </div>
  );
}
