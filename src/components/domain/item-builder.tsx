"use client";

import { useState } from "react";

interface CabinTypeOption {
  cabin_type_id: string;
  label: string;
  available: number;
}

interface VehicleRow {
  vehicle_type: string;
  lane_meters: number;
  m2: number;
}

interface CabinRow {
  cabin_type_id: string;
  quantity: number;
}

export interface HoldItemOutput {
  item_type: "PASSENGER" | "VEHICLE" | "CABIN";
  quantity: number;
  lane_meters?: number;
  m2?: number;
  vehicle_type?: string;
  cabin_type_id?: string;
}

interface ItemBuilderProps {
  cabinTypes: CabinTypeOption[];
  onSubmit: (items: HoldItemOutput[]) => void;
  loading?: boolean;
  error?: string | null;
}

export function ItemBuilder({ cabinTypes, onSubmit, loading, error }: ItemBuilderProps) {
  const [passengerCount, setPassengerCount] = useState(1);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [cabins, setCabins] = useState<CabinRow[]>([]);

  function addVehicle() {
    setVehicles([...vehicles, { vehicle_type: "CAR", lane_meters: 5, m2: 10 }]);
  }

  function removeVehicle(i: number) {
    setVehicles(vehicles.filter((_, idx) => idx !== i));
  }

  function updateVehicle(i: number, field: keyof VehicleRow, value: string | number) {
    const updated = [...vehicles];
    updated[i] = { ...updated[i], [field]: value };
    setVehicles(updated);
  }

  function addCabin() {
    if (cabinTypes.length === 0) return;
    setCabins([...cabins, { cabin_type_id: cabinTypes[0].cabin_type_id, quantity: 1 }]);
  }

  function removeCabin(i: number) {
    setCabins(cabins.filter((_, idx) => idx !== i));
  }

  function updateCabin(i: number, field: keyof CabinRow, value: string | number) {
    const updated = [...cabins];
    updated[i] = { ...updated[i], [field]: value };
    setCabins(updated);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const items: HoldItemOutput[] = [];

    if (passengerCount > 0) {
      items.push({ item_type: "PASSENGER", quantity: passengerCount });
    }

    for (const v of vehicles) {
      items.push({
        item_type: "VEHICLE",
        quantity: 1,
        lane_meters: v.lane_meters,
        m2: v.m2,
        vehicle_type: v.vehicle_type,
      });
    }

    for (const c of cabins) {
      items.push({
        item_type: "CABIN",
        quantity: c.quantity,
        cabin_type_id: c.cabin_type_id,
      });
    }

    onSubmit(items);
  }

  const totalLane = vehicles.reduce((s, v) => s + v.lane_meters, 0);
  const totalM2 = vehicles.reduce((s, v) => s + v.m2, 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {/* Passengers */}
      <div>
        <h3 className="mb-2 font-semibold">Yolcular</h3>
        <div className="flex items-center gap-3">
          <label className="text-sm">Kisi sayisi:</label>
          <input
            type="number"
            min={1}
            max={50}
            value={passengerCount}
            onChange={(e) => setPassengerCount(parseInt(e.target.value, 10) || 1)}
            className="w-20 rounded border px-2 py-1 text-sm"
          />
        </div>
      </div>

      {/* Vehicles */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold">Araclar</h3>
          <button type="button" onClick={addVehicle} className="text-sm text-blue-600 hover:underline">+ Arac Ekle</button>
        </div>
        {vehicles.map((v, i) => (
          <div key={i} className="mb-2 flex flex-wrap items-end gap-2 rounded border p-2">
            <div>
              <label className="block text-xs text-gray-500">Tip</label>
              <select value={v.vehicle_type} onChange={(e) => updateVehicle(i, "vehicle_type", e.target.value)} className="rounded border px-2 py-1 text-sm">
                <option value="CAR">Otomobil</option>
                <option value="MINIBUS">Minibus</option>
                <option value="BUS">Otobus</option>
                <option value="TRUCK">Kamyon</option>
                <option value="MOTORCYCLE">Motosiklet</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500">Lane (m)</label>
              <input type="number" step="0.1" value={v.lane_meters} onChange={(e) => updateVehicle(i, "lane_meters", parseFloat(e.target.value) || 0)} className="w-20 rounded border px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500">m²</label>
              <input type="number" step="0.1" value={v.m2} onChange={(e) => updateVehicle(i, "m2", parseFloat(e.target.value) || 0)} className="w-20 rounded border px-2 py-1 text-sm" />
            </div>
            <button type="button" onClick={() => removeVehicle(i)} className="text-sm text-red-500 hover:underline">Sil</button>
          </div>
        ))}
      </div>

      {/* Cabins */}
      {cabinTypes.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">Kabinler</h3>
            <button type="button" onClick={addCabin} className="text-sm text-blue-600 hover:underline">+ Kabin Ekle</button>
          </div>
          {cabins.map((c, i) => (
            <div key={i} className="mb-2 flex items-end gap-2 rounded border p-2">
              <div className="flex-1">
                <label className="block text-xs text-gray-500">Tip</label>
                <select value={c.cabin_type_id} onChange={(e) => updateCabin(i, "cabin_type_id", e.target.value)} className="w-full rounded border px-2 py-1 text-sm">
                  {cabinTypes.map((ct) => (
                    <option key={ct.cabin_type_id} value={ct.cabin_type_id}>
                      {ct.label} ({ct.available} musait)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500">Adet</label>
                <input type="number" min={1} value={c.quantity} onChange={(e) => updateCabin(i, "quantity", parseInt(e.target.value, 10) || 1)} className="w-16 rounded border px-2 py-1 text-sm" />
              </div>
              <button type="button" onClick={() => removeCabin(i)} className="text-sm text-red-500 hover:underline">Sil</button>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="rounded bg-gray-50 p-3 text-sm">
        <p>Yolcu: {passengerCount} · Arac: {vehicles.length} ({totalLane}m / {totalM2}m²) · Kabin: {cabins.reduce((s, c) => s + c.quantity, 0)}</p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Rezervasyon olusturuluyor..." : "Rezervasyon Olustur"}
      </button>
    </form>
  );
}
