"use client";

interface VoyageCardProps {
  originPort: string;
  destinationPort: string;
  departureUtc: string;
  arrivalUtc: string;
  passengersAvailable: number | null;
  totalPassengerCapacity?: number;
  onClick?: () => void;
}

function capacityColor(available: number | null, total?: number): string {
  if (available == null || !total || total <= 0) return "text-gray-400";
  const pct = (available / total) * 100;
  if (pct > 50) return "text-green-600";
  if (pct > 10) return "text-yellow-600";
  return "text-red-600";
}

export function VoyageCard({
  originPort,
  destinationPort,
  departureUtc,
  arrivalUtc,
  passengersAvailable,
  totalPassengerCapacity,
  onClick,
}: VoyageCardProps) {
  const depDate = new Date(departureUtc);
  const arrDate = new Date(arrivalUtc);
  const color = capacityColor(passengersAvailable, totalPassengerCapacity);

  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg border bg-white p-4 text-left transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold">
            {originPort} → {destinationPort}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {depDate.toLocaleDateString("tr-TR")} · {depDate.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
            {" — "}
            {arrDate.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-medium ${color}`}>
            {passengersAvailable != null ? `${passengersAvailable} kisi` : "—"}
          </p>
          <p className="text-xs text-gray-400">musait</p>
        </div>
      </div>
    </button>
  );
}
