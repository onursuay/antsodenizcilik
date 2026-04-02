"use client";

import { useState } from "react";

export default function HomePage() {
  const [tab, setTab] = useState<"bilet" | "seferler">("bilet");

  return (
    <div>
      {/* Tab Buttons */}
      <div className="mb-6 flex gap-1 rounded-lg border p-1">
        <button
          onClick={() => setTab("bilet")}
          className={`flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === "bilet"
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          Online Bilet Al
        </button>
        <button
          onClick={() => setTab("seferler")}
          className={`flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === "seferler"
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          Sefer Sorgula
        </button>
      </div>

      {/* Bilet Tab — Akgunler iframe */}
      {tab === "bilet" && (
        <div>
          <div className="mb-3 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
            Anamur - Girne arasi feribot biletinizi hemen satin alabilirsiniz.
          </div>
          <div className="overflow-hidden rounded-lg border">
            <iframe
              src="https://www.akgunlerbilet.com/antso/online_bilet.php"
              width="100%"
              height="700"
              style={{ border: "none", minHeight: "700px" }}
              title="Akgunler Online Bilet"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Seferler Tab — kendi sistemimiz */}
      {tab === "seferler" && <SeferSorgula />}
    </div>
  );
}

function SeferSorgula() {
  // Dynamic import to avoid loading voyage components when on bilet tab
  const { useState: useLocalState } = require("react");
  const { useRouter } = require("next/navigation");
  const { SearchFilters } = require("@/components/domain/search-filters");
  const { VoyageCard } = require("@/components/domain/voyage-card");
  const { useApi } = require("@/hooks/use-api");

  const router = useRouter();
  const [filters, setFilters] = useLocalState({});

  const buildUrl = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    if (params.origin) sp.set("origin", params.origin);
    if (params.destination) sp.set("destination", params.destination);
    if (params.from) sp.set("from", params.from);
    if (params.to) sp.set("to", params.to);
    const qs = sp.toString();
    return `/api/voyages${qs ? `?${qs}` : ""}`;
  };

  const { data, loading, error } = useApi(buildUrl(filters));
  const voyages = (data as { voyages?: Array<{
    voyage_id: string;
    origin_port: string;
    destination_port: string;
    departure_utc: string;
    arrival_utc: string;
    capacity: { passengers_available: number | null };
  }> })?.voyages ?? [];

  return (
    <div>
      <div className="mb-6">
        <SearchFilters onFilter={setFilters} />
      </div>

      {loading && <p className="text-sm text-gray-500">Yukleniyor...</p>}
      {error && <p className="text-sm text-red-600">{error as string}</p>}

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
