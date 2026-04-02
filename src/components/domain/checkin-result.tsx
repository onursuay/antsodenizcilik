import Link from "next/link";

interface CheckinResultProps {
  outcome: "APPROVED" | "DENIED";
  bookingId: string;
  denialReason?: string | null;
  timestamp: string;
}

export function CheckinResult({
  outcome,
  bookingId,
  denialReason,
  timestamp,
}: CheckinResultProps) {
  const isApproved = outcome === "APPROVED";

  return (
    <div
      className={`rounded-lg p-4 ${
        isApproved ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
      }`}
    >
      <p
        className={`text-lg font-semibold ${
          isApproved ? "text-green-700" : "text-red-700"
        }`}
      >
        {isApproved ? "Boarding izni verildi" : "Boarding reddedildi"}
      </p>

      {denialReason && (
        <p className="mt-1 text-sm text-red-600">Sebep: {denialReason}</p>
      )}

      <div className="mt-2 text-xs text-gray-500">
        <p>Booking: {bookingId.slice(0, 8)}...</p>
        <p>{new Date(timestamp).toLocaleString("tr-TR")}</p>
      </div>

      <Link
        href="/checkin"
        className="mt-3 inline-block rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
      >
        Yeni Tarama
      </Link>
    </div>
  );
}
