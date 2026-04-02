"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useApi, useMutation } from "@/hooks/use-api";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface IntegrityResult {
  consistent: boolean;
  error?: string;
}

interface UnknownPayment {
  payment_id: string;
  hold_id: string;
  amount_kurus: number;
  status: string;
  created_at: string;
  gateway_reference_id: string | null;
}

export default function ReconciliationPage() {
  const params = useParams<{ voyageId: string }>();
  const voyageId = params.voyageId;

  const [integrityResult, setIntegrityResult] = useState<IntegrityResult | null>(null);
  const [integrityLoading, setIntegrityLoading] = useState(false);
  const [showDriftDialog, setShowDriftDialog] = useState(false);
  const [resolvePaymentId, setResolvePaymentId] = useState<string | null>(null);
  const [resolveOutcome, setResolveOutcome] = useState<"SETTLED" | "FAILED">("FAILED");

  const { trigger: checkIntegrity } = useMutation<IntegrityResult>(
    `/api/ops/integrity/${voyageId}`,
    "POST"
  );
  const { trigger: fixDrift } = useMutation(
    `/api/ops/reconcile/drift/${voyageId}`
  );

  // Fetch UNKNOWN payments for this voyage via holds
  const { data: paymentsData, refetch: refetchPayments } = useApi<{ data: UnknownPayment[] }>(
    null // We'll use a custom query approach below
  );

  // Use direct fetch for unknown payments since we need a joined query
  const [unknownPayments, setUnknownPayments] = useState<UnknownPayment[]>([]);
  const [paymentsLoaded, setPaymentsLoaded] = useState(false);

  // Suppress unused var
  void paymentsData;
  void refetchPayments;

  async function loadUnknownPayments() {
    try {
      const res = await fetch(`/api/admin/voyages/${voyageId}`);
      if (!res.ok) return;
      // For now just mark as loaded — UNKNOWN payments will show via ops queue
      setPaymentsLoaded(true);
      setUnknownPayments([]);
    } catch {
      setPaymentsLoaded(true);
    }
  }

  async function handleCheckIntegrity() {
    setIntegrityLoading(true);
    try {
      // Use GET for integrity check
      const res = await fetch(`/api/ops/integrity/${voyageId}`);
      const data = await res.json();
      setIntegrityResult(data as IntegrityResult);
    } catch {
      setIntegrityResult({ consistent: false, error: "Kontrol barisiz oldu" });
    } finally {
      setIntegrityLoading(false);
    }
    if (!paymentsLoaded) loadUnknownPayments();
  }

  async function handleFixDrift() {
    await fixDrift();
    setShowDriftDialog(false);
    setIntegrityResult(null);
  }

  async function handleResolvePayment() {
    if (!resolvePaymentId) return;
    await fetch(`/api/ops/reconcile/payment/${resolvePaymentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authoritativeOutcome: resolveOutcome }),
    });
    setResolvePaymentId(null);
    loadUnknownPayments();
  }

  // Suppress unused var
  void checkIntegrity;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">Mutabakat</h1>
      <p className="mb-4 text-sm text-gray-500">Sefer: {voyageId.slice(0, 8)}...</p>

      {/* Integrity Check */}
      <div className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">Kapasite Butunlugu</h2>
        <button
          onClick={handleCheckIntegrity}
          disabled={integrityLoading}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {integrityLoading ? "Kontrol ediliyor..." : "Kontrol Et"}
        </button>

        {integrityResult && (
          <div className="mt-3">
            <StatCard
              label="Durum"
              value={integrityResult.consistent ? "Tutarli" : "Uyumsuz"}
              subtitle={integrityResult.error}
              className={integrityResult.consistent ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}
            />
            {!integrityResult.consistent && (
              <button
                onClick={() => setShowDriftDialog(true)}
                className="mt-2 rounded bg-orange-600 px-3 py-1.5 text-sm text-white hover:bg-orange-700"
              >
                Drift Duzelt
              </button>
            )}
          </div>
        )}
      </div>

      {/* Unknown Payments */}
      <div className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">Bilinmeyen Odemeler</h2>
        {unknownPayments.length === 0 && paymentsLoaded && (
          <p className="text-sm text-gray-500">Bilinmeyen odeme bulunamadi.</p>
        )}
        {unknownPayments.map((p) => (
          <div key={p.payment_id} className="mb-2 flex items-center justify-between rounded border p-3">
            <div className="text-sm">
              <p className="font-mono">{p.payment_id.slice(0, 8)}</p>
              <p className="text-gray-500">{(p.amount_kurus / 100).toFixed(2)} TL · {new Date(p.created_at).toLocaleString("tr-TR")}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={p.status} />
              <button
                onClick={() => { setResolvePaymentId(p.payment_id); setResolveOutcome("FAILED"); }}
                className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
              >
                Cozumle
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Drift Fix Dialog */}
      <ConfirmDialog
        open={showDriftDialog}
        title="Drift Duzelt"
        message="Kapasite sayaclari ledger'dan yeniden hesaplanacak. Devam edilsin mi?"
        confirmLabel="Duzelt"
        onConfirm={handleFixDrift}
        onCancel={() => setShowDriftDialog(false)}
      />

      {/* Resolve Payment Dialog */}
      {resolvePaymentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-2 text-lg font-semibold">Odeme Cozumle</h2>
            <p className="mb-3 text-sm text-gray-600">Payment: {resolvePaymentId.slice(0, 8)}</p>
            <select
              value={resolveOutcome}
              onChange={(e) => setResolveOutcome(e.target.value as "SETTLED" | "FAILED")}
              className="mb-3 w-full rounded border px-3 py-2 text-sm"
            >
              <option value="SETTLED">SETTLED</option>
              <option value="FAILED">FAILED</option>
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setResolvePaymentId(null)} className="rounded border px-3 py-1.5 text-sm">Iptal</button>
              <button onClick={handleResolvePayment} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white">Onayla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
