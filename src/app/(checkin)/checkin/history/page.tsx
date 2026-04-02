"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import { CheckinHistoryTable } from "@/components/domain/checkin-history-table";

interface CheckinRecord {
  check_in_record_id: string;
  booking_id: string;
  outcome: string;
  operator_id: string;
  document_verified: boolean;
  denial_reason: string | null;
  attempted_at: string;
}

const OUTCOME_TABS = [
  { label: "Tumu", value: "" },
  { label: "Onaylandi", value: "APPROVED" },
  { label: "Reddedildi", value: "DENIED" },
];

const PAGE_SIZE = 50;

export default function CheckinHistoryPage() {
  const router = useRouter();
  const [outcome, setOutcome] = useState("");
  const [offset, setOffset] = useState(0);

  const url = `/api/checkin/history?limit=${PAGE_SIZE}&offset=${offset}${outcome ? `&outcome=${outcome}` : ""}`;
  const { data, loading, error } = useApi<{
    records: CheckinRecord[];
    total: number;
  }>(url);

  const records = data?.records ?? [];
  const total = data?.total ?? 0;
  const hasNext = offset + PAGE_SIZE < total;
  const hasPrev = offset > 0;

  function changeOutcome(v: string) {
    setOutcome(v);
    setOffset(0);
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Check-in Gecmisi</h1>

      {/* Outcome filter tabs */}
      <div className="mb-4 flex gap-1 rounded border p-0.5">
        {OUTCOME_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => changeOutcome(tab.value)}
            className={`rounded px-3 py-1.5 text-sm ${
              outcome === tab.value
                ? "bg-blue-600 text-white"
                : "hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-gray-500">Yukleniyor...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && (
        <CheckinHistoryTable
          records={records}
          onRowClick={(bookingId) => router.push(`/checkin/${bookingId}`)}
        />
      )}

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
