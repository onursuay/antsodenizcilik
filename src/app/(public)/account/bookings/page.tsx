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

  function changeStatus(s: string) {
    setStatus(s);
    setOffset(0);
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        {/* Page header */}
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-slate-900">Rezervasyonlarım</h1>
          <p className="mt-1 text-sm text-slate-500">Tüm geçmiş ve aktif rezervasyonlarınız</p>
        </div>

        {/* Status filter tabs */}
        <div className="mb-5 flex gap-1 rounded-xl bg-white p-1 shadow-sm border border-slate-200">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => changeStatus(tab.value)}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                status === tab.value
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <svg className="h-5 w-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && bookings.length === 0 && (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <svg className="h-7 w-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h3 className="mb-1 text-base font-semibold text-slate-900">Rezervasyon Bulunamadı</h3>
            <p className="text-sm text-slate-500">
              {status ? "Bu filtreye uygun rezervasyon yok." : "Henüz rezervasyon yapmamışsınız."}
            </p>
          </div>
        )}

        {/* Booking list */}
        {!loading && bookings.length > 0 && (
          <div className="space-y-3">
            {bookings.map((b) => (
              <button
                key={b.booking_id}
                onClick={() => router.push(`/bookings/${b.booking_id}`)}
                className="group w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50">
                        <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                      </div>
                      <p className="truncate font-mono text-sm font-bold text-slate-900">
                        {b.booking_id.slice(0, 8).toUpperCase()}…
                      </p>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      {new Date(b.confirmed_at).toLocaleString("tr-TR")}
                    </p>
                    {b.checked_in_at && (
                      <p className="mt-0.5 text-xs text-emerald-600">
                        ✓ Check-in: {new Date(b.checked_in_at).toLocaleString("tr-TR")}
                      </p>
                    )}
                    {b.cancelled_at && (
                      <p className="mt-0.5 text-xs text-red-500">
                        İptal: {new Date(b.cancelled_at).toLocaleString("tr-TR")}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={b.status} />
                    <svg
                      className="h-4 w-4 text-slate-300 transition-colors group-hover:text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Pagination */}
        {(hasPrev || hasNext) && (
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={!hasPrev}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Önceki
            </button>
            <span className="text-xs text-slate-400">
              {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} / {total}
            </span>
            <button
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={!hasNext}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sonraki
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
