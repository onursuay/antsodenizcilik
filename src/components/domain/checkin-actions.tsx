"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";

interface Passenger {
  booking_passenger_id: string;
  full_name: string;
  document_type: string;
  document_number: string;
  nationality: string;
  cancelled_at: string | null;
}

interface Vehicle {
  booking_vehicle_id: string;
  plate_number: string;
  vehicle_type: string;
  cancelled_at: string | null;
}

interface CheckinActionsProps {
  bookingId: string;
  bookingStatus: string;
  passengers: Passenger[];
  vehicles: Vehicle[];
  onApprove: (documentVerified: boolean) => void;
  onDeny: (reason: string) => void;
  loading?: boolean;
  error?: string | null;
}

export function CheckinActions({
  bookingId,
  bookingStatus,
  passengers,
  vehicles,
  onApprove,
  onDeny,
  loading,
  error,
}: CheckinActionsProps) {
  const [docVerified, setDocVerified] = useState(false);
  const [showDeny, setShowDeny] = useState(false);
  const [denyReason, setDenyReason] = useState("");

  const isCancelled = bookingStatus === "CANCELLED";
  const isCheckedIn = bookingStatus === "CHECKED_IN";
  const activePassengers = passengers.filter((p) => !p.cancelled_at);
  const activeVehicles = vehicles.filter((v) => !v.cancelled_at);

  return (
    <div className="space-y-4">
      {/* Booking Info */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm">{bookingId.slice(0, 8)}...</span>
        <StatusBadge status={bookingStatus} />
      </div>

      {/* Passenger Summary */}
      {activePassengers.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold">Yolcular ({activePassengers.length})</h3>
          <div className="space-y-1">
            {activePassengers.map((p) => (
              <div key={p.booking_passenger_id} className="rounded border px-3 py-2 text-sm">
                <span className="font-medium">{p.full_name}</span>
                <span className="ml-2 text-gray-500">{p.document_type} {p.document_number}</span>
                <span className="ml-2 text-gray-400">{p.nationality}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vehicle Summary */}
      {activeVehicles.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold">Araclar ({activeVehicles.length})</h3>
          <div className="space-y-1">
            {activeVehicles.map((v) => (
              <div key={v.booking_vehicle_id} className="rounded border px-3 py-2 text-sm">
                <span className="font-medium">{v.plate_number}</span>
                <span className="ml-2 text-gray-500">{v.vehicle_type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Messages */}
      {isCancelled && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-600">
          Bu rezervasyon iptal edilmis. Check-in yapilamaz.
        </div>
      )}

      {isCheckedIn && (
        <div className="rounded bg-blue-50 p-3 text-sm text-blue-600">
          Bu yolcu zaten check-in yapmis.
        </div>
      )}

      {error && (
        <div className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</div>
      )}

      {/* Actions */}
      {!isCancelled && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={docVerified}
              onChange={(e) => setDocVerified(e.target.checked)}
              disabled={loading}
            />
            Belgeler dogrulandi
          </label>

          <div className="flex gap-2">
            <button
              onClick={() => onApprove(docVerified)}
              disabled={loading || !docVerified}
              className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Isleniyor..." : "Onayla"}
            </button>
            <button
              onClick={() => setShowDeny(true)}
              disabled={loading}
              className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
            >
              Reddet
            </button>
          </div>

          {showDeny && (
            <div className="rounded border p-3">
              <textarea
                value={denyReason}
                onChange={(e) => setDenyReason(e.target.value)}
                placeholder="Red sebebi..."
                className="mb-2 w-full rounded border px-3 py-2 text-sm"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (denyReason.trim()) onDeny(denyReason.trim());
                  }}
                  disabled={loading || !denyReason.trim()}
                  className="rounded bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                >
                  Reddi Onayla
                </button>
                <button
                  onClick={() => { setShowDeny(false); setDenyReason(""); }}
                  className="rounded border px-3 py-1.5 text-sm"
                >
                  Vazgec
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
