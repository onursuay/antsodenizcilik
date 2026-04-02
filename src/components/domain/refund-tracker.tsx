import { StatusBadge } from "@/components/ui/status-badge";

interface Refund {
  refund_id: string;
  status: string;
  amount_kurus: number;
  queued_at: string;
  confirmed_at: string | null;
}

interface RefundTrackerProps {
  refunds: Refund[];
}

export function RefundTracker({ refunds }: RefundTrackerProps) {
  if (refunds.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">Iadeler</h3>
      <div className="space-y-2">
        {refunds.map((r) => (
          <div
            key={r.refund_id}
            className="flex items-center justify-between rounded border px-3 py-2 text-sm"
          >
            <div>
              <p className="font-medium">
                {(r.amount_kurus / 100).toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                TL
              </p>
              <p className="text-xs text-gray-400">
                Kuyruk: {new Date(r.queued_at).toLocaleString("tr-TR")}
                {r.confirmed_at &&
                  ` · Onay: ${new Date(r.confirmed_at).toLocaleString("tr-TR")}`}
              </p>
            </div>
            <StatusBadge status={r.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
