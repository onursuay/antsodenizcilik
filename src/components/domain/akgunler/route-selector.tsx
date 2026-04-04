"use client";

import { useEffect, useState } from "react";
import { PassengerVehiclePopover, type YolcuSayi } from "./passenger-vehicle-popover";

interface YolcuTur {
  id: number;
  title: string;
  yolcu_kodu: string;
  yolcu_tipi: string;
}

export interface GuzergahData {
  id: number;
  baslik: string;
  sehirler: Array<{ id: number; ad: string }>;
  yolcu_turleri: YolcuTur[];
  arac_turleri: YolcuTur[];
  kabin_turleri: YolcuTur[];
}

interface RouteSelectorProps {
  guzergahlar: GuzergahData[];
  onSearch: (params: {
    guzergah: GuzergahData;
    cikisSehirId: number;
    varisSehirId: number;
    tarih: string;
    donusTarih?: string;
    tripType: "tek-gidis" | "gidis-donus";
    yolcuTurleri: YolcuSayi[];
  }) => void;
}

function formatDateTR(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  const days = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  const months = [
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık",
  ];

  return `${Number(d)} ${months[date.getMonth()]} ${days[date.getDay()]}`;
}

function getDefaultGuzergahId(guzergahlar: GuzergahData[]): number {
  return guzergahlar[0]?.id ?? 0;
}

function getDefaultYolcuTurleri(guzergahlar: GuzergahData[]): YolcuSayi[] {
  const ilkGuzergah = guzergahlar[0];
  const defaultTur = ilkGuzergah?.yolcu_turleri[0];

  if (defaultTur) {
    return [{ id: defaultTur.id, sayi: 1 }];
  }

  return [{ id: 1, sayi: 1 }];
}

function SearchField({
  label,
  hint,
  icon,
  children,
  className,
}: {
  label: string;
  hint: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`h-full rounded-[24px] bg-[#f2f6f8] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.96),0_12px_28px_rgba(18,38,60,0.04)] ring-1 ring-[#e4eef2] transition hover:bg-white ${className ?? ""}`}>
      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-brand-ocean shadow-[0_8px_18px_rgba(18,38,60,0.04)] ring-1 ring-slate-200/70">
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            {label}
          </p>
          <p className="text-[12px] text-slate-500">{hint}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function ToggleButton({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[64px] w-full items-center gap-3 rounded-[22px] border px-4 py-3 text-left transition ${
        active
          ? "border-brand-sky/35 bg-[linear-gradient(180deg,rgba(94,188,213,0.12),rgba(255,255,255,0.96))] text-brand-ink shadow-[0_12px_28px_rgba(94,188,213,0.1)]"
          : "border-[#e4eef2] bg-[#f7fbfc] text-slate-600 shadow-[0_10px_24px_rgba(18,38,60,0.02)] hover:border-brand-sky/25"
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
          active ? "border-brand-sky bg-brand-sky/10" : "border-slate-300"
        }`}
      >
        <span
          className={`h-2.5 w-2.5 rounded-full transition ${
            active ? "bg-brand-sky" : "bg-transparent"
          }`}
        />
      </span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-[12px] text-slate-500">{description}</span>
      </span>
    </button>
  );
}

function SummaryStat({
  label,
  value,
  subdued,
}: {
  label: string;
  value: string;
  subdued?: boolean;
}) {
  return (
    <div
      className={`rounded-[24px] border px-4 py-3 ${
        subdued
          ? "border-slate-200/80 bg-white/72"
          : "border-brand-sky/18 bg-white shadow-[0_12px_28px_rgba(18,38,60,0.05)]"
      }`}
    >
      <p className="text-[11px] uppercase tracking-[0.24em] text-brand-ocean/55">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export function RouteSelector({ guzergahlar, onSearch }: RouteSelectorProps) {
  const [tripType, setTripType] = useState<"tek-gidis" | "gidis-donus">("tek-gidis");
  const [guzergahId, setGuzergahId] = useState<number>(() => getDefaultGuzergahId(guzergahlar));
  const [cikisSehirId, setCikisSehirId] = useState(0);
  const [varisSehirId, setVarisSehirId] = useState(0);
  const [tarih, setTarih] = useState("");
  const [donusTarih, setDonusTarih] = useState("");
  const [yolcuTurleri, setYolcuTurleri] = useState<YolcuSayi[]>(() =>
    getDefaultYolcuTurleri(guzergahlar)
  );

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (guzergahlar.length > 0 && guzergahId === 0) {
      const ilkGuzergah = guzergahlar[0];
      setGuzergahId(ilkGuzergah.id);
      setYolcuTurleri(getDefaultYolcuTurleri(guzergahlar));
    }
  }, [guzergahlar, guzergahId]);

  useEffect(() => {
    if (!guzergahId) return;

    const seciliGuzergah = guzergahlar.find((item) => item.id === guzergahId);
    if (!seciliGuzergah) return;

    setYolcuTurleri(
      seciliGuzergah.yolcu_turleri[0]
        ? [{ id: seciliGuzergah.yolcu_turleri[0].id, sayi: 1 }]
        : getDefaultYolcuTurleri(guzergahlar)
    );
    setCikisSehirId(0);
    setVarisSehirId(0);
  }, [guzergahId, guzergahlar]);

  const selectedGuzergah = guzergahlar.find((g) => g.id === guzergahId) ?? null;
  const sehirler = selectedGuzergah?.sehirler ?? [];
  const cikisSehir = sehirler.find((s) => s.id === cikisSehirId)?.ad;
  const varisSehir = sehirler.find((s) => s.id === varisSehirId)?.ad;
  const totalPassengers = yolcuTurleri.reduce((total, item) => total + item.sayi, 0);
  const isValid =
    Boolean(selectedGuzergah) &&
    Boolean(cikisSehirId) &&
    Boolean(varisSehirId) &&
    Boolean(tarih) &&
    (tripType === "tek-gidis" || Boolean(donusTarih));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGuzergah || !cikisSehirId || !varisSehirId || !tarih) return;

    const formatForApi = (value: string) => {
      const [year, month, day] = value.split("-");
      return `${day}/${month}/${year}`;
    };

    const filteredPassengers = yolcuTurleri.filter((item) => item.sayi > 0);

    onSearch({
      guzergah: selectedGuzergah,
      cikisSehirId,
      varisSehirId,
      tarih: formatForApi(tarih),
      donusTarih:
        tripType === "gidis-donus" && donusTarih ? formatForApi(donusTarih) : undefined,
      tripType,
      yolcuTurleri: filteredPassengers,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col gap-[5px]">
      <div className="grid gap-[5px] sm:grid-cols-2 lg:grid-cols-[0.78fr_0.78fr_1.12fr]">
        <ToggleButton
          active={tripType === "tek-gidis"}
          title="Tek yön"
          description="Hızlı satın alma"
          onClick={() => {
            setTripType("tek-gidis");
            setDonusTarih("");
          }}
        />
        <ToggleButton
          active={tripType === "gidis-donus"}
          title="Gidiş - dönüş"
          description="Dönüşü şimdi sabitle"
          onClick={() => setTripType("gidis-donus")}
        />
        <SearchField
          label="Yolcu ve araç"
          hint="Yolcu, araç ve kabin seçin"
          icon={<PassengerIcon className="h-4 w-4" />}
        >
          <PassengerVehiclePopover
            guzergah={selectedGuzergah}
            value={yolcuTurleri}
            onChange={setYolcuTurleri}
          />
        </SearchField>
      </div>

      {guzergahlar.length > 1 && (
        <SearchField
          label="Hat"
          hint="Seyahat edeceğiniz hattı seçin"
          icon={<RouteIcon className="h-4 w-4" />}
        >
          <select
            value={guzergahId}
            onChange={(e) => setGuzergahId(Number(e.target.value))}
            className="w-full appearance-none rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-brand-sky focus:bg-white"
            required
          >
            <option value={0}>Güzergah seçin</option>
            {guzergahlar.map((g) => (
              <option key={g.id} value={g.id}>
                {g.baslik}
              </option>
            ))}
          </select>
        </SearchField>
      )}

      <div className="grid gap-[5px] lg:grid-cols-[1.1fr_1.1fr_0.9fr_210px]">
        <SearchField
          label="Kalkış limanı"
          hint="Kalkış limanını seçin"
          icon={<PinIcon className="h-4 w-4" />}
        >
          <select
            value={cikisSehirId}
            onChange={(e) => setCikisSehirId(Number(e.target.value))}
            disabled={sehirler.length === 0}
            className="w-full appearance-none rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-brand-sky focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            required
          >
            <option value={0}>Kalkış limanı</option>
            {sehirler.map((s) => (
              <option key={s.id} value={s.id}>
                {s.ad}
              </option>
            ))}
          </select>
        </SearchField>

        <SearchField
          label="Varış limanı"
          hint="Varış limanını seçin"
          icon={<FlagIcon className="h-4 w-4" />}
        >
          <select
            value={varisSehirId}
            onChange={(e) => setVarisSehirId(Number(e.target.value))}
            disabled={sehirler.length === 0}
            className="w-full appearance-none rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-brand-sky focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            required
          >
            <option value={0}>Varış limanı</option>
            {sehirler
              .filter((s) => s.id !== cikisSehirId)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.ad}
                </option>
              ))}
          </select>
        </SearchField>

        <SearchField
          label="Yolculuk tarihi"
          hint="Müsait seferleri görün"
          icon={<CalendarIcon className="h-4 w-4" />}
        >
          <div className="relative">
            <input
              type="date"
              value={tarih}
              onChange={(e) => {
                setTarih(e.target.value);
                if (donusTarih && e.target.value > donusTarih) {
                  setDonusTarih("");
                }
              }}
              min={today}
              className="w-full rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-brand-sky focus:bg-white"
              required
            />
            {tarih && (
              <span className="pointer-events-none absolute inset-x-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-900">
                {formatDateTR(tarih)}
              </span>
            )}
          </div>
        </SearchField>

        <button
          type="submit"
          disabled={!isValid}
          className="antso-gradient-cta flex min-h-[82px] w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-base font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <SearchIcon className="h-5 w-5" />
          Sefer Ara
        </button>
      </div>

      <div
        className={`grid gap-[5px] ${
          tripType === "gidis-donus" ? "lg:grid-cols-[0.95fr_1.05fr]" : "lg:grid-cols-[0.95fr_1.05fr]"
        }`}
      >
        {tripType === "gidis-donus" ? (
          <SearchField
            label="Dönüş tarihi"
            hint="Dönüşü şimdi garantiye alın"
            icon={<CalendarIcon className="h-4 w-4" />}
          >
            <div className="relative">
              <input
                type="date"
                value={donusTarih}
                onChange={(e) => setDonusTarih(e.target.value)}
                min={tarih || today}
                className="w-full rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-brand-sky focus:bg-white"
                required
              />
              {donusTarih && (
                <span className="pointer-events-none absolute inset-x-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-900">
                  {formatDateTR(donusTarih)}
                </span>
              )}
            </div>
          </SearchField>
        ) : (
          <SearchField
            label="Rota özeti"
            hint="Tek yön seçimi aktif"
            icon={<RouteIcon className="h-4 w-4" />}
          >
            <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-sm font-medium text-slate-900">
              {cikisSehir && varisSehir ? `${cikisSehir} → ${varisSehir}` : "Anamur ve Girne limanlarını seçin"}
            </div>
          </SearchField>
        )}

        <div className="rounded-[24px] bg-[#f2f6f8] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.96),0_12px_28px_rgba(18,38,60,0.03)] ring-1 ring-[#e4eef2]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Seçili özet
          </p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-brand-ocean/55">Rota</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {cikisSehir && varisSehir ? `${cikisSehir} → ${varisSehir}` : "Liman seçimi bekleniyor"}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-brand-ocean/55">Yolcu</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {totalPassengers > 0 ? `${totalPassengers} yolcu` : "Yolcu bilgisi ekleyin"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.7}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z"
      />
    </svg>
  );
}

function PassengerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.7}
        d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.7}
        d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
      />
    </svg>
  );
}

function FlagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.7}
        d="M6 21V4m0 0c2.2-1.4 4.4-1.4 6.6 0s4.4 1.4 6.6 0v10.5c-2.2 1.4-4.4 1.4-6.6 0S8.2 13.1 6 14.5V4Z"
      />
    </svg>
  );
}

function RouteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.7}
        d="M14 5h5v5m0-5-7 7m-2 7H5v-5m0 5 7-7"
      />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z"
      />
    </svg>
  );
}
