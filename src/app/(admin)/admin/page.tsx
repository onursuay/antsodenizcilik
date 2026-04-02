"use client";

import Link from "next/link";
import { useApi } from "@/hooks/use-api";
import { StatCard } from "@/components/ui/stat-card";

interface VoyageRow {
  voyage_id: string;
  origin_port: string;
  destination_port: string;
  departure_utc: string;
  status: string;
}

interface OpsRow {
  issue_type: string;
  open_count: number;
}

export default function AdminDashboardPage() {
  const { data: voyageData } = useApi<{ voyages: VoyageRow[] }>(
    "/api/admin/voyages?status=OPEN"
  );
  const { data: opsData } = useApi<{ summary: OpsRow[] }>("/api/ops/queue");

  const openVoyages = voyageData?.voyages ?? [];
  const opsSummary = opsData?.summary ?? [];
  const totalOps = opsSummary.reduce((sum, r) => sum + r.open_count, 0);

  // Next 3 departures
  const upcoming = [...openVoyages]
    .sort((a, b) => a.departure_utc.localeCompare(b.departure_utc))
    .slice(0, 3);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard label="Aktif Seferler" value={openVoyages.length} />
        <StatCard label="Acik Ops Kaydi" value={totalOps} />
        <StatCard label="Yaklaşan Kalkis" value={upcoming.length} />
      </div>

      {/* Upcoming Departures */}
      {upcoming.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">Yaklasan Kalkislar</h2>
          <div className="space-y-2">
            {upcoming.map((v) => (
              <Link
                key={v.voyage_id}
                href={`/admin/voyages/${v.voyage_id}`}
                className="block rounded border p-3 text-sm hover:bg-gray-50"
              >
                <p className="font-medium">{v.origin_port} → {v.destination_port}</p>
                <p className="text-xs text-gray-500">
                  {new Date(v.departure_utc).toLocaleString("tr-TR")}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="flex gap-3 text-sm">
        <Link href="/admin/voyages" className="text-blue-600 hover:underline">Tum Seferler</Link>
        <Link href="/admin/vessels" className="text-blue-600 hover:underline">Gemiler</Link>
        <Link href="/admin/ops" className="text-blue-600 hover:underline">Ops Kuyrugu</Link>
      </div>
    </div>
  );
}
