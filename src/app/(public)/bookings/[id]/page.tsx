"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import { BookingSummary } from "@/components/domain/booking-summary";
import { RefundTracker } from "@/components/domain/refund-tracker";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/ui/status-badge";

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

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(amountKurus: number) {
  return (amountKurus / 100).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

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
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? `Hata: ${response.status}`);
      }

      setCancelTarget(null);
      refetch();
    } catch (requestError) {
      setCancelError(
        requestError instanceof Error ? requestError.message : "İptal işlemi başarısız"
      );
    }
  }

  if (loading) {
    return (
      <div className="antso-shell antso-page-space">
        <div className="grid antso-box-gap lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-48 animate-pulse rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl antso-page-space">
        <div className="rounded-[32px] border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
          {error ?? "Rezervasyon bulunamadı."}
        </div>
      </div>
    );
  }

  const { booking, passengers, vehicles, cabins, payment, refunds, cancellations } = data;
  const isActive = booking.status !== "CANCELLED";

  return (
    <div className="antso-page-bottom">
      <section className="relative overflow-hidden bg-brand-ink text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(60,146,183,0.24),transparent_30%),radial-gradient(circle_at_right,rgba(209,162,77,0.14),transparent_24%)]" />
        <div className="relative antso-section-shell">
          <div className="grid antso-box-gap xl:grid-cols-[1.08fr_0.92fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-brand-seafoam">Rezervasyon detayı</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Rezervasyonunuzun son durumu burada
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/70">
                Yolcu, araç, kabin, ödeme ve iade süreçlerini aynı ekranda görüntüleyebilir, uygun
                durumlarda iptal işlemi başlatabilirsiniz.
              </p>

              <div className="mt-8 grid antso-box-gap sm:grid-cols-3">
                <StatCard title="Yolcu" value={`${passengers.length}`} />
                <StatCard title="Araç" value={`${vehicles.length}`} />
                <StatCard title="Kabin" value={`${cabins.length}`} />
              </div>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_30px_90px_rgba(16,37,61,0.24)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-brand-seafoam">Rezervasyon no</p>
                  <p className="mt-3 break-all text-lg font-semibold text-white">{booking.booking_id}</p>
                </div>
                <StatusBadge status={booking.status} />
              </div>

              <div className="mt-6 antso-box-stack">
                <SummaryRow label="Onaylandı" value={formatDate(booking.confirmed_at)} />
                {booking.checked_in_at && (
                  <SummaryRow label="Check-in" value={formatDate(booking.checked_in_at)} />
                )}
                {booking.cancelled_at && (
                  <SummaryRow label="İptal" value={formatDate(booking.cancelled_at)} />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="antso-overlap-shell">
        {cancelError && (
          <div className="mb-6 rounded-[24px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {cancelError}
          </div>
        )}

        <div className="grid antso-box-gap xl:grid-cols-[1.08fr_0.92fr]">
          <div className="antso-box-stack">
            {payment && (
              <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-brand-ocean/60">Ödeme</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">
                      {formatPrice(payment.amount_kurus)} TL
                    </p>
                  </div>
                  <StatusBadge status={payment.status} />
                </div>
              </div>
            )}

            {passengers.length > 0 && (
              <SectionCard title="Yolcular" description="Rezervasyona bağlı yolcu kayıtları">
                <div className="antso-box-stack">
                  {passengers.map((passenger) => (
                    <EntityRow
                      key={passenger.booking_passenger_id}
                      title={passenger.full_name}
                      meta={`${passenger.document_type} · ${passenger.document_number} · ${passenger.nationality}`}
                      muted={Boolean(passenger.cancelled_at)}
                      action={
                        isActive && !passenger.cancelled_at ? (
                          <button
                            type="button"
                            onClick={() =>
                              setCancelTarget({
                                scope: "PARTIAL",
                                partialTargetType: "PASSENGER",
                                partialTargetId: passenger.booking_passenger_id,
                                label: passenger.full_name,
                              })
                            }
                            className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                          >
                            İptal et
                          </button>
                        ) : null
                      }
                    />
                  ))}
                </div>
              </SectionCard>
            )}

            {vehicles.length > 0 && (
              <SectionCard title="Araçlar" description="Rezervasyona bağlı araç kayıtları">
                <div className="antso-box-stack">
                  {vehicles.map((vehicle) => (
                    <EntityRow
                      key={vehicle.booking_vehicle_id}
                      title={vehicle.plate_number}
                      meta={`${vehicle.vehicle_type} · ${vehicle.lane_meters_allocated} m · ${vehicle.m2_allocated} m²`}
                      muted={Boolean(vehicle.cancelled_at)}
                      action={
                        isActive && !vehicle.cancelled_at ? (
                          <button
                            type="button"
                            onClick={() =>
                              setCancelTarget({
                                scope: "PARTIAL",
                                partialTargetType: "VEHICLE",
                                partialTargetId: vehicle.booking_vehicle_id,
                                label: vehicle.plate_number,
                              })
                            }
                            className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                          >
                            İptal et
                          </button>
                        ) : null
                      }
                    />
                  ))}
                </div>
              </SectionCard>
            )}

            {cabins.length > 0 && (
              <SectionCard title="Kabinler" description="Kabin tahsis detayları">
                <BookingSummary passengers={[]} vehicles={[]} cabins={cabins} />
              </SectionCard>
            )}

            {refunds.length > 0 && (
              <SectionCard title="İadeler" description="İade kayıtları ve durumları">
                <RefundTracker refunds={refunds} />
              </SectionCard>
            )}
          </div>

          <div className="antso-box-stack">
            <div className="rounded-[32px] bg-brand-ink p-6 text-white shadow-[0_30px_90px_rgba(16,37,61,0.24)]">
              <p className="text-xs uppercase tracking-[0.24em] text-brand-seafoam">Özet</p>
              <div className="mt-5 antso-box-stack">
                <SummaryRow label="Rezervasyon durumu" value={booking.status} />
                <SummaryRow label="Voyage ID" value={booking.voyage_id} />
                {payment && <SummaryRow label="Ödeme" value={`${formatPrice(payment.amount_kurus)} TL`} />}
              </div>
            </div>

            {cancellations.length > 0 && (
              <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                <p className="text-xs uppercase tracking-[0.24em] text-brand-ocean/60">İşlem geçmişi</p>
                <div className="mt-5 antso-box-stack">
                  {cancellations.map((cancellation) => (
                    <div
                      key={cancellation.cancellation_record_id}
                      className="rounded-2xl bg-slate-50 px-4 py-3"
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {cancellation.scope === "FULL" ? "Tam rezervasyon iptali" : "Kısmi iptal"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">{formatDate(cancellation.initiated_at)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isActive && (
              <div className="rounded-[32px] border border-red-100 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                <p className="text-xs uppercase tracking-[0.24em] text-red-500/80">İptal işlemleri</p>
                <h2 className="mt-3 text-xl font-semibold text-slate-900">Rezervasyonu iptal et</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Tüm rezervasyonu iptal etmek, ödeme için iade sürecinin başlatılmasına neden olur.
                </p>
                <button
                  type="button"
                  onClick={() => setCancelTarget({ scope: "FULL" })}
                  className="mt-5 inline-flex items-center rounded-full border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                >
                  Tüm rezervasyonu iptal et
                </button>
              </div>
            )}
          </div>
        </div>

        {cancelTarget && (
          <ConfirmDialog
            open={true}
            title={
              cancelTarget.scope === "FULL"
                ? "Rezervasyonu iptal et"
                : `İptal: ${(cancelTarget as { label: string }).label}`
            }
            message={
              cancelTarget.scope === "FULL"
                ? "Bu işlem geri alınamaz. Rezervasyon iptal edilir ve iade süreci başlatılır."
                : "Bu öğeyi iptal etmek istediğinizden emin misiniz?"
            }
            confirmLabel="İptali onayla"
            onConfirm={handleCancel}
            onCancel={() => setCancelTarget(null)}
          />
        )}
      </section>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.05] px-5 py-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-white/42">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.05] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.2em] text-white/42">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <p className="text-xs uppercase tracking-[0.24em] text-brand-ocean/60">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function EntityRow({
  title,
  meta,
  muted,
  action,
}: {
  title: string;
  meta: string;
  muted?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col gap-4 rounded-[26px] border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between ${
        muted ? "opacity-55" : ""
      }`}
    >
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${muted ? "line-through text-slate-500" : "text-slate-900"}`}>
          {title}
        </p>
        <p className="mt-1 text-sm text-slate-500">{meta}</p>
      </div>
      {action}
    </div>
  );
}
