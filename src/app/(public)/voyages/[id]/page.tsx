"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import { StatCard } from "@/components/ui/stat-card";

interface VoyageDetail {
  voyage: {
    voyage_id: string;
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
}

export default function VoyageDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, loading, error } = useApi<VoyageDetail>(
    `/api/voyages/${params.id}`
  );

  if (loading) {
    return <p className="text-sm text-gray-500">Yukleniyor...</p>;
  }

  if (error || !data) {
    return <p className="text-sm text-red-600">{error ?? "Sefer bulunamadi."}</p>;
  }

  const { voyage: v, capacityCounters: c, cabinInventory } = data;
  const paxUsed = c ? c.passengers_reserved + c.passengers_confirmed : 0;
  const paxTotal = v.operational_passenger_capacity + v.overbooking_delta;
  const laneUsed = c ? c.lane_meters_reserved + c.lane_meters_confirmed : 0;
  const m2Used = c ? c.m2_reserved + c.m2_confirmed : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold">
        {v.origin_port} → {v.destination_port}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        {new Date(v.departure_utc).toLocaleDateString("tr-TR")}{" "}
        {new Date(v.departure_utc).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
        {" — "}
        {new Date(v.arrival_utc).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
      </p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <StatCard
          label="Yolcu"
          value={`${paxTotal - paxUsed} musait`}
          subtitle={`${paxUsed} / ${paxTotal} dolu`}
        />
        <StatCard
          label="Lane (m)"
          value={`${(v.operational_lane_meters - laneUsed).toFixed(1)} musait`}
          subtitle={`${laneUsed.toFixed(1)} / ${v.operational_lane_meters} dolu`}
        />
        <StatCard
          label="m²"
          value={`${(v.operational_m2 - m2Used).toFixed(1)} musait`}
          subtitle={`${m2Used.toFixed(1)} / ${v.operational_m2} dolu`}
        />
      </div>

      {cabinInventory.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-lg font-semibold">Kabin Durumu</h2>
          <div className="overflow-x-auto rounded border">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs">
                <tr>
                  <th className="px-4 py-2">Tip</th>
                  <th className="px-4 py-2">Toplam</th>
                  <th className="px-4 py-2">Musait</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {cabinInventory.map((ci) => (
                  <tr key={ci.cabin_type_id}>
                    <td className="px-4 py-2 font-mono text-xs">{ci.cabin_type_id.slice(0, 8)}</td>
                    <td className="px-4 py-2">{ci.total_count}</td>
                    <td className="px-4 py-2">{ci.total_count - ci.reserved_count - ci.confirmed_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {v.status === "OPEN" && (
        <div className="mt-6">
          <Link
            href={`/voyages/${v.voyage_id}/book`}
            className="inline-block rounded bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Rezervasyon Yap
          </Link>
        </div>
      )}
    </div>
  );
}
