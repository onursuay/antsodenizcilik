"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import { BookingSummary } from "@/components/domain/booking-summary";
import { QRCodeDisplay } from "@/components/domain/qr-code";
import { StatusBadge } from "@/components/ui/status-badge";

interface BookingDetail {
  booking: {
    booking_id: string;
    voyage_id: string;
    status: string;
    confirmed_at: string;
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
}

export default function ConfirmationPage() {
  const params = useParams<{ id: string }>();
  const bookingId = params.id;
  const { data, loading, error } = useApi<BookingDetail>(`/api/bookings/${bookingId}`);

  if (loading) {
    return (
      <div className="antso-page-space flex items-center justify-center">
        <svg className="h-5 w-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg antso-page-space text-center">
        <p className="text-sm text-red-600">{error ?? "Rezervasyon bulunamadı."}</p>
      </div>
    );
  }

  const { booking, passengers, vehicles, cabins, payment } = data;

  return (
    <div className="min-h-screen bg-slate-50 antso-page-space">
      <div className="mx-auto max-w-xl">
        {/* Success */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Rezervasyon Onaylandı</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            {new Date(booking.confirmed_at).toLocaleString("tr-TR")}
          </p>
        </div>

        {/* Booking reference card */}
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <div className="flex-shrink-0">
              <QRCodeDisplay value={booking.booking_id} size={120} />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Rezervasyon Numarası
              </p>
              <p className="mt-1 font-mono text-sm font-bold tracking-wider text-slate-900 break-all">
                {booking.booking_id}
              </p>
              <div className="mt-2">
                <StatusBadge status={booking.status} />
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Check-in'de bu kodu göstermeniz yeterlidir.
              </p>
            </div>
          </div>
        </div>

        {/* Payment */}
        {payment && (
          <div className="mb-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Ödeme
              </p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {(payment.amount_kurus / 100).toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })}{" "}
                TL
              </p>
            </div>
            <StatusBadge status={payment.status} />
          </div>
        )}

        {/* Booking summary */}
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Rezervasyon Detayı
          </p>
          <BookingSummary passengers={passengers} vehicles={vehicles} cabins={cabins} />
        </div>

        {/* Actions */}
        <div className="flex flex-col antso-box-gap sm:flex-row">
          <Link
            href={`/bookings/${bookingId}`}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-center text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Rezervasyon Detayı
          </Link>
          <Link
            href="/account/bookings"
            className="flex-1 rounded-xl bg-blue-600 py-3 text-center text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
          >
            Tüm Rezervasyonlarım
          </Link>
        </div>
      </div>
    </div>
  );
}
