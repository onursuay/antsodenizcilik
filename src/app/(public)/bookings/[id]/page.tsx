"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import { BookingSummary } from "@/components/domain/booking-summary";
import { RefundTracker } from "@/components/domain/refund-tracker";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface BookingDetail {
  booking: {
    booking_id: string;
    voyage_id: string;
    status: string;
    confirmed_at: string;
    cancelled_at: string | null;
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
    length_cm: number;
    width_cm: number;
    height_cm: number;
    weight_kg: number;
    lane_meters_allocated: number;
    m2_allocated: number;
    cancelled_at: string | null;
  }>;
  cabins: Array<{
    booking_cabin_id: string;
    cabin_type_id: string;
    count_allocated: number;
    cancelled_at: string | null;
  }>;
  payment: {
    payment_id: string;
    status: string;
    amount_kurus: number;
  } | null;
  refunds: Array<{
    refund_id: string;
    status: string;
    amount_kurus: number;
    queued_at: string;
    confirmed_at: string | null;
  }>;
  cancellations: Array<{
    cancellation_record_id: string;
    scope: string;
    partial_target_type: string | null;
    partial_target_id: string | null;
    initiated_at: string;
  }>;
}

type CancelTarget = {
  scope: "FULL";
} | {
  scope: "PARTIAL";
  partialTargetType: "PASSENGER" | "VEHICLE" | "CABIN";
  partialTargetId: string;
  label: string;
};

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const bookingId = params.id;
  const { data, loading, error, refetch } = useApi<BookingDetail>(
    `/api/bookings/${bookingId}`
  );

  const [cancelTarget, setCancelTarget] = useState<CancelTarget | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function handleCancel() {
    if (!cancelTarget || !data) return;
    setCancelError(null);

    const body: Record<string, unknown> = {
      scope: cancelTarget.scope,
      initiatedBy: "user",
      refundAmountKurus: cancelTarget.scope === "FULL" ? (data.payment?.amount_kurus ?? 0) : 0,
    };

    if (cancelTarget.scope === "PARTIAL") {
      body.partialTargetType = cancelTarget.partialTargetType;
      body.partialTargetId = cancelTarget.partialTargetId;
    }

    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? `Hata: ${res.status}`);
      }

      setCancelTarget(null);
      refetch();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Iptal islemi basarisiz");
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Yukleniyor...</p>;
  if (error || !data) return <p className="text-sm text-red-600">{error ?? "Rezervasyon bulunamadi."}</p>;

  const { booking, passengers, vehicles, cabins, payment, refunds, cancellations } = data;
  const isActive = booking.status !== "CANCELLED";

  return (
    <div className="max-w-lg">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-2xl font-bold">Rezervasyon</h1>
        <StatusBadge status={booking.status} />
      </div>

      <div className="mb-4 text-sm text-gray-500">
        <p>ID: <span className="font-mono">{booking.booking_id}</span></p>
        <p>Onay: {new Date(booking.confirmed_at).toLocaleString("tr-TR")}</p>
        {booking.checked_in_at && (
          <p>Check-in: {new Date(booking.checked_in_at).toLocaleString("tr-TR")}</p>
        )}
        {booking.cancelled_at && (
          <p>Iptal: {new Date(booking.cancelled_at).toLocaleString("tr-TR")}</p>
        )}
      </div>

      {/* Payment */}
      {payment && (
        <div className="mb-4 flex items-center justify-between rounded border p-3 text-sm">
          <span>Odeme</span>
          <div className="flex items-center gap-2">
            <span>
              {(payment.amount_kurus / 100).toLocaleString("tr-TR", {
                minimumFractionDigits: 2,
              })}{" "}
              TL
            </span>
            <StatusBadge status={payment.status} />
          </div>
        </div>
      )}

      {/* Full Cancel Button */}
      {isActive && (
        <button
          onClick={() => setCancelTarget({ scope: "FULL" })}
          className="mb-6 rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
        >
          Tum Rezervasyonu Iptal Et
        </button>
      )}

      {/* Passengers with per-line cancel */}
      {passengers.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-1 text-sm font-semibold">
            Yolcular ({passengers.filter((p) => !p.cancelled_at).length})
          </h3>
          {passengers.map((p) => (
            <div
              key={p.booking_passenger_id}
              className={`flex items-center justify-between rounded border px-3 py-2 text-sm mb-1 ${
                p.cancelled_at ? "bg-gray-50 text-gray-400 line-through" : ""
              }`}
            >
              <div>
                <span className="font-medium">{p.full_name}</span>
                <span className="ml-2 text-gray-500">{p.document_type} {p.document_number}</span>
              </div>
              {isActive && !p.cancelled_at && (
                <button
                  onClick={() =>
                    setCancelTarget({
                      scope: "PARTIAL",
                      partialTargetType: "PASSENGER",
                      partialTargetId: p.booking_passenger_id,
                      label: p.full_name,
                    })
                  }
                  className="text-xs text-red-500 hover:underline"
                >
                  Iptal
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Vehicles with per-line cancel */}
      {vehicles.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-1 text-sm font-semibold">
            Araclar ({vehicles.filter((v) => !v.cancelled_at).length})
          </h3>
          {vehicles.map((v) => (
            <div
              key={v.booking_vehicle_id}
              className={`flex items-center justify-between rounded border px-3 py-2 text-sm mb-1 ${
                v.cancelled_at ? "bg-gray-50 text-gray-400 line-through" : ""
              }`}
            >
              <div>
                <span className="font-medium">{v.plate_number}</span>
                <span className="ml-2 text-gray-500">{v.vehicle_type}</span>
                <span className="ml-2 text-gray-400">{v.lane_meters_allocated}m · {v.m2_allocated}m²</span>
              </div>
              {isActive && !v.cancelled_at && (
                <button
                  onClick={() =>
                    setCancelTarget({
                      scope: "PARTIAL",
                      partialTargetType: "VEHICLE",
                      partialTargetId: v.booking_vehicle_id,
                      label: v.plate_number,
                    })
                  }
                  className="text-xs text-red-500 hover:underline"
                >
                  Iptal
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cabins with per-line cancel */}
      {cabins.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-1 text-sm font-semibold">
            Kabinler ({cabins.filter((c) => !c.cancelled_at).length})
          </h3>
          {cabins.map((c) => (
            <div
              key={c.booking_cabin_id}
              className={`flex items-center justify-between rounded border px-3 py-2 text-sm mb-1 ${
                c.cancelled_at ? "bg-gray-50 text-gray-400 line-through" : ""
              }`}
            >
              <div>
                <span className="font-mono text-xs">{c.cabin_type_id.slice(0, 8)}</span>
                <span className="ml-2">× {c.count_allocated}</span>
              </div>
              {isActive && !c.cancelled_at && (
                <button
                  onClick={() =>
                    setCancelTarget({
                      scope: "PARTIAL",
                      partialTargetType: "CABIN",
                      partialTargetId: c.booking_cabin_id,
                      label: c.cabin_type_id.slice(0, 8),
                    })
                  }
                  className="text-xs text-red-500 hover:underline"
                >
                  Iptal
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Refund Tracker */}
      {refunds.length > 0 && (
        <div className="mb-4">
          <RefundTracker refunds={refunds} />
        </div>
      )}

      {/* Cancellation Records */}
      {cancellations.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-1 text-sm font-semibold">Iptal Gecmisi</h3>
          <div className="space-y-1">
            {cancellations.map((cr) => (
              <div key={cr.cancellation_record_id} className="rounded border px-3 py-2 text-xs text-gray-500">
                <span className="font-medium">{cr.scope}</span>
                {cr.partial_target_type && (
                  <span> · {cr.partial_target_type} {cr.partial_target_id?.slice(0, 8)}</span>
                )}
                <span> · {new Date(cr.initiated_at).toLocaleString("tr-TR")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      {cancelTarget && (
        <ConfirmDialog
          open
          title={cancelTarget.scope === "FULL" ? "Tam Iptal" : "Kismi Iptal"}
          message={
            cancelTarget.scope === "FULL"
              ? "Tum rezervasyon iptal edilecek ve iade sureci baslatilacak. Devam edilsin mi?"
              : `"${cancelTarget.label}" iptal edilecek. Devam edilsin mi?`
          }
          confirmLabel="Iptal Et"
          onConfirm={handleCancel}
          onCancel={() => { setCancelTarget(null); setCancelError(null); }}
        />
      )}

      {cancelError && (
        <div className="mt-2 rounded bg-red-50 p-2 text-sm text-red-600">
          {cancelError}
        </div>
      )}
    </div>
  );
}
