"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import { StatusBadge } from "@/components/ui/status-badge";

interface BookingRow {
  booking_id: string;
  voyage_id: string;
  status: string;
  confirmed_at: string;
  cancelled_at: string | null;
  checked_in_at: string | null;
}

const STATUS_TABS = [
  { label: "Tümü", value: "" },
  { label: "Onaylı", value: "CONFIRMED" },
  { label: "Check-in", value: "CHECKED_IN" },
  { label: "İptal", value: "CANCELLED" },
];

const PAGE_SIZE = 20;

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortId(value: string) {
  return `${value.slice(0, 8).toUpperCase()}…`;
}

export default function MyBookingsPage() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);

  const url = `/api/users/me/bookings?limit=${PAGE_SIZE}&offset=${offset}${
    status ? `&status=${status}` : ""
  }`;
  const { data, loading, error } = useApi<{ bookings: BookingRow[]; total: number }>(url);

  const bookings = data?.bookings ?? [];
  const total = data?.total ?? 0;
  const hasNext = offset + PAGE_SIZE < total;
  const hasPrev = offset > 0;

  function changeStatus(nextStatus: string) {
    setStatus(nextStatus);
    setOffset(0);
  }

  return (
    <div className="antso-page-bottom">
      <section className="relative overflow-hidden bg-brand-ink text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(60,146,183,0.24),transparent_30%),radial-gradient(circle_at_right,rgba(209,162,77,0.14),transparent_24%)]" />
        <div className="relative antso-section-shell">
          <div className="grid antso-box-gap xl:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-brand-seafoam">Hesabım</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Rezervasyonlarınızı tek ekranda yönetin
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/70">
                Aktif ve geçmiş rezervasyonlarınıza hızlıca erişin, durumlarını takip edin ve detay
                ekranından işlem geçmişini görüntüleyin.
              </p>
            </div>

            <div className="grid antso-box-gap sm:grid-cols-3">
              <StatCard title="Toplam sonuç" value={`${total}`} />
              <StatCard title="Bu sayfa" value={`${bookings.length}`} />
              <StatCard title="Filtre" value={status ? STATUS_TABS.find((tab) => tab.value === status)?.label ?? "Seçili" : "Tümü"} />
            </div>
          </div>
        </div>
      </section>

      <section className="antso-overlap-shell">
        <div className="rounded-[32px] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="grid antso-box-gap sm:grid-cols-2 xl:grid-cols-4">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => changeStatus(tab.value)}
                className={`rounded-[24px] px-4 py-3 text-sm font-semibold transition ${
                  status === tab.value
                    ? "bg-brand-ink text-white shadow-[0_18px_40px_rgba(16,37,61,0.18)]"
                    : "bg-slate-50 text-slate-600 hover:bg-brand-mist hover:text-brand-ink"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="antso-section-stack">
          {loading && (
            <div className="grid antso-box-gap lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-40 animate-pulse rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]"
                />
              ))}
            </div>
          )}

          {error && (
            <div className="rounded-[24px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && bookings.length === 0 && (
            <div className="rounded-[36px] border border-slate-200 bg-white p-10 text-center shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-full bg-brand-mist text-brand-ocean">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M9 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"
                  />
                </svg>
              </div>
              <h2 className="mt-6 text-2xl font-semibold text-slate-900">Rezervasyon bulunamadı</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {status
                  ? "Seçtiğiniz filtreye uygun rezervasyon kaydı bulunmuyor."
                  : "Henüz hesabınıza bağlı bir rezervasyon görünmüyor."}
              </p>
            </div>
          )}

          {!loading && !error && bookings.length > 0 && (
            <div className="grid antso-box-gap lg:grid-cols-2">
              {bookings.map((booking) => (
                <button
                  key={booking.booking_id}
                  type="button"
                  onClick={() => router.push(`/bookings/${booking.booking_id}`)}
                  className="group rounded-[32px] border border-slate-200 bg-white p-6 text-left shadow-[0_24px_70px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-brand-sky/30 hover:shadow-[0_28px_80px_rgba(15,23,42,0.12)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-mist text-brand-ocean">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.8}
                            d="M9 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"
                          />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Rezervasyon</p>
                        <p className="mt-2 truncate font-mono text-lg font-semibold text-slate-900">
                          {shortId(booking.booking_id)}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          Onay tarihi: {formatDate(booking.confirmed_at)}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>

                  <div className="mt-6 grid antso-box-gap">
                    <InfoLine label="Voyage ID" value={shortId(booking.voyage_id)} />
                    {booking.checked_in_at ? (
                      <InfoLine label="Check-in" value={formatDate(booking.checked_in_at)} success />
                    ) : (
                      <InfoLine label="Check-in" value="Henüz yapılmadı" />
                    )}
                    {booking.cancelled_at && (
                      <InfoLine label="İptal" value={formatDate(booking.cancelled_at)} danger />
                    )}
                  </div>

                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-ocean">
                    Detayı görüntüle
                    <svg
                      className="h-4 w-4 transition group-hover:translate-x-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 12h14m-6-6 6 6-6 6" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}

          {(hasPrev || hasNext) && (
            <div className="antso-section-stack flex flex-col antso-box-gap sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={!hasPrev}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Önceki sayfa
              </button>
              <span className="text-sm text-slate-500">
                {offset + 1}-{Math.min(offset + PAGE_SIZE, total)} / {total}
              </span>
              <button
                type="button"
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={!hasNext}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Sonraki sayfa
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.05] px-5 py-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-white/42">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function InfoLine({
  label,
  value,
  success,
  danger,
}: {
  label: string;
  value: string;
  success?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span
        className={`font-medium ${
          success ? "text-emerald-600" : danger ? "text-red-600" : "text-slate-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
