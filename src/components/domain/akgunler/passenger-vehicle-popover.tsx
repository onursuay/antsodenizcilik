"use client";

import { useState, useRef, useEffect } from "react";

interface YolcuTur {
  id: number;
  title: string;
  yolcu_kodu: string;
  yolcu_tipi: string;
}

interface GuzergahData {
  yolcu_turleri: YolcuTur[];
  arac_turleri: YolcuTur[];
  kabin_turleri: YolcuTur[];
}

export interface YolcuSayi {
  id: number;
  sayi: number;
}

interface Props {
  guzergah: GuzergahData | null;
  value: YolcuSayi[];
  onChange: (v: YolcuSayi[]) => void;
}

function getCount(value: YolcuSayi[], id: number): number {
  return value.find((v) => v.id === id)?.sayi ?? 0;
}

function setCount(value: YolcuSayi[], id: number, sayi: number): YolcuSayi[] {
  if (sayi <= 0) return value.filter((v) => v.id !== id);
  const existing = value.find((v) => v.id === id);
  if (existing) return value.map((v) => (v.id === id ? { ...v, sayi } : v));
  return [...value, { id, sayi }];
}

function buildSummary(value: YolcuSayi[], guzergah: GuzergahData | null): string {
  if (!guzergah) {
    const total = value.reduce((s, v) => s + v.sayi, 0);
    return total > 0 ? `${total} Kişi` : "Yolcu Seçin";
  }

  const allTypes = [
    ...guzergah.yolcu_turleri,
    ...guzergah.arac_turleri,
    ...guzergah.kabin_turleri,
  ];

  const parts: string[] = [];
  for (const v of value) {
    if (v.sayi <= 0) continue;
    const tur = allTypes.find((t) => t.id === v.id);
    if (tur) parts.push(`${v.sayi} ${tur.title}`);
  }
  return parts.length > 0 ? parts.join(", ") : "Yolcu Seçin";
}

function CountRow({
  label,
  count,
  min,
  onInc,
  onDec,
}: {
  label: string;
  count: number;
  min: number;
  onInc: () => void;
  onDec: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-700">{label}</span>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onDec}
          disabled={count <= min}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-base leading-none text-slate-600 transition hover:border-blue-500 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-25"
        >
          −
        </button>
        <span className="w-4 text-center text-sm font-semibold tabular-nums text-slate-900">
          {count}
        </span>
        <button
          type="button"
          onClick={onInc}
          disabled={count >= 9}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-base leading-none text-slate-600 transition hover:border-blue-500 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-25"
        >
          +
        </button>
      </div>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 mb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
      {children}
    </p>
  );
}

export function PassengerVehiclePopover({ guzergah, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const summary = buildSummary(value, guzergah);

  // Fallback: show simple yetişkin/çocuk if no guzergah data yet
  const yolcuTurleri = guzergah?.yolcu_turleri ?? [];
  const aracTurleri = guzergah?.arac_turleri ?? [];
  const kabinTurleri = guzergah?.kabin_turleri ?? [];

  const hasArac = aracTurleri.length > 0;
  const hasKabin = kabinTurleri.length > 0;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      >
        <span className="flex items-center gap-2 min-w-0">
          <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className={`truncate ${summary === "Yolcu Seçin" ? "text-slate-400" : "text-slate-900"}`}>
            {summary}
          </span>
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="max-h-[420px] overflow-y-auto px-5 pb-3 pt-4">
            {yolcuTurleri.length > 0 ? (
              <>
                <SectionHeader>Yolcular</SectionHeader>
                {yolcuTurleri.map((tur, i) => {
                  const count = getCount(value, tur.id);
                  const isFirst = i === 0;
                  return (
                    <CountRow
                      key={tur.id}
                      label={tur.title}
                      count={count}
                      min={isFirst ? 1 : 0}
                      onInc={() => onChange(setCount(value, tur.id, count + 1))}
                      onDec={() => onChange(setCount(value, tur.id, Math.max(isFirst ? 1 : 0, count - 1)))}
                    />
                  );
                })}
              </>
            ) : (
              <>
                {/* Fallback when guzergah not yet loaded */}
                <SectionHeader>Yolcular</SectionHeader>
                {[
                  { id: 1, label: "Yetişkin (12+)", min: 1 },
                  { id: 2, label: "Çocuk (7-12 Yaş)", min: 0 },
                ].map(({ id, label, min }) => {
                  const count = getCount(value, id);
                  return (
                    <CountRow
                      key={id}
                      label={label}
                      count={count}
                      min={min}
                      onInc={() => onChange(setCount(value, id, count + 1))}
                      onDec={() => onChange(setCount(value, id, Math.max(min, count - 1)))}
                    />
                  );
                })}
              </>
            )}

            {hasArac && (
              <>
                <SectionHeader>Araçlar</SectionHeader>
                {aracTurleri.map((tur) => {
                  const count = getCount(value, tur.id);
                  return (
                    <CountRow
                      key={tur.id}
                      label={tur.title}
                      count={count}
                      min={0}
                      onInc={() => onChange(setCount(value, tur.id, count + 1))}
                      onDec={() => onChange(setCount(value, tur.id, Math.max(0, count - 1)))}
                    />
                  );
                })}
              </>
            )}

            {hasKabin && (
              <>
                <SectionHeader>Kabinler</SectionHeader>
                {kabinTurleri.map((tur) => {
                  const count = getCount(value, tur.id);
                  return (
                    <CountRow
                      key={tur.id}
                      label={tur.title}
                      count={count}
                      min={0}
                      onInc={() => onChange(setCount(value, tur.id, count + 1))}
                      onDec={() => onChange(setCount(value, tur.id, Math.max(0, count - 1)))}
                    />
                  );
                })}
              </>
            )}
          </div>

          <div className="border-t border-slate-100 px-5 pb-4 pt-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-xl bg-[#0C1829] py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Tamam
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
