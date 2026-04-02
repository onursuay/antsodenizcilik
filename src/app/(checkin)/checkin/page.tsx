"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckinLookup } from "@/components/domain/checkin-lookup";

export default function CheckinScanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLookup(bookingId: string) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/checkin/lookup?bookingId=${encodeURIComponent(bookingId)}`
      );
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? `Hata: ${res.status}`);
        return;
      }

      const booking = json.booking as { status: string };

      if (booking.status === "CANCELLED") {
        setError("Bu rezervasyon iptal edilmis.");
        return;
      }

      router.push(`/checkin/${bookingId}`);
    } catch {
      setError("Arama sirasinda hata olustu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Check-in</h1>
      <CheckinLookup
        onLookup={handleLookup}
        loading={loading}
        error={error}
      />
    </div>
  );
}
