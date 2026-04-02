"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useApi, useMutation } from "@/hooks/use-api";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface OpsDetail {
  entry: {
    review_id: string;
    issue_type: string;
    status: string;
    description: string;
    created_at: string;
    resolved_at: string | null;
    resolution_action: string | null;
    resolved_by: string | null;
    voyage_id: string | null;
    hold_id: string | null;
    booking_id: string | null;
    payment_id: string | null;
    refund_id: string | null;
    detected_by: string;
  };
  hold: { hold_id: string; status: string } | null;
  booking: { booking_id: string; status: string } | null;
  payment: { payment_id: string; status: string } | null;
  refund: { refund_id: string; status: string } | null;
}

export default function OpsEntryDetailPage() {
  const params = useParams<{ reviewId: string }>();
  const { data, loading, error, refetch } = useApi<OpsDetail>(
    `/api/ops/queue/entry/${params.reviewId}`
  );
  const { trigger: resolve } = useMutation(`/api/ops/queue/entry/${params.reviewId}/resolve`);

  const [showResolve, setShowResolve] = useState(false);
  const [resolutionAction, setResolutionAction] = useState("");

  if (loading) return <p className="text-sm text-gray-500">Yukleniyor...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return null;

  const { entry: e } = data;

  async function handleResolve() {
    await resolve({ resolutionAction, resolvedBy: "admin" });
    setShowResolve(false);
    setResolutionAction("");
    refetch();
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-2xl font-bold">Ops Detay</h1>
        <StatusBadge status={e.status} />
        <StatusBadge status={e.issue_type} />
      </div>

      <div className="mb-6 space-y-2 text-sm">
        <p><span className="font-medium">Aciklama:</span> {e.description}</p>
        <p><span className="font-medium">Tespit Eden:</span> {e.detected_by}</p>
        <p><span className="font-medium">Olusturulma:</span> {new Date(e.created_at).toLocaleString("tr-TR")}</p>
        {e.resolved_at && (
          <>
            <p><span className="font-medium">Cozum:</span> {e.resolution_action}</p>
            <p><span className="font-medium">Cozen:</span> {e.resolved_by}</p>
            <p><span className="font-medium">Cozum Zamani:</span> {new Date(e.resolved_at).toLocaleString("tr-TR")}</p>
          </>
        )}
      </div>

      {/* Related Entities */}
      <div className="mb-6 space-y-1 text-sm">
        <p className="font-medium">Iliskili Kayitlar:</p>
        {e.voyage_id && <p><Link href={`/admin/voyages/${e.voyage_id}`} className="text-blue-600 hover:underline">Sefer: {e.voyage_id.slice(0, 8)}</Link></p>}
        {data.hold && <p>Hold: {data.hold.hold_id.slice(0, 8)} <StatusBadge status={data.hold.status} /></p>}
        {data.booking && <p><Link href={`/admin/voyages/${e.voyage_id}`} className="text-blue-600 hover:underline">Booking: {data.booking.booking_id.slice(0, 8)}</Link> <StatusBadge status={data.booking.status} /></p>}
        {data.payment && <p>Payment: {data.payment.payment_id.slice(0, 8)} <StatusBadge status={data.payment.status} /></p>}
        {data.refund && <p>Refund: {data.refund.refund_id.slice(0, 8)} <StatusBadge status={data.refund.status} /></p>}
      </div>

      {/* Resolve Button */}
      {e.status === "OPEN" && (
        <button
          onClick={() => setShowResolve(true)}
          className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
        >
          Cozumle
        </button>
      )}

      {showResolve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-2 text-lg font-semibold">Ops Kaydi Cozumle</h2>
            <textarea
              value={resolutionAction}
              onChange={(e) => setResolutionAction(e.target.value)}
              placeholder="Cozum aciklamasi..."
              className="mb-3 w-full rounded border px-3 py-2 text-sm"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowResolve(false)} className="rounded border px-3 py-1.5 text-sm">Iptal</button>
              <button
                onClick={handleResolve}
                disabled={!resolutionAction.trim()}
                className="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-50"
              >
                Onayla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
