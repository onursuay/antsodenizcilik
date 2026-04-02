interface Passenger {
  booking_passenger_id: string;
  full_name: string;
  document_type: string;
  document_number: string;
  nationality: string;
  cancelled_at: string | null;
}

interface Vehicle {
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
}

interface Cabin {
  booking_cabin_id: string;
  cabin_type_id: string;
  count_allocated: number;
  cancelled_at: string | null;
}

interface BookingSummaryProps {
  passengers: Passenger[];
  vehicles: Vehicle[];
  cabins: Cabin[];
}

export function BookingSummary({ passengers, vehicles, cabins }: BookingSummaryProps) {
  return (
    <div className="space-y-4">
      {/* Passengers */}
      {passengers.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold">
            Yolcular ({passengers.filter((p) => !p.cancelled_at).length})
          </h3>
          <div className="space-y-1">
            {passengers.map((p) => (
              <div
                key={p.booking_passenger_id}
                className={`rounded border px-3 py-2 text-sm ${
                  p.cancelled_at ? "bg-gray-50 text-gray-400 line-through" : ""
                }`}
              >
                <span className="font-medium">{p.full_name}</span>
                <span className="ml-2 text-gray-500">
                  {p.document_type} {p.document_number}
                </span>
                <span className="ml-2 text-gray-400">{p.nationality}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vehicles */}
      {vehicles.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold">
            Araclar ({vehicles.filter((v) => !v.cancelled_at).length})
          </h3>
          <div className="space-y-1">
            {vehicles.map((v) => (
              <div
                key={v.booking_vehicle_id}
                className={`rounded border px-3 py-2 text-sm ${
                  v.cancelled_at ? "bg-gray-50 text-gray-400 line-through" : ""
                }`}
              >
                <span className="font-medium">{v.plate_number}</span>
                <span className="ml-2 text-gray-500">{v.vehicle_type}</span>
                <span className="ml-2 text-gray-400">
                  {v.lane_meters_allocated}m · {v.m2_allocated}m²
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cabins */}
      {cabins.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold">
            Kabinler ({cabins.filter((c) => !c.cancelled_at).length})
          </h3>
          <div className="space-y-1">
            {cabins.map((c) => (
              <div
                key={c.booking_cabin_id}
                className={`rounded border px-3 py-2 text-sm ${
                  c.cancelled_at ? "bg-gray-50 text-gray-400 line-through" : ""
                }`}
              >
                <span className="font-mono text-xs">{c.cabin_type_id.slice(0, 8)}</span>
                <span className="ml-2">× {c.count_allocated}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
