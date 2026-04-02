const COLOR_MAP: Record<string, string> = {
  // green
  OPEN: "bg-green-100 text-green-700",
  ACTIVE: "bg-green-100 text-green-700",
  CONFIRMED: "bg-green-100 text-green-700",
  APPROVED: "bg-green-100 text-green-700",
  // blue
  CLOSED: "bg-blue-100 text-blue-700",
  CHECKED_IN: "bg-blue-100 text-blue-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  // yellow
  DRAFT: "bg-yellow-100 text-yellow-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  QUEUED: "bg-yellow-100 text-yellow-700",
  // red
  CANCELLED: "bg-red-100 text-red-700",
  FAILED: "bg-red-100 text-red-700",
  EXPIRED: "bg-red-100 text-red-700",
  DENIED: "bg-red-100 text-red-700",
  // orange
  UNKNOWN: "bg-orange-100 text-orange-700",
  MANUAL_REVIEW: "bg-orange-100 text-orange-700",
  ESCALATED: "bg-orange-100 text-orange-700",
  // gray
  DEPARTED: "bg-gray-100 text-gray-700",
  SETTLED: "bg-gray-100 text-gray-700",
  RESOLVED: "bg-gray-100 text-gray-700",
  RELEASED: "bg-gray-100 text-gray-700",
};

export function StatusBadge({ status }: { status: string }) {
  const colors = COLOR_MAP[status] ?? "bg-gray-100 text-gray-700";

  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${colors}`}
    >
      {status}
    </span>
  );
}
