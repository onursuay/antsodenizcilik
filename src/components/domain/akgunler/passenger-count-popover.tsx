"use client";

import { useState, useRef, useEffect } from "react";

export interface PassengerCounts {
  yetiskin: number;
  cocuk: number;
}

interface Props {
  value: PassengerCounts;
  onChange: (v: PassengerCounts) => void;
}

function CountRow({
  label,
  subtitle,
  count,
  min,
  max,
  onInc,
  onDec,
}: {
  label: string;
  subtitle: string;
  count: number;
  min: number;
  max: number;
  onInc: () => void;
  onDec: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-3.5 last:border-0">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onDec}
          disabled={count <= min}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-lg leading-none text-slate-600 transition hover:border-blue-500 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-25"
        >
          −
        </button>
        <span className="w-5 text-center text-sm font-semibold text-slate-900">{count}</span>
        <button
          type="button"
          onClick={onInc}
          disabled={count >= max}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-lg leading-none text-slate-600 transition hover:border-blue-500 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-25"
        >
          +
        </button>
      </div>
    </div>
  );
}

function buildSummary(v: PassengerCounts): string {
  const parts: string[] = [];
  if (v.yetiskin > 0) parts.push(`${v.yetiskin} Yetişkin`);
  if (v.cocuk > 0) parts.push(`${v.cocuk} Çocuk`);
  return parts.join(", ") || "Yolcu Seçin";
}

export function PassengerCountPopover({ value, onChange }: Props) {
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

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      >
        <span className="flex items-center gap-2.5">
          <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className={value.yetiskin > 0 ? "text-slate-900" : "text-slate-400"}>
            {buildSummary(value)}
          </span>
        </span>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white px-5 py-2 shadow-xl">
          <p className="mb-0.5 mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Yolcu Sayısı
          </p>
          <CountRow
            label="Yetişkin"
            subtitle="12 yaş ve üzeri"
            count={value.yetiskin}
            min={1}
            max={9}
            onInc={() => onChange({ ...value, yetiskin: value.yetiskin + 1 })}
            onDec={() => onChange({ ...value, yetiskin: value.yetiskin - 1 })}
          />
          <CountRow
            label="Çocuk"
            subtitle="7–12 yaş"
            count={value.cocuk}
            min={0}
            max={9}
            onInc={() => onChange({ ...value, cocuk: value.cocuk + 1 })}
            onDec={() => onChange({ ...value, cocuk: value.cocuk - 1 })}
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mb-3 mt-4 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Tamam
          </button>
        </div>
      )}
    </div>
  );
}
