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
    <div className="antso-box-stack">
      {passengers.length > 0 && (
        <SummaryGroup
          title={`Yolcular (${passengers.filter((item) => !item.cancelled_at).length})`}
          items={passengers.map((passenger) => ({
            id: passenger.booking_passenger_id,
            title: passenger.full_name,
            description: `${passenger.document_type} · ${passenger.document_number}`,
            meta: passenger.nationality,
            muted: Boolean(passenger.cancelled_at),
          }))}
        />
      )}

      {vehicles.length > 0 && (
        <SummaryGroup
          title={`Araçlar (${vehicles.filter((item) => !item.cancelled_at).length})`}
          items={vehicles.map((vehicle) => ({
            id: vehicle.booking_vehicle_id,
            title: vehicle.plate_number,
            description: vehicle.vehicle_type,
            meta: `${vehicle.lane_meters_allocated} m · ${vehicle.m2_allocated} m²`,
            muted: Boolean(vehicle.cancelled_at),
          }))}
        />
      )}

      {cabins.length > 0 && (
        <SummaryGroup
          title={`Kabinler (${cabins.filter((item) => !item.cancelled_at).length})`}
          items={cabins.map((cabin) => ({
            id: cabin.booking_cabin_id,
            title: `Kabin ${cabin.cabin_type_id.slice(0, 8)}`,
            description: "Tahsis edilen kabin tipi",
            meta: `x ${cabin.count_allocated}`,
            muted: Boolean(cabin.cancelled_at),
          }))}
        />
      )}
    </div>
  );
}

function SummaryGroup({
  title,
  items,
}: {
  title: string;
  items: Array<{
    id: string;
    title: string;
    description: string;
    meta: string;
    muted: boolean;
  }>;
}) {
  return (
    <div>
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{title}</h4>
      <div className="antso-box-stack">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 ${
              item.muted ? "opacity-55" : ""
            }`}
          >
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${item.muted ? "line-through text-slate-500" : "text-slate-900"}`}>
                {item.title}
              </p>
              <p className="mt-1 text-sm text-slate-500">{item.description}</p>
            </div>
            <span className="shrink-0 text-sm font-medium text-slate-600">{item.meta}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
