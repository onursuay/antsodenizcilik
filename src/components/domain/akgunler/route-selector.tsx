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
    <div className={`h-full rounded-[26px] border border-[#d4e2e8] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,251,253,0.98))] p-3 shadow-[0_18px_40px_rgba(18,38,60,0.06),inset_0_1px_0_rgba(255,255,255,0.92)] transition hover:border-brand-sky/40 ${className ?? ""}`}>
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-brand-sky/10 bg-brand-mist/80 text-brand-ocean">
          {icon}
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            {label}
          </p>
          <p className="text-xs text-slate-500">{hint}</p>
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
      className={`flex min-h-[74px] w-full items-center gap-3 rounded-[24px] border px-4 py-3 text-left transition ${
        active
          ? "border-brand-sky/60 bg-[linear-gradient(180deg,rgba(94,188,213,0.14),rgba(255,255,255,0.92))] text-brand-ink shadow-[0_16px_36px_rgba(94,188,213,0.14)]"
          : "border-[#d8e4e9] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,251,253,0.98))] text-slate-600 shadow-[0_14px_30px_rgba(18,38,60,0.04)] hover:border-brand-sky/30"
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
        <span className="block text-xs text-slate-500">{description}</span>
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
          ? "border-white/10 bg-white/[0.025]"
          : "border-brand-sky/18 bg-white/[0.055] shadow-[0_20px_40px_rgba(0,0,0,0.16)]"
      }`}
    >
      <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
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

  function handleSwap() {
    const currentDeparture = cikisSehirId;
    setCikisSehirId(varisSehirId);
    setVarisSehirId(currentDeparture);
  }

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
    <form onSubmit={handleSubmit} className="flex h-full flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2">
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
            className="w-full appearance-none rounded-2xl border border-[#dbe6eb] bg-[#f5f9fb] px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-brand-sky focus:bg-white"
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

      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <SearchField
          label="Nereden"
          hint="Kalkış limanını seçin"
          icon={<PinIcon className="h-4 w-4" />}
        >
          <select
            value={cikisSehirId}
            onChange={(e) => setCikisSehirId(Number(e.target.value))}
            disabled={sehirler.length === 0}
            className="w-full appearance-none rounded-2xl border border-[#dbe6eb] bg-[#f5f9fb] px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-brand-sky focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
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

        <div className="flex items-end justify-center">
          <button
            type="button"
            onClick={handleSwap}
            disabled={!cikisSehirId || !varisSehirId}
            className="flex h-14 w-14 items-center justify-center rounded-[24px] border border-[#d4e2e8] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,251,253,0.98))] text-slate-400 shadow-[0_18px_40px_rgba(18,38,60,0.06)] transition hover:border-brand-sky hover:text-brand-sky disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Limanları değiştir"
          >
            <SwapIcon className="h-5 w-5" />
          </button>
        </div>

        <SearchField
          label="Nereye"
          hint="Varış limanını seçin"
          icon={<FlagIcon className="h-4 w-4" />}
        >
          <select
            value={varisSehirId}
            onChange={(e) => setVarisSehirId(Number(e.target.value))}
            disabled={sehirler.length === 0}
            className="w-full appearance-none rounded-2xl border border-[#dbe6eb] bg-[#f5f9fb] px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-brand-sky focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
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
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SearchField
          label="Gidiş"
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
              className="w-full rounded-2xl border border-[#dbe6eb] bg-[#f5f9fb] px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-brand-sky focus:bg-white"
              required
            />
            {tarih && (
              <span className="pointer-events-none absolute inset-x-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-900">
                {formatDateTR(tarih)}
              </span>
            )}
          </div>
        </SearchField>

        {tripType === "gidis-donus" && (
          <SearchField
            label="Dönüş"
            hint="Dönüşü şimdi garantiye alın"
            icon={<CalendarIcon className="h-4 w-4" />}
          >
            <div className="relative">
              <input
                type="date"
                value={donusTarih}
                onChange={(e) => setDonusTarih(e.target.value)}
                min={tarih || today}
                className="w-full rounded-2xl border border-[#dbe6eb] bg-[#f5f9fb] px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-brand-sky focus:bg-white"
                required
              />
              {donusTarih && (
                <span className="pointer-events-none absolute inset-x-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-900">
                  {formatDateTR(donusTarih)}
                </span>
              )}
            </div>
          </SearchField>
        )}

        <SearchField
          label="Yolcu ve araç"
          hint="Yolcu, araç ve kabin seçin"
          icon={<PassengerIcon className="h-4 w-4" />}
          className={tripType === "gidis-donus" ? "md:col-span-2" : undefined}
        >
          <PassengerVehiclePopover
            guzergah={selectedGuzergah}
            value={yolcuTurleri}
            onChange={setYolcuTurleri}
          />
        </SearchField>
      </div>

      <div className="flex">
        <button
          type="submit"
          disabled={!isValid}
          className="flex min-h-[92px] w-full flex-col justify-center rounded-[28px] bg-[linear-gradient(180deg,#15314b_0%,#10253d_100%)] px-6 py-4 text-left text-white shadow-[0_24px_60px_rgba(18,38,60,0.24)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 md:flex-row md:items-center md:justify-between md:text-left"
        >
          <div>
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.26em] text-brand-seafoam">
              Güncel seferler
            </span>
            <span className="mt-2 block text-lg font-semibold">Seferleri Gör</span>
            <span className="mt-1 block text-sm text-white/[0.65]">
              Anlık müsaitlik ve fiyat bilgisi
            </span>
          </div>
          <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold md:mt-0">
            Devam et
            <ArrowIcon className="h-5 w-5" />
          </span>
        </button>
      </div>

      <div className="mt-auto rounded-[32px] border border-white/[0.08] bg-[linear-gradient(180deg,#16314a_0%,#11263d_100%)] p-4 text-white shadow-[0_24px_60px_rgba(18,38,60,0.24)]">
        <div className="grid gap-3 lg:grid-cols-3">
          <SummaryStat
            label="Seçili rota"
            value={
              cikisSehir && varisSehir
                ? `${cikisSehir} → ${varisSehir}`
                : "Anamur ve Girne limanlarını seçin"
            }
          />
          <SummaryStat
            label="Seyahat tarihi"
            value={
              tarih
                ? tripType === "gidis-donus" && donusTarih
                  ? `${formatDateTR(tarih)} / ${formatDateTR(donusTarih)}`
                  : formatDateTR(tarih)
                : "Tarihinizi seçin"
            }
            subdued
          />
          <SummaryStat
            label="Yolcu özeti"
            value={totalPassengers > 0 ? `${totalPassengers} yolcu ile seyahat` : "Yolcu bilgisi ekleyin"}
            subdued
          />
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

function SwapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.7}
        d="M7 7h12m0 0-4-4m4 4-4 4M17 17H5m0 0 4-4m-4 4 4 4"
      />
    </svg>
  );
}
