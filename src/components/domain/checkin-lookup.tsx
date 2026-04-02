"use client";

import { useState } from "react";
import { QRScanner } from "./qr-scanner";

interface CheckinLookupProps {
  onLookup: (bookingId: string) => void;
  loading?: boolean;
  error?: string | null;
}

export function CheckinLookup({ onLookup, loading, error }: CheckinLookupProps) {
  const [bookingId, setBookingId] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = bookingId.trim();
    if (trimmed) onLookup(trimmed);
  }

  function handleScan(value: string) {
    setShowScanner(false);
    setBookingId(value);
    onLookup(value);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={bookingId}
          onChange={(e) => setBookingId(e.target.value)}
          placeholder="Rezervasyon ID"
          className="flex-1 rounded border px-3 py-2 text-sm font-mono"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !bookingId.trim()}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Araniyor..." : "Ara"}
        </button>
        <button
          type="button"
          onClick={() => setShowScanner(!showScanner)}
          className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
        >
          {showScanner ? "Kapat" : "QR Tara"}
        </button>
      </form>

      {error && (
        <div className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</div>
      )}

      {showScanner && (
        <QRScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
