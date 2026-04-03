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

export function RefundTracker({ refunds }: RefundTrackerProps) {
  if (refunds.length === 0) return null;

  return (
    <div className="space-y-3">
      {refunds.map((refund) => (
        <div
          key={refund.refund_id}
          className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-base font-semibold text-slate-900">
                {(refund.amount_kurus / 100).toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                TL
              </p>
              <p className="mt-2 text-sm text-slate-500">Kuyruğa alınma: {formatDate(refund.queued_at)}</p>
              {refund.confirmed_at && (
                <p className="mt-1 text-sm text-slate-500">Onay: {formatDate(refund.confirmed_at)}</p>
              )}
            </div>
            <StatusBadge status={refund.status} />
          </div>
        </div>
      ))}
    </div>
  );
}
