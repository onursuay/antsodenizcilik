"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import { ItemBuilder, type HoldItemOutput } from "@/components/domain/item-builder";
import { generateIdempotencyKey } from "@/lib/utils/idempotency";

interface VoyageDetail {
  voyage: {
    voyage_id: string;
    origin_port: string;
    destination_port: string;
    departure_utc: string;
    status: string;
  };
  cabinInventory: Array<{
    cabin_type_id: string;
    total_count: number;
    reserved_count: number;
    confirmed_count: number;
  }>;
}

interface HoldResponse {
  holdId: string;
  expiresAt: string;
}

const MAX_RETRIES = 3;
const BASE_DELAY = 150;

export default function BookingWizardPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const voyageId = params.id;

  const { data, loading: voyageLoading, error: voyageError } = useApi<VoyageDetail>(
    `/api/voyages/${voyageId}`
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(items: HoldItemOutput[]) {
    setError(null);
    setSubmitting(true);

    const idempotencyKey = generateIdempotencyKey();

    try {
      const result = await createHoldWithRetry(voyageId, items, idempotencyKey);
      router.push(`/holds/${result.holdId}/pay`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Rezervasyon olusturulamadi";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (voyageLoading) {
    return <p className="text-sm text-gray-500">Yukleniyor...</p>;
  }

  if (voyageError || !data) {
    return <p className="text-sm text-red-600">{voyageError ?? "Sefer bulunamadi."}</p>;
  }

  if (data.voyage.status !== "OPEN") {
    return (
      <div>
        <h1 className="text-2xl font-bold">Rezervasyon</h1>
        <p className="mt-2 text-sm text-red-600">Bu sefer rezervasyona kapali.</p>
      </div>
    );
  }

  const cabinTypes = data.cabinInventory.map((ci) => ({
    cabin_type_id: ci.cabin_type_id,
    label: ci.cabin_type_id.slice(0, 8),
    available: ci.total_count - ci.reserved_count - ci.confirmed_count,
  }));

  return (
    <div className="max-w-lg">
      <h1 className="mb-1 text-2xl font-bold">Rezervasyon</h1>
      <p className="mb-6 text-sm text-gray-500">
        {data.voyage.origin_port} → {data.voyage.destination_port} ·{" "}
        {new Date(data.voyage.departure_utc).toLocaleDateString("tr-TR")}
      </p>

      <ItemBuilder
        cabinTypes={cabinTypes}
        onSubmit={handleSubmit}
        loading={submitting}
        error={error}
      />
    </div>
  );
}

async function createHoldWithRetry(
  voyageId: string,
  items: HoldItemOutput[],
  idempotencyKey: string
): Promise<HoldResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch("/api/holds", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({ voyageId, items }),
    });

    const json = await res.json();

    if (res.ok) {
      return json as HoldResponse;
    }

    // Lock contention — retry with backoff
    if (res.status === 409 && json.code === "lock_contention") {
      lastError = new Error(json.error ?? "Sistem mesgul, tekrar deneniyor...");
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
    }

    // Non-retryable error
    throw new Error(json.error ?? `Hata: ${res.status}`);
  }

  throw lastError ?? new Error("Rezervasyon olusturulamadi");
}
