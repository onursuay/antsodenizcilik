"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import { CheckinActions } from "@/components/domain/checkin-actions";
import { CheckinResult } from "@/components/domain/checkin-result";
import { StatusBadge } from "@/components/ui/status-badge";

interface LookupData {
  booking: {
    booking_id: string;
    status: string;
    confirmed_at: string;
    checked_in_at: string | null;
  };
  passengers: Array<{
    booking_passenger_id: string;
    full_name: string;
    document_type: string;
    document_number: string;
    nationality: string;
    cancelled_at: string | null;
  }>;
  vehicles: Array<{
    booking_vehicle_id: string;
    plate_number: string;
    vehicle_type: string;
    cancelled_at: string | null;
  }>;
  checkInHistory: Array<{
    check_in_record_id: string;
    outcome: string;
    operator_id: string;
    document_verified: boolean;
    denial_reason: string | null;
    attempted_at: string;
  }>;
}

interface RecordResult {
  outcome: "APPROVED" | "DENIED";
  denialReason?: string;
  timestamp: string;
}

export default function CheckinApproveDenyPage() {
  const params = useParams<{ bookingId: string }>();
  const bookingId = params.bookingId;

  const { data, loading: lookupLoading, error: lookupError, refetch } =
    useApi<LookupData>(`/api/checkin/lookup?bookingId=${bookingId}`);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [result, setResult] = useState<RecordResult | null>(null);

  async function handleApprove(documentVerified: boolean) {
    setActionLoading(true);
    setActionError(null);

    try {
      const res = await fetch("/api/checkin/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          outcome: "APPROVED",
          documentVerified,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Hata: ${res.status}`);

      setResult({
        outcome: "APPROVED",
        timestamp: new Date().toISOString(),
      });
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Onay basarisiz");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeny(reason: string) {
    setActionLoading(true);
    setActionError(null);

    try {
      const res = await fetch("/api/checkin/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          outcome: "DENIED",
          documentVerified: false,
          denialReason: reason,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Hata: ${res.status}`);

      setResult({
        outcome: "DENIED",
        denialReason: reason,
        timestamp: new Date().toISOString(),
      });
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Red basarisiz");
    } finally {
      setActionLoading(false);
    }
  }

  if (lookupLoading) return <p className="text-sm text-gray-500">Yukleniyor...</p>;
  if (lookupError || !data) return <p className="text-sm text-red-600">{lookupError ?? "Rezervasyon bulunamadi."}</p>;

  // Show result card after action
  if (result) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold">Boarding</h1>
        <CheckinResult
          outcome={result.outcome}
          bookingId={bookingId}
          denialReason={result.denialReason}
          timestamp={result.timestamp}
        />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Boarding</h1>

      <CheckinActions
        bookingId={data.booking.booking_id}
        bookingStatus={data.booking.status}
        passengers={data.passengers}
        vehicles={data.vehicles}
        onApprove={handleApprove}
        onDeny={handleDeny}
        loading={actionLoading}
        error={actionError}
      />

      {/* Previous check-in history */}
      {data.checkInHistory.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold">Onceki Denemeler</h2>
          <div className="space-y-1">
            {data.checkInHistory.map((h) => (
              <div
                key={h.check_in_record_id}
                className="flex items-center justify-between rounded border px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <StatusBadge status={h.outcome} />
                  <span className="text-gray-500">{h.operator_id}</span>
                </div>
                <div className="text-right text-gray-400">
                  {new Date(h.attempted_at).toLocaleString("tr-TR")}
                  {h.denial_reason && (
                    <p className="text-red-400">{h.denial_reason}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
