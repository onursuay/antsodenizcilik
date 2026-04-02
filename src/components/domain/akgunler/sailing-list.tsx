"use client";

interface SeferData {
  id: number;
  sefer_tarih: string;
  gemi: string;
  ucret: number;
  formatted_price: string;
  secili_mi: boolean;
  trip_number?: string;
  full_date?: string;
}

interface SailingListProps {
  seferler: SeferData[];
  onSelect: (seferId: number) => void;
  onBack: () => void;
}

export function SailingList({ seferler, onSelect, onBack }: SailingListProps) {
  if (seferler.length === 0) {
    return (
      <div className="py-20 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <svg className="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-slate-900">Sefer Bulunamadı</h3>
        <p className="mb-6 text-sm text-slate-500">
          Seçilen tarih ve güzergah için uygun sefer mevcut değil.
        </p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Tarihi Değiştir
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Mevcut Seferler</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {seferler.length} sefer listeleniyor
          </p>
        </div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Değiştir
        </button>
      </div>

      <div className="space-y-3">
        {seferler.map((sefer) => (
          <SailingCard key={sefer.id} sefer={sefer} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function SailingCard({
  sefer,
  onSelect,
}: {
  sefer: SeferData;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-300 hover:shadow-md">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        {/* Left: Departure info */}
        <div className="flex-1 space-y-3">
          {/* Time display */}
          <div className="flex items-center gap-4">
            <div className="min-w-0">
              <p className="text-2xl font-bold tabular-nums text-slate-900">
                {sefer.sefer_tarih}
              </p>
              {sefer.full_date && (
                <p className="mt-0.5 text-xs text-slate-400">{sefer.full_date}</p>
              )}
            </div>
            <div className="flex flex-1 items-center gap-2">
              <div className="h-px flex-1 bg-slate-200" />
              <svg className="h-5 w-5 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 2.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z"
                />
              </svg>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
          </div>

          {/* Ship + trip info */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 10h18M3 10l2-4h14l2 4M3 10l1 8h16l1-8M9 18h6"
                />
              </svg>
              {sefer.gemi}
            </span>
            {sefer.trip_number && (
              <span className="text-xs text-slate-400">Sefer: {sefer.trip_number}</span>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
              Müsait
            </span>
          </div>
        </div>

        {/* Right: Price + CTA */}
        <div className="flex items-center justify-between gap-5 border-t border-slate-100 pt-4 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
          <div className="sm:text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Kişi Başı
            </p>
            <p className="text-2xl font-bold text-slate-900">{sefer.formatted_price}</p>
          </div>
          <button
            onClick={() => onSelect(sefer.id)}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-800"
          >
            Seç
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
