"use client";

import { useParams } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import { StatCard } from "@/components/ui/stat-card";

interface RevenueSummary {
  voyage_id: string;
  confirmed_booking_count: number;
  cancelled_booking_count: number;
  checked_in_booking_count: number;
  gross_captured_kurus: number;
  total_refunded_kurus: number;
  net_realized_kurus: number;
  open_refund_liability_kurus: number;
  unknown_payment_count: number;
  failed_payment_count: number;
}

function formatTL(kurus: number): string {
  return `${(kurus / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

export default function RevenuePage() {
  const params = useParams<{ id: string }>();
  const { data, loading, error } = useApi<{ revenue: RevenueSummary }>(
    `/api/admin/voyages/${params.id}/revenue`
  );

  if (loading) return <p className="text-sm text-gray-500">Yukleniyor...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return null;

  const r = data.revenue;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Gelir Ozeti</h1>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard label="Brut Gelir" value={formatTL(r.gross_captured_kurus)} />
        <StatCard label="Toplam Iade" value={formatTL(r.total_refunded_kurus)} />
        <StatCard label="Net Gelir" value={formatTL(r.net_realized_kurus)} />
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard label="Acik Iade Yukumlulugu" value={formatTL(r.open_refund_liability_kurus)} />
        <StatCard label="Bilinmeyen Odeme" value={r.unknown_payment_count} />
        <StatCard label="Basarisiz Odeme" value={r.failed_payment_count} />
      </div>

      <h2 className="mb-2 text-lg font-semibold">Rezervasyon Sayilari</h2>
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Onaylanmis" value={r.confirmed_booking_count} />
        <StatCard label="Check-in" value={r.checked_in_booking_count} />
        <StatCard label="Iptal" value={r.cancelled_booking_count} />
      </div>
    </div>
  );
}
