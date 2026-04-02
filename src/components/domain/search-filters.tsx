"use client";

import { useState } from "react";

export interface FilterParams {
  origin?: string;
  destination?: string;
  from?: string;
  to?: string;
}

interface SearchFiltersProps {
  onFilter: (params: FilterParams) => void;
}

export function SearchFilters({ onFilter }: SearchFiltersProps) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onFilter({
      origin: origin || undefined,
      destination: destination || undefined,
      from: from || undefined,
      to: to || undefined,
    });
  }

  function handleClear() {
    setOrigin("");
    setDestination("");
    setFrom("");
    setTo("");
    onFilter({});
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-xs font-medium text-gray-500">Kalkis</label>
        <input
          type="text"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          placeholder="Liman"
          className="mt-1 w-36 rounded border px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500">Varis</label>
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Liman"
          className="mt-1 w-36 rounded border px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500">Baslangic</label>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="mt-1 rounded border px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500">Bitis</label>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="mt-1 rounded border px-2 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
      >
        Ara
      </button>
      <button
        type="button"
        onClick={handleClear}
        className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
      >
        Temizle
      </button>
    </form>
  );
}
