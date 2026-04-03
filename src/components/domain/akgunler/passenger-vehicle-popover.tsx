"use client";

import { useEffect, useRef, useState } from "react";

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
  return value.find((item) => item.id === id)?.sayi ?? 0;
}

function setCount(value: YolcuSayi[], id: number, sayi: number): YolcuSayi[] {
  if (sayi <= 0) {
    return value.filter((item) => item.id !== id);
  }

  const existing = value.find((item) => item.id === id);
  if (existing) {
    return value.map((item) => (item.id === id ? { ...item, sayi } : item));
  }

  return [...value, { id, sayi }];
}

function buildSummary(value: YolcuSayi[], guzergah: GuzergahData | null): string {
  if (!guzergah) {
    const total = value.reduce((sum, item) => sum + item.sayi, 0);
    return total > 0 ? `${total} yolcu` : "Yolcu seçin";
  }

  const allTypes = [
    ...guzergah.yolcu_turleri,
    ...guzergah.arac_turleri,
    ...guzergah.kabin_turleri,
  ];

  const parts: string[] = [];
  for (const item of value) {
    if (item.sayi <= 0) continue;
    const matched = allTypes.find((type) => type.id === item.id);
    if (matched) {
      parts.push(`${item.sayi} ${matched.title}`);
    }
  }

  return parts.length > 0 ? parts.join(", ") : "Yolcu seçin";
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-3 mt-5 first:mt-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        {title}
      </p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function CountRow({
  label,
  subtitle,
  count,
  min,
  onInc,
  onDec,
}: {
  label: string;
  subtitle: string;
  count: number;
  min: number;
  onInc: () => void;
  onDec: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="min-w-0 pr-4">
        <p className="truncate text-sm font-semibold text-slate-900">{label}</p>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onDec}
          disabled={count <= min}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-lg leading-none text-slate-700 transition hover:border-brand-sky hover:text-brand-sky disabled:cursor-not-allowed disabled:opacity-35"
        >
          −
        </button>
        <span className="w-6 text-center text-sm font-semibold tabular-nums text-slate-900">
          {count}
        </span>
        <button
          type="button"
          onClick={onInc}
          disabled={count >= 9}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-lg leading-none text-slate-700 transition hover:border-brand-sky hover:text-brand-sky disabled:cursor-not-allowed disabled:opacity-35"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function PassengerVehiclePopover({ guzergah, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const summary = buildSummary(value, guzergah);
  const yolcuTurleri = guzergah?.yolcu_turleri ?? [];
  const aracTurleri = guzergah?.arac_turleri ?? [];
  const kabinTurleri = guzergah?.kabin_turleri ?? [];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-[56px] w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-brand-sky/40 hover:bg-white"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-900">Yolcu, araç ve kabin</span>
          <span className="mt-1 block truncate text-sm text-slate-500">{summary}</span>
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-3 w-full min-w-[320px] rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_30px_90px_rgba(15,23,42,0.18)] lg:w-[420px]">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-slate-900">Seyahat detayları</p>
              <p className="mt-1 text-sm text-slate-500">
                Yolcu, araç ve kabin adedini eksiksiz girin.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:text-slate-700"
              aria-label="Paneli kapat"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {yolcuTurleri.length > 0 ? (
              <>
                <SectionHeader title="Yolcular" description="En az 1 yetişkin yolcu seçilmelidir." />
                {yolcuTurleri.map((tur, index) => {
                  const count = getCount(value, tur.id);
                  const min = index === 0 ? 1 : 0;

                  return (
                    <CountRow
                      key={tur.id}
                      label={tur.title}
                      subtitle="Biletleme sırasında bu bilgiler zorunludur."
                      count={count}
                      min={min}
                      onInc={() => onChange(setCount(value, tur.id, count + 1))}
                      onDec={() => onChange(setCount(value, tur.id, Math.max(min, count - 1)))}
                    />
                  );
                })}
              </>
            ) : (
              <>
                <SectionHeader title="Yolcular" description="En az 1 yetişkin yolcu seçilmelidir." />
                {[
                  { id: 1, label: "Yetişkin", subtitle: "12 yaş ve üzeri", min: 1 },
                  { id: 2, label: "Çocuk", subtitle: "7-12 yaş", min: 0 },
                ].map((item) => {
                  const count = getCount(value, item.id);
                  return (
                    <CountRow
                      key={item.id}
                      label={item.label}
                      subtitle={item.subtitle}
                      count={count}
                      min={item.min}
                      onInc={() => onChange(setCount(value, item.id, count + 1))}
                      onDec={() =>
                        onChange(setCount(value, item.id, Math.max(item.min, count - 1)))
                      }
                    />
                  );
                })}
              </>
            )}

            {aracTurleri.length > 0 && (
              <>
                <SectionHeader title="Araçlar" description="Araçla geçiş yapacaksanız araç tipini belirtin." />
                {aracTurleri.map((tur) => {
                  const count = getCount(value, tur.id);
                  return (
                    <CountRow
                      key={tur.id}
                      label={tur.title}
                      subtitle="Araç yeri müsaitliğe göre ayrılır."
                      count={count}
                      min={0}
                      onInc={() => onChange(setCount(value, tur.id, count + 1))}
                      onDec={() => onChange(setCount(value, tur.id, Math.max(0, count - 1)))}
                    />
                  );
                })}
              </>
            )}

            {kabinTurleri.length > 0 && (
              <>
                <SectionHeader title="Kabinler" description="Gece seferlerinde tercih edilen kabin tipini ekleyin." />
                {kabinTurleri.map((tur) => {
                  const count = getCount(value, tur.id);
                  return (
                    <CountRow
                      key={tur.id}
                      label={tur.title}
                      subtitle="Kabin kapasitesi operatör onayına tabidir."
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

          <div className="mt-5 flex items-center justify-between gap-3 rounded-[24px] bg-brand-mist px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-brand-ocean/70">Seçim özeti</p>
              <p className="mt-1 text-sm font-semibold text-brand-ink">{summary}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center rounded-full bg-brand-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0c1f34]"
            >
              Tamam
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
