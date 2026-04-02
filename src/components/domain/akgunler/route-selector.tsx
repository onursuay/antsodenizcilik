"use client";

import { useState } from "react";
import { PassengerCountPopover, type PassengerCounts } from "./passenger-count-popover";

interface GuzergahData {
  id: number;
  baslik: string;
  sehirler: Array<{ id: number; ad: string }>;
  yolcu_turleri: Array<{ id: number; title: string; yolcu_kodu: string }>;
}

interface RouteSelectorProps {
  guzergahlar: GuzergahData[];
  onSearch: (params: {
    guzergah: GuzergahData;
    cikisSehirId: number;
    varisSehirId: number;
    tarih: string;
    yolcuTurleri: Array<{ id: number; sayi: number }>;
  }) => void;
}

export function RouteSelector({ guzergahlar, onSearch }: RouteSelectorProps) {
  const [guzergahId, setGuzergahId] = useState(
    guzergahlar.length === 1 ? guzergahlar[0].id : 0
  );
  const [cikisSehirId, setCikisSehirId] = useState(0);
  const [varisSehirId, setVarisSehirId] = useState(0);
  const [tarih, setTarih] = useState("");
  const [passengers, setPassengers] = useState<PassengerCounts>({ yetiskin: 1, cocuk: 0 });

  const today = new Date().toISOString().split("T")[0];
  const selectedGuzergah = guzergahlar.find((g) => g.id === guzergahId);
  const sehirler = selectedGuzergah?.sehirler ?? [];
  const isValid = !!selectedGuzergah && !!cikisSehirId && !!varisSehirId && !!tarih;

  function handleSwap() {
    if (!cikisSehirId || !varisSehirId) return;
    const prev = cikisSehirId;
    setCikisSehirId(varisSehirId);
    setVarisSehirId(prev);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGuzergah || !cikisSehirId || !varisSehirId || !tarih) return;

    const yolcuTurleri: Array<{ id: number; sayi: number }> = [];
    if (passengers.yetiskin > 0) yolcuTurleri.push({ id: 1, sayi: passengers.yetiskin });
    if (passengers.cocuk > 0) yolcuTurleri.push({ id: 2, sayi: passengers.cocuk });

    const [y, m, d] = tarih.split("-");
    onSearch({
      guzergah: selectedGuzergah,
      cikisSehirId,
      varisSehirId,
      tarih: `${d}/${m}/${y}`,
      yolcuTurleri,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Güzergah (only show if multiple) */}
      {guzergahlar.length > 1 && (
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Hat
          </label>
          <select
            value={guzergahId}
            onChange={(e) => {
              setGuzergahId(parseInt(e.target.value));
              setCikisSehirId(0);
              setVarisSehirId(0);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            required
          >
            <option value={0}>Güzergah seçin…</option>
            {guzergahlar.map((g) => (
              <option key={g.id} value={g.id}>
                {g.baslik}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Route fields */}
      <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_40px_1fr]">
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Nereden
          </label>
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <select
              value={cikisSehirId}
              onChange={(e) => setCikisSehirId(parseInt(e.target.value))}
              disabled={sehirler.length === 0}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
              required
            >
              <option value={0}>Kalkış limanı…</option>
              {sehirler.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.ad}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-center pb-1">
          <button
            type="button"
            onClick={handleSwap}
            disabled={!cikisSehirId || !varisSehirId}
            title="Güzergahı değiştir"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:border-slate-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
          </button>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Nereye
          </label>
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <select
              value={varisSehirId}
              onChange={(e) => setVarisSehirId(parseInt(e.target.value))}
              disabled={sehirler.length === 0}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
              required
            >
              <option value={0}>Varış limanı…</option>
              {sehirler
                .filter((s) => s.id !== cikisSehirId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.ad}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Date + Passengers */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Gidiş Tarihi
          </label>
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <input
              type="date"
              value={tarih}
              onChange={(e) => setTarih(e.target.value)}
              min={today}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              required
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Yolcular
          </label>
          <PassengerCountPopover value={passengers} onChange={setPassengers} />
        </div>
      </div>

      {/* CTA */}
      <button
        type="submit"
        disabled={!isValid}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        Seferleri Ara
      </button>
    </form>
  );
}
