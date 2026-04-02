"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";

interface PassengerRow {
  booking_passenger_id: string;
  full_name: string;
  document_type: string;
  document_number: string;
  nationality: string;
  booking_status: string;
  is_line_cancelled: boolean;
}

interface VehicleRow {
  booking_vehicle_id: string;
  plate_number: string;
  vehicle_type: string;
  lane_meters_allocated: number;
  m2_allocated: number;
  booking_status: string;
  is_line_cancelled: boolean;
}

const paxColumns: Column<PassengerRow>[] = [
  { key: "name", label: "Ad Soyad", render: (r) => r.full_name },
  { key: "doc", label: "Belge", render: (r) => `${r.document_type} ${r.document_number}` },
  { key: "nat", label: "Uyruk", render: (r) => r.nationality },
  { key: "status", label: "Durum", render: (r) => <StatusBadge status={r.is_line_cancelled ? "CANCELLED" : r.booking_status} /> },
];

const vehColumns: Column<VehicleRow>[] = [
  { key: "plate", label: "Plaka", render: (r) => r.plate_number },
  { key: "type", label: "Tip", render: (r) => r.vehicle_type },
  { key: "lane", label: "Lane (m)", render: (r) => r.lane_meters_allocated },
  { key: "m2", label: "m²", render: (r) => r.m2_allocated },
  { key: "status", label: "Durum", render: (r) => <StatusBadge status={r.is_line_cancelled ? "CANCELLED" : r.booking_status} /> },
];

export default function ManifestPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [tab, setTab] = useState<"passengers" | "vehicles">("passengers");
  const [showCancelled, setShowCancelled] = useState(false);

  const { data: paxData, loading: paxLoading } = useApi<{ passengers: PassengerRow[] }>(
    `/api/admin/voyages/${id}/passenger-manifest`
  );
  const { data: vehData, loading: vehLoading } = useApi<{ vehicles: VehicleRow[] }>(
    `/api/admin/voyages/${id}/vehicle-manifest`
  );

  const passengers = paxData?.passengers ?? [];
  const vehicles = vehData?.vehicles ?? [];

  const filteredPax = showCancelled ? passengers : passengers.filter((p) => !p.is_line_cancelled);
  const filteredVeh = showCancelled ? vehicles : vehicles.filter((v) => !v.is_line_cancelled);

  const activePax = passengers.filter((p) => !p.is_line_cancelled).length;
  const activeVeh = vehicles.filter((v) => !v.is_line_cancelled).length;

  function downloadCsv() {
    const rows = tab === "passengers"
      ? filteredPax.map((p) => `${p.full_name},${p.document_type},${p.document_number},${p.nationality},${p.is_line_cancelled}`)
      : filteredVeh.map((v) => `${v.plate_number},${v.vehicle_type},${v.lane_meters_allocated},${v.m2_allocated},${v.is_line_cancelled}`);
    const header = tab === "passengers" ? "Ad,Belge Tipi,Belge No,Uyruk,Iptal" : "Plaka,Tip,Lane,m2,Iptal";
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `manifest-${tab}-${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Manifest</h1>

      <div className="mb-4 flex items-center gap-4">
        <div className="flex gap-1 rounded border p-0.5">
          <button onClick={() => setTab("passengers")} className={`rounded px-3 py-1 text-sm ${tab === "passengers" ? "bg-blue-600 text-white" : ""}`}>
            Yolcular ({activePax})
          </button>
          <button onClick={() => setTab("vehicles")} className={`rounded px-3 py-1 text-sm ${tab === "vehicles" ? "bg-blue-600 text-white" : ""}`}>
            Araclar ({activeVeh})
          </button>
        </div>
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
          Iptal edilenleri goster
        </label>
        <button onClick={downloadCsv} className="ml-auto text-sm text-blue-600 hover:underline">CSV Indir</button>
      </div>

      {(paxLoading || vehLoading) && <p className="text-sm text-gray-500">Yukleniyor...</p>}

      {tab === "passengers" && (
        <DataTable columns={paxColumns} data={filteredPax} emptyMessage="Yolcu bulunamadi." />
      )}
      {tab === "vehicles" && (
        <DataTable columns={vehColumns} data={filteredVeh} emptyMessage="Arac bulunamadi." />
      )}
    </div>
  );
}
