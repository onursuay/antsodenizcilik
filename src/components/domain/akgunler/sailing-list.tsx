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
      <div className="antso-elevated-card rounded-[34px] p-8 sm:p-10">
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-full bg-brand-mist text-brand-ocean">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M3 7.5h18m-15 0L8 4.5m-2 3 2 3m12 3H6m12 0-2-3m2 3-2 3M7 19.5h10"
              />
            </svg>
          </div>
          <h2 className="mt-6 font-heading text-3xl font-extrabold tracking-[-0.04em] text-slate-900">Uygun sefer bulunamadı</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Seçtiğiniz tarih için aktif feribot bulunmuyor olabilir. Tarihi değiştirip yeniden
            sorgulayarak güncel seferleri görebilirsiniz.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="mt-8 inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Tarihi değiştir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="antso-box-stack">
      <div className="grid antso-box-gap xl:grid-cols-[1.2fr_0.8fr]">
        <div className="antso-elevated-card rounded-[32px] p-6 sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-brand-ocean/60">
                Sefer seçimi
              </p>
              <h2 className="mt-3 font-heading text-4xl font-extrabold tracking-[-0.04em] text-slate-900">Güncel feribot seferleri</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {seferler.length} farklı seçenek bulundu. Fiyat, saat ve gemi bilgisine göre size en
                uygun seferi seçebilirsiniz.
              </p>
            </div>

            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-[0_10px_24px_rgba(18,38,60,0.04)] transition hover:border-slate-300 hover:text-brand-ocean"
            >
              Aramayı değiştir
            </button>
          </div>
        </div>

        <div className="rounded-[32px] bg-[linear-gradient(135deg,#1b7a85_0%,#5ebcd5_100%)] p-6 text-white shadow-[0_24px_64px_rgba(27,122,133,0.22)]">
          <p className="text-xs uppercase tracking-[0.24em] text-white/70">Rezervasyon avantajı</p>
          <div className="mt-4 antso-box-stack">
            <InsightRow label="Kişi başı fiyat" value={seferler[0]?.formatted_price ?? "Güncel"} />
            <InsightRow label="Biletleme" value="Ödeme sonrası anında" />
            <InsightRow label="Güvenlik" value="3D Secure ödeme" />
          </div>
        </div>
      </div>

      <div className="antso-box-stack">
        {seferler.map((sefer, index) => (
          <SailingCard
            key={sefer.id}
            sefer={sefer}
            onSelect={onSelect}
            highlighted={index === 0}
          />
        ))}
      </div>
    </div>
  );
}

function InsightRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] bg-white/12 px-4 py-3 backdrop-blur-sm">
      <p className="text-[11px] uppercase tracking-[0.2em] text-white/72">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function SailingCard({
  sefer,
  onSelect,
  highlighted,
}: {
  sefer: SeferData;
  onSelect: (id: number) => void;
  highlighted: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[32px] bg-white shadow-[0_18px_46px_rgba(18,38,60,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_64px_rgba(18,38,60,0.1)] ${
        highlighted ? "ring-2 ring-brand-sky/25" : "ring-1 ring-white"
      }`}
    >
      <div className="flex flex-col gap-6 p-6 sm:p-7 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {highlighted && (
              <span className="inline-flex items-center rounded-full bg-brand-mist px-3 py-1 text-xs font-semibold text-brand-ocean">
                Önerilen sefer
              </span>
            )}
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Müsait
            </span>
            {sefer.trip_number && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                Sefer No {sefer.trip_number}
              </span>
            )}
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-[auto_1fr] md:items-center">
            <div className="min-w-[148px]">
              <p className="text-[12px] uppercase tracking-[0.24em] text-slate-400">Kalkış</p>
              <p className="mt-2 font-heading text-4xl font-extrabold tracking-[-0.04em] text-slate-900">
                {sefer.sefer_tarih}
              </p>
              {sefer.full_date && (
                <p className="mt-2 text-sm text-slate-500">{sefer.full_date}</p>
              )}
            </div>

            <div className="rounded-[28px] bg-[#f1f7f9] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-brand-ocean shadow-[0_8px_18px_rgba(18,38,60,0.05)]">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.7}
                      d="M3 10h18M3 10l2-4h14l2 4M3 10l1 8h16l1-8M9 18h6"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-heading text-lg font-bold tracking-[-0.03em] text-slate-900">{sefer.gemi}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Rahat geçiş, güncel operatör seferi ve anlık biletleme akışı
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center rounded-full bg-white px-3 py-1 shadow-[0_8px_18px_rgba(18,38,60,0.04)] ring-1 ring-slate-200/70">
                  Resmi acente
                </span>
                <span className="inline-flex items-center rounded-full bg-white px-3 py-1 shadow-[0_8px_18px_rgba(18,38,60,0.04)] ring-1 ring-slate-200/70">
                  3D Secure ödeme
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:min-w-[230px] lg:border-l lg:border-slate-100 lg:pl-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-brand-ocean/55">
              Kişi başı başlangıç
            </p>
            <p className="mt-3 font-heading text-4xl font-extrabold tracking-[-0.04em] text-brand-ocean">{sefer.formatted_price}</p>
          </div>

          <button
            type="button"
            onClick={() => onSelect(sefer.id)}
            className="antso-gradient-cta inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold text-white transition hover:brightness-105"
          >
            Bu seferi seç
          </button>
        </div>
      </div>
    </div>
  );
}
