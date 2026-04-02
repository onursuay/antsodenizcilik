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

type CancelTarget =
  | { scope: "FULL" }
  | {
      scope: "PARTIAL";
      partialTargetType: "PASSENGER" | "VEHICLE" | "CABIN";
      partialTargetId: string;
      label: string;
    };

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const bookingId = params.id;
  const { data, loading, error, refetch } = useApi<BookingDetail>(`/api/bookings/${bookingId}`);

  const [cancelTarget, setCancelTarget] = useState<CancelTarget | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function handleCancel() {
    if (!cancelTarget || !data) return;
    setCancelError(null);

    const body: Record<string, unknown> = {
      scope: cancelTarget.scope,
      initiatedBy: "user",
      refundAmountKurus:
        cancelTarget.scope === "FULL" ? (data.payment?.amount_kurus ?? 0) : 0,
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
      if (!res.ok) throw new Error(json.error ?? `Hata: ${res.status}`);

      setCancelTarget(null);
      refetch();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "İptal işlemi başarısız");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <svg className="h-5 w-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-red-600">{error ?? "Rezervasyon bulunamadı."}</p>
      </div>
    );
  }

  const { booking, passengers, vehicles, cabins, payment, refunds } = data;
  const isActive = booking.status !== "CANCELLED";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Rezervasyon Detayı</h1>
              <p className="mt-1 break-all font-mono text-sm text-slate-400">
                {booking.booking_id}
              </p>
            </div>
            <StatusBadge status={booking.status} />
          </div>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-500">
            <span>
              Onaylandı:{" "}
              <span className="font-medium text-slate-700">
                {new Date(booking.confirmed_at).toLocaleString("tr-TR")}
              </span>
            </span>
            {booking.checked_in_at && (
              <span>
                Check-in:{" "}
                <span className="font-medium text-slate-700">
                  {new Date(booking.checked_in_at).toLocaleString("tr-TR")}
                </span>
              </span>
            )}
            {booking.cancelled_at && (
              <span>
                İptal:{" "}
                <span className="font-medium text-red-600">
                  {new Date(booking.cancelled_at).toLocaleString("tr-TR")}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Payment */}
        {payment && (
          <div className="mb-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Ödeme
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {(payment.amount_kurus / 100).toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })}{" "}
                TL
              </p>
            </div>
            <StatusBadge status={payment.status} />
          </div>
        )}

        {/* Cancel error */}
        {cancelError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {cancelError}
          </div>
        )}

        {/* Passengers */}
        {passengers.length > 0 && (
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Yolcular
            </h3>
            <div className="space-y-2">
              {passengers.map((p) => (
                <div
                  key={p.booking_passenger_id}
                  className={`flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 ${
                    p.cancelled_at ? "opacity-50 line-through" : ""
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{p.full_name}</p>
                    <p className="text-xs text-slate-400">
                      {p.document_type} · {p.document_number} · {p.nationality}
                    </p>
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
                      className="ml-4 shrink-0 text-xs font-semibold text-red-500 transition hover:text-red-700"
                    >
                      İptal
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vehicles */}
        {vehicles.length > 0 && (
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Araçlar
            </h3>
            <div className="space-y-2">
              {vehicles.map((v) => (
                <div
                  key={v.booking_vehicle_id}
                  className={`flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 ${
                    v.cancelled_at ? "opacity-50 line-through" : ""
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{v.plate_number}</p>
                    <p className="text-xs text-slate-400">
                      {v.vehicle_type} · {v.lane_meters_allocated}m · {v.m2_allocated}m²
                    </p>
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
                      className="ml-4 shrink-0 text-xs font-semibold text-red-500 transition hover:text-red-700"
                    >
                      İptal
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cabins */}
        {cabins.length > 0 && (
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Kabinler
            </h3>
            <BookingSummary passengers={[]} vehicles={[]} cabins={cabins} />
          </div>
        )}

        {/* Refunds */}
        {refunds.length > 0 && (
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              İadeler
            </h3>
            <RefundTracker refunds={refunds} />
          </div>
        )}

        {/* Full cancel */}
        {isActive && (
          <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
            <p className="mb-3 text-sm text-slate-500">
              Tüm rezervasyonu iptal etmek ödemenin iade sürecini başlatır.
            </p>
            <button
              onClick={() => setCancelTarget({ scope: "FULL" })}
              className="rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            >
              Tüm Rezervasyonu İptal Et
            </button>
          </div>
        )}

        {/* Confirm dialog */}
        {cancelTarget && (
          <ConfirmDialog
            open={true}
            title={
              cancelTarget.scope === "FULL"
                ? "Rezervasyonu İptal Et"
                : `İptal: ${(cancelTarget as { label: string }).label}`
            }
            message={
              cancelTarget.scope === "FULL"
                ? "Bu işlem geri alınamaz. Tüm rezervasyon iptal edilecek ve iade işlemi başlatılacaktır."
                : "Bu öğeyi iptal etmek istediğinizden emin misiniz?"
            }
            confirmLabel="İptal Et"
            onConfirm={handleCancel}
            onCancel={() => setCancelTarget(null)}
          />
        )}
      </div>
    </div>
  );
}
