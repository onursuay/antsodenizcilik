"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchFilters, type FilterParams } from "@/components/domain/search-filters";
import { VoyageCard } from "@/components/domain/voyage-card";
import { useApi } from "@/hooks/use-api";

interface VoyageRow {
  voyage_id: string;
  origin_port: string;
  destination_port: string;
  departure_utc: string;
  arrival_utc: string;
  capacity: {
    lane_meters_available: number | null;
    m2_available: number | null;
    passengers_available: number | null;
  };
}

function buildUrl(params: FilterParams): string {
  const sp = new URLSearchParams();
  if (params.origin) sp.set("origin", params.origin);
  if (params.destination) sp.set("destination", params.destination);
  if (params.from) sp.set("from", params.from);
  if (params.to) sp.set("to", params.to);
  const qs = sp.toString();
  return `/api/voyages${qs ? `?${qs}` : ""}`;
}

export default function VoyageSearchPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<FilterParams>({});
  const { data, loading, error } = useApi<{ voyages: VoyageRow[] }>(
    buildUrl(filters)
  );

  const voyages = data?.voyages ?? [];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Seferler</h1>

      <div className="mb-6">
        <SearchFilters onFilter={setFilters} />
      </div>

      {loading && <p className="text-sm text-gray-500">Yukleniyor...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && voyages.length === 0 && (
        <p className="text-sm text-gray-500">Sefer bulunamadi.</p>
      )}

        <div className="space-y-3">
          {voyages.map((v) => (
            <VoyageCard
              key={v.voyage_id}
              originPort={v.origin_port}
              destinationPort={v.destination_port}
              departureUtc={v.departure_utc}
              arrivalUtc={v.arrival_utc}
              passengersAvailable={v.capacity.passengers_available}
              onClick={() => router.push(`/voyages/${v.voyage_id}`)}
            />
          ))}
        </div>
    </div>
  );
}
