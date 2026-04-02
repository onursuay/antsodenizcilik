"use client";

import Link from "next/link";
import { useApi } from "@/hooks/use-api";
import { DataTable, type Column } from "@/components/ui/data-table";

interface VesselRow {
  vessel_id: string;
  name: string;
  base_lane_meters: number;
  base_m2: number;
  base_passenger_capacity: number;
  cabin_type_count: number;
  commissioned_at: string;
}

const columns: Column<VesselRow>[] = [
  { key: "name", label: "Ad", render: (r) => r.name },
  { key: "lane", label: "Lane (m)", render: (r) => r.base_lane_meters },
  { key: "m2", label: "m²", render: (r) => r.base_m2 },
  { key: "pax", label: "Yolcu", render: (r) => r.base_passenger_capacity },
  { key: "cabins", label: "Kabin Tipi", render: (r) => r.cabin_type_count },
  {
    key: "date",
    label: "Komisyon Tarihi",
    render: (r) => new Date(r.commissioned_at).toLocaleDateString("tr-TR"),
  },
];

export default function VesselListPage() {
  const { data, loading, error } = useApi<{ vessels: VesselRow[] }>(
    "/api/admin/vessels"
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gemiler</h1>
        <Link
          href="/admin/vessels/new"
          className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
        >
          Yeni Gemi
        </Link>
      </div>

      {loading && <p className="text-sm text-gray-500">Yukleniyor...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {data && <DataTable columns={columns} data={data.vessels} />}
    </div>
  );
}
