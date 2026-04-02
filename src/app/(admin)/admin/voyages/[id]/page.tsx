"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useApi } from "@/hooks/use-api";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatCard } from "@/components/ui/stat-card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface VoyageDetail {
  voyage: {
    voyage_id: string;
    vessel_name: string;
    origin_port: string;
    destination_port: string;
    departure_utc: string;
    arrival_utc: string;
    status: string;
    operational_lane_meters: number;
    operational_m2: number;
    operational_passenger_capacity: number;
    overbooking_delta: number;
  };
  capacityCounters: {
    lane_meters_reserved: number;
    lane_meters_confirmed: number;
    m2_reserved: number;
    m2_confirmed: number;
    passengers_reserved: number;
    passengers_confirmed: number;
  } | null;
  cabinInventory: Array<{
    cabin_type_id: string;
    total_count: number;
    reserved_count: number;
    confirmed_count: number;
  }>;
  bookingCounts: {
    CONFIRMED: number;
    CHECKED_IN: number;
    CANCELLED: number;
  };
}

const TRANSITIONS: Record<string, { label: string; action: string; confirm: string }[]> = {
  DRAFT: [{ label: "Ac", action: "open", confirm: "Sefer acilsin mi?" }],
  OPEN: [
    { label: "Kapat", action: "close", confirm: "Rezervasyonlar dondurulsun mu?" },
    { label: "Iptal Et", action: "cancel", confirm: "Sefer iptal edilsin mi?" },
  ],
  CLOSED: [
    { label: "Kalkis", action: "depart", confirm: "Sefer kalkis yapsın mi?" },
    { label: "Iptal Et", action: "cancel", confirm: "Sefer iptal edilsin mi?" },
  ],
};

export default function VoyageDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data, loading, error, refetch } = useApi<VoyageDetail>(
    `/api/admin/voyages/${id}`
  );

  const [dialog, setDialog] = useState<{ label: string; action: string; confirm: string } | null>(null);

  async function handleLifecycle(action: string) {
    await fetch(`/api/admin/voyages/${id}/${action}`, { method: "POST" });
    setDialog(null);
    refetch();
  }

  if (loading) return <p className="text-sm text-gray-500">Yukleniyor...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return null;

  const { voyage: v, capacityCounters: c, cabinInventory, bookingCounts } = data;
  const transitions = TRANSITIONS[v.status] ?? [];

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-2xl font-bold">
          {v.origin_port} → {v.destination_port}
        </h1>
        <StatusBadge status={v.status} />
      </div>

      <div className="mb-4 text-sm text-gray-600">
        <p>Gemi: {v.vessel_name}</p>
        <p>Kalkis: {new Date(v.departure_utc).toLocaleString("tr-TR")}</p>
        <p>Varis: {new Date(v.arrival_utc).toLocaleString("tr-TR")}</p>
      </div>

      {/* Lifecycle Buttons */}
      {transitions.length > 0 && (
        <div className="mb-6 flex gap-2">
          {transitions.map((t) => (
            <button
              key={t.action}
              onClick={() => setDialog(t)}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Capacity */}
      {c && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          <StatCard
            label="Lane (m)"
            value={`${c.lane_meters_reserved + c.lane_meters_confirmed} / ${v.operational_lane_meters}`}
            subtitle={`Rez: ${c.lane_meters_reserved} | Onay: ${c.lane_meters_confirmed}`}
          />
          <StatCard
            label="m²"
            value={`${c.m2_reserved + c.m2_confirmed} / ${v.operational_m2}`}
            subtitle={`Rez: ${c.m2_reserved} | Onay: ${c.m2_confirmed}`}
          />
          <StatCard
            label="Yolcu"
            value={`${c.passengers_reserved + c.passengers_confirmed} / ${v.operational_passenger_capacity}`}
            subtitle={`Rez: ${c.passengers_reserved} | Onay: ${c.passengers_confirmed}`}
          />
        </div>
      )}

      {/* Cabin Inventory */}
      {cabinInventory.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">Kabin Envanter</h2>
          <div className="overflow-x-auto rounded border">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs">
                <tr>
                  <th className="px-4 py-2">Kabin Tipi</th>
                  <th className="px-4 py-2">Toplam</th>
                  <th className="px-4 py-2">Rezerve</th>
                  <th className="px-4 py-2">Onaylı</th>
                  <th className="px-4 py-2">Musait</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {cabinInventory.map((ci) => (
                  <tr key={ci.cabin_type_id}>
                    <td className="px-4 py-2 font-mono text-xs">{ci.cabin_type_id.slice(0, 8)}</td>
                    <td className="px-4 py-2">{ci.total_count}</td>
                    <td className="px-4 py-2">{ci.reserved_count}</td>
                    <td className="px-4 py-2">{ci.confirmed_count}</td>
                    <td className="px-4 py-2">{ci.total_count - ci.reserved_count - ci.confirmed_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Booking Counts */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard label="Onaylanmis" value={bookingCounts.CONFIRMED} />
        <StatCard label="Check-in" value={bookingCounts.CHECKED_IN} />
        <StatCard label="Iptal" value={bookingCounts.CANCELLED} />
      </div>

      {/* Links */}
      <div className="flex gap-3 text-sm">
        <Link href={`/admin/voyages/${id}/manifest`} className="text-blue-600 hover:underline">Manifest</Link>
        <Link href={`/admin/voyages/${id}/revenue`} className="text-blue-600 hover:underline">Gelir</Link>
        <Link href={`/admin/reconciliation/${id}`} className="text-blue-600 hover:underline">Mutabakat</Link>
      </div>

      {/* Confirm Dialog */}
      {dialog && (
        <ConfirmDialog
          open
          title={dialog.label}
          message={dialog.confirm}
          onConfirm={() => handleLifecycle(dialog.action)}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  );
}
