"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";

interface VoyageRow {
  voyage_id: string;
  vessel_name: string;
  origin_port: string;
  destination_port: string;
  departure_utc: string;
  status: string;
}

const columns: Column<VoyageRow>[] = [
  { key: "vessel", label: "Gemi", render: (r) => r.vessel_name },
  { key: "route", label: "Rota", render: (r) => `${r.origin_port} → ${r.destination_port}` },
  {
    key: "departure",
    label: "Kalkis",
    render: (r) => new Date(r.departure_utc).toLocaleString("tr-TR"),
  },
  { key: "status", label: "Durum", render: (r) => <StatusBadge status={r.status} /> },
];

const STATUSES = ["", "DRAFT", "OPEN", "CLOSED", "DEPARTED", "CANCELLED"];

export default function VoyageListPage() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const url = status
    ? `/api/admin/voyages?status=${status}`
    : "/api/admin/voyages";
  const { data, loading, error } = useApi<{ voyages: VoyageRow[] }>(url);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Seferler</h1>
        <Link
          href="/admin/voyages/new"
          className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
        >
          Yeni Sefer
        </Link>
      </div>

      <div className="mb-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded border px-3 py-1.5 text-sm"
        >
          <option value="">Tum Durumlar</option>
          {STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading && <p className="text-sm text-gray-500">Yukleniyor...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {data && (
        <DataTable
          columns={columns}
          data={data.voyages}
          onRowClick={(r) => router.push(`/admin/voyages/${r.voyage_id}`)}
        />
      )}
    </div>
  );
}
