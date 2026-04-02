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
    <div className="space-y-5">
      {passengers.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            Yolcular ({passengers.filter((p) => !p.cancelled_at).length})
          </h4>
          <div className="space-y-2">
            {passengers.map((p) => (
              <div
                key={p.booking_passenger_id}
                className={`flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 ${
                  p.cancelled_at ? "opacity-50 line-through" : ""
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{p.full_name}</p>
                  <p className="text-xs text-slate-400">
                    {p.document_type} · {p.document_number}
                  </p>
                </div>
                <span className="text-xs text-slate-400">{p.nationality}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {vehicles.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            Araçlar ({vehicles.filter((v) => !v.cancelled_at).length})
          </h4>
          <div className="space-y-2">
            {vehicles.map((v) => (
              <div
                key={v.booking_vehicle_id}
                className={`flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 ${
                  v.cancelled_at ? "opacity-50 line-through" : ""
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{v.plate_number}</p>
                  <p className="text-xs text-slate-400">{v.vehicle_type}</p>
                </div>
                <span className="text-xs text-slate-400">
                  {v.lane_meters_allocated}m · {v.m2_allocated}m²
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {cabins.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            Kabinler ({cabins.filter((c) => !c.cancelled_at).length})
          </h4>
          <div className="space-y-2">
            {cabins.map((c) => (
              <div
                key={c.booking_cabin_id}
                className={`flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 ${
                  c.cancelled_at ? "opacity-50 line-through" : ""
                }`}
              >
                <p className="font-mono text-xs text-slate-600">{c.cabin_type_id.slice(0, 8)}</p>
                <span className="text-sm text-slate-700">× {c.count_allocated}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
