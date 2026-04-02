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
  const { data, loading, error } = useApi<BookingDetail>(
    `/api/bookings/${bookingId}`
  );

  if (loading) return <p className="text-sm text-gray-500">Yukleniyor...</p>;
  if (error || !data) return <p className="text-sm text-red-600">{error ?? "Rezervasyon bulunamadi."}</p>;

  const { booking, passengers, vehicles, cabins, payment } = data;

  return (
    <div className="max-w-lg">
      <div className="mb-4 rounded-lg bg-green-50 p-4 text-center">
        <p className="text-lg font-semibold text-green-700">Rezervasyon Onaylandi</p>
        <p className="mt-1 text-sm text-green-600">
          {new Date(booking.confirmed_at).toLocaleString("tr-TR")}
        </p>
      </div>

      {/* QR Code */}
      <div className="mb-6 flex justify-center">
        <QRCodeDisplay value={booking.booking_id} size={180} />
      </div>

      <div className="mb-4 text-center text-xs text-gray-400 font-mono">
        {booking.booking_id}
      </div>

      {/* Payment Status */}
      {payment && (
        <div className="mb-6 flex items-center justify-between rounded border p-3 text-sm">
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

      {/* Booking Summary */}
      <BookingSummary
        passengers={passengers}
        vehicles={vehicles}
        cabins={cabins}
      />

      {/* Links */}
      <div className="mt-6 flex gap-3 text-sm">
        <Link href={`/bookings/${bookingId}`} className="text-blue-600 hover:underline">
          Detay
        </Link>
        <Link href="/account/bookings" className="text-blue-600 hover:underline">
          Rezervasyonlarim
        </Link>
      </div>
    </div>
  );
}
