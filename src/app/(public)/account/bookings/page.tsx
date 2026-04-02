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
  { label: "Tumu", value: "" },
  { label: "Onaylanmis", value: "CONFIRMED" },
  { label: "Check-in", value: "CHECKED_IN" },
  { label: "Iptal", value: "CANCELLED" },
];

const PAGE_SIZE = 20;

export default function MyBookingsPage() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);

  const url = `/api/users/me/bookings?limit=${PAGE_SIZE}&offset=${offset}${status ? `&status=${status}` : ""}`;
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
    <div>
      <h1 className="mb-4 text-2xl font-bold">Rezervasyonlarim</h1>

        {/* Status tabs */}
        <div className="mb-4 flex gap-1 rounded border p-0.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => changeStatus(tab.value)}
              className={`rounded px-3 py-1.5 text-sm ${
                status === tab.value ? "bg-blue-600 text-white" : "hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && <p className="text-sm text-gray-500">Yukleniyor...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && bookings.length === 0 && (
          <p className="text-sm text-gray-500">Rezervasyon bulunamadi.</p>
        )}

        {/* Booking list */}
        <div className="space-y-2">
          {bookings.map((b) => (
            <button
              key={b.booking_id}
              onClick={() => router.push(`/bookings/${b.booking_id}`)}
              className="w-full rounded border p-4 text-left transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium font-mono">
                    {b.booking_id.slice(0, 8)}...
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(b.confirmed_at).toLocaleString("tr-TR")}
                  </p>
                </div>
                <StatusBadge status={b.status} />
              </div>
            </button>
          ))}
        </div>

        {/* Pagination */}
        {(hasPrev || hasNext) && (
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={!hasPrev}
              className="rounded border px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Onceki
            </button>
            <span className="text-xs text-gray-500">
              {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} / {total}
            </span>
            <button
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={!hasNext}
              className="rounded border px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Sonraki
            </button>
          </div>
        )}
    </div>
  );
}
