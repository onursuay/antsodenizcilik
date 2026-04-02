"use client";

import { useState, useEffect } from "react";
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
  const days = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
  const months = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
  return `${d} ${months[date.getMonth()]}, ${days[date.getDay()]}`;
}

function getDefaultGuzergahId(guzergahlar: GuzergahData[]): number {
  return guzergahlar.length >= 1 ? guzergahlar[0].id : 0;
}

function getDefaultYolcuTurleri(guzergahlar: GuzergahData[]): YolcuSayi[] {
  const g = guzergahlar.length >= 1 ? guzergahlar[0] : null;
  if (g && g.yolcu_turleri.length > 0) {
    return [{ id: g.yolcu_turleri[0].id, sayi: 1 }];
  }
  return [{ id: 1, sayi: 1 }];
}

export function RouteSelector({ guzergahlar, onSearch }: RouteSelectorProps) {
  const [tripType, setTripType] = useState<"tek-gidis" | "gidis-donus">("tek-gidis");
  const [guzergahId, setGuzergahId] = useState<number>(() => getDefaultGuzergahId(guzergahlar));
  const [cikisSehirId, setCikisSehirId] = useState(0);
  const [varisSehirId, setVarisSehirId] = useState(0);
  const [tarih, setTarih] = useState("");
  const [donusTarih, setDonusTarih] = useState("");
  const [yolcuTurleri, setYolcuTurleri] = useState<YolcuSayi[]>(() => getDefaultYolcuTurleri(guzergahlar));

  const today = new Date().toISOString().split("T")[0];

  // Safety net: if guzergahlar arrives after mount (shouldn't happen but just in case)
  useEffect(() => {
    if (guzergahlar.length >= 1 && guzergahId === 0) {
      const g = guzergahlar[0];
      setGuzergahId(g.id);
      if (g.yolcu_turleri.length > 0) {
        setYolcuTurleri([{ id: g.yolcu_turleri[0].id, sayi: 1 }]);
      }
    }
  }, [guzergahlar]); // eslint-disable-line react-hooks/exhaustive-deps

  // When guzergahId changes (multi-guzergah), reset passengers
  useEffect(() => {
    if (guzergahId === 0) return;
    const g = guzergahlar.find((x) => x.id === guzergahId);
    if (!g || g.yolcu_turleri.length === 0) return;
    setYolcuTurleri([{ id: g.yolcu_turleri[0].id, sayi: 1 }]);
    setCikisSehirId(0);
    setVarisSehirId(0);
  }, [guzergahId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedGuzergah = guzergahlar.find((g) => g.id === guzergahId) ?? null;
  const sehirler = selectedGuzergah?.sehirler ?? [];
  const isValid =
    !!selectedGuzergah &&
    !!cikisSehirId &&
    !!varisSehirId &&
    !!tarih &&
    (tripType === "tek-gidis" || !!donusTarih);

  function handleSwap() {
    const prev = cikisSehirId;
    setCikisSehirId(varisSehirId);
    setVarisSehirId(prev);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGuzergah || !cikisSehirId || !varisSehirId || !tarih) return;

    const fmtDate = (s: string) => {
      const [y, m, d] = s.split("-");
      return `${d}/${m}/${y}`;
    };

    const filtered = yolcuTurleri.filter((y) => y.sayi > 0);

    onSearch({
      guzergah: selectedGuzergah,
      cikisSehirId,
      varisSehirId,
      tarih: fmtDate(tarih),
      donusTarih: tripType === "gidis-donus" && donusTarih ? fmtDate(donusTarih) : undefined,
      tripType,
      yolcuTurleri: filtered,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Trip type toggle — explicit button onClick, no hidden radio tricks */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => { setTripType("tek-gidis"); setDonusTarih(""); }}
          className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer"
        >
          <span
            className={`flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors ${
              tripType === "tek-gidis" ? "border-blue-600" : "border-slate-300"
            }`}
          >
            {tripType === "tek-gidis" && (
              <span className="block h-2 w-2 rounded-full bg-blue-600" />
            )}
          </span>
          Tek Yön
        </button>
        <button
          type="button"
          onClick={() => setTripType("gidis-donus")}
          className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer"
        >
          <span
            className={`flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors ${
              tripType === "gidis-donus" ? "border-blue-600" : "border-slate-300"
            }`}
          >
            {tripType === "gidis-donus" && (
              <span className="block h-2 w-2 rounded-full bg-blue-600" />
            )}
          </span>
          Gidiş – Dönüş
        </button>
      </div>

      {/* Güzergah (multi only) */}
      {guzergahlar.length > 1 && (
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Hat
          </label>
          <select
            value={guzergahId}
            onChange={(e) => setGuzergahId(parseInt(e.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            required
          >
            <option value={0}>Güzergah seçin…</option>
            {guzergahlar.map((g) => (
              <option key={g.id} value={g.id}>{g.baslik}</option>
            ))}
          </select>
        </div>
      )}

      {/* Main search row */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
        {/* Nereden */}
        <div className="flex-1">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Nereden
          </label>
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <select
              value={cikisSehirId}
              onChange={(e) => setCikisSehirId(parseInt(e.target.value))}
              disabled={sehirler.length === 0}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-400"
              required
            >
              <option value={0}>Kalkış limanı…</option>
              {sehirler.map((s) => (
                <option key={s.id} value={s.id}>{s.ad}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Swap */}
        <div className="flex items-end justify-center pb-0.5">
          <button
            type="button"
            onClick={handleSwap}
            disabled={!cikisSehirId || !varisSehirId}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:border-slate-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* Nereye */}
        <div className="flex-1">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Nereye
          </label>
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <select
              value={varisSehirId}
              onChange={(e) => setVarisSehirId(parseInt(e.target.value))}
              disabled={sehirler.length === 0}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-400"
              required
            >
              <option value={0}>Varış limanı…</option>
              {sehirler.filter((s) => s.id !== cikisSehirId).map((s) => (
                <option key={s.id} value={s.id}>{s.ad}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Gidiş tarihi */}
        <div className="flex-1">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Gidiş
          </label>
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <input
              type="date"
              value={tarih}
              onChange={(e) => {
                setTarih(e.target.value);
                if (donusTarih && e.target.value > donusTarih) setDonusTarih("");
              }}
              min={today}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              required
            />
            {tarih && (
              <span className="pointer-events-none absolute inset-0 flex items-center pl-9 text-sm font-medium text-slate-900">
                {formatDateTR(tarih)}
              </span>
            )}
          </div>
        </div>

        {/* Dönüş tarihi */}
        {tripType === "gidis-donus" && (
          <div className="flex-1">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Dönüş
            </label>
            <div className="relative">
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <input
                type="date"
                value={donusTarih}
                onChange={(e) => setDonusTarih(e.target.value)}
                min={tarih || today}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-8 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                required
              />
              {donusTarih && (
                <span className="pointer-events-none absolute inset-0 flex items-center pl-9 pr-8 text-sm font-medium text-slate-900">
                  {formatDateTR(donusTarih)}
                </span>
              )}
              {donusTarih && (
                <button
                  type="button"
                  onClick={() => setDonusTarih("")}
                  className="absolute right-2.5 top-1/2 z-10 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Yolcu & Araç */}
        <div className="flex-[1.4]">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Yolcu ve Araç
          </label>
          <PassengerVehiclePopover
            guzergah={selectedGuzergah}
            value={yolcuTurleri}
            onChange={setYolcuTurleri}
          />
        </div>

        {/* Search button */}
        <div className="flex items-end">
          <button
            type="submit"
            disabled={!isValid}
            className="flex h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40 lg:w-auto"
          >
            Ara
          </button>
        </div>
      </div>
    </form>
  );
}
