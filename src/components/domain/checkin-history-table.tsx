"use client";

import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";

interface CheckinRecord {
  check_in_record_id: string;
  booking_id: string;
  outcome: string;
  operator_id: string;
  document_verified: boolean;
  denial_reason: string | null;
  attempted_at: string;
}

interface CheckinHistoryTableProps {
  records: CheckinRecord[];
  onRowClick: (bookingId: string) => void;
}

const columns: Column<CheckinRecord>[] = [
  {
    key: "booking",
    label: "Rezervasyon",
    render: (r) => <span className="font-mono text-xs">{r.booking_id.slice(0, 8)}</span>,
  },
  {
    key: "outcome",
    label: "Sonuc",
    render: (r) => <StatusBadge status={r.outcome} />,
  },
  {
    key: "operator",
    label: "Operator",
    render: (r) => <span className="text-xs">{r.operator_id}</span>,
  },
  {
    key: "time",
    label: "Zaman",
    render: (r) => (
      <span className="text-xs text-gray-500">
        {new Date(r.attempted_at).toLocaleString("tr-TR")}
      </span>
    ),
  },
  {
    key: "reason",
    label: "Sebep",
    render: (r) =>
      r.denial_reason ? (
        <span className="text-xs text-gray-400" title={r.denial_reason}>
          {r.denial_reason.length > 30
            ? r.denial_reason.slice(0, 30) + "..."
            : r.denial_reason}
        </span>
      ) : (
        <span className="text-xs text-gray-300">—</span>
      ),
  },
];

export function CheckinHistoryTable({ records, onRowClick }: CheckinHistoryTableProps) {
  return (
    <DataTable
      columns={columns}
      data={records}
      onRowClick={(r) => onRowClick(r.booking_id)}
      emptyMessage="Check-in kaydi bulunamadi."
    />
  );
}
