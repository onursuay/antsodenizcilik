"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminForm } from "@/components/ui/admin-form";
import { useApi, useMutation } from "@/hooks/use-api";

interface VesselOption {
  vessel_id: string;
  name: string;
}

export default function NewVoyagePage() {
  const router = useRouter();
  const { data: vesselData } = useApi<{ vessels: VesselOption[] }>("/api/admin/vessels");
  const { trigger, loading, error } = useMutation<{ voyage: { voyage_id: string } }>("/api/admin/voyages");

  const [vesselId, setVesselId] = useState("");
  const [originPort, setOriginPort] = useState("");
  const [destinationPort, setDestinationPort] = useState("");
  const [departureUtc, setDepartureUtc] = useState("");
  const [arrivalUtc, setArrivalUtc] = useState("");
  const [opLane, setOpLane] = useState("");
  const [opM2, setOpM2] = useState("");
  const [opPax, setOpPax] = useState("");
  const [overbooking, setOverbooking] = useState("0");

  async function handleSubmit() {
    const result = await trigger({
      vesselId,
      originPort,
      destinationPort,
      departureUtc: new Date(departureUtc).toISOString(),
      arrivalUtc: new Date(arrivalUtc).toISOString(),
      operationalLaneMeters: parseFloat(opLane),
      operationalM2: parseFloat(opM2),
      operationalPassengerCapacity: parseInt(opPax, 10),
      overbookingDelta: parseInt(overbooking, 10) || 0,
    });
    if (result?.voyage) {
      router.push(`/admin/voyages/${result.voyage.voyage_id}`);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-2xl font-bold">Yeni Sefer</h1>

      <AdminForm onSubmit={handleSubmit} loading={loading} error={error}>
        <div>
          <label className="block text-sm font-medium">Gemi</label>
          <select required value={vesselId} onChange={(e) => setVesselId(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm">
            <option value="">Secin...</option>
            {(vesselData?.vessels ?? []).map((v) => (
              <option key={v.vessel_id} value={v.vessel_id}>{v.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Kalkis Limani</label>
            <input type="text" required value={originPort} onChange={(e) => setOriginPort(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium">Varis Limani</label>
            <input type="text" required value={destinationPort} onChange={(e) => setDestinationPort(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Kalkis Zamani</label>
            <input type="datetime-local" required value={departureUtc} onChange={(e) => setDepartureUtc(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium">Varis Zamani</label>
            <input type="datetime-local" required value={arrivalUtc} onChange={(e) => setArrivalUtc(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium">Lane (m)</label>
            <input type="number" step="0.01" required value={opLane} onChange={(e) => setOpLane(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium">m²</label>
            <input type="number" step="0.01" required value={opM2} onChange={(e) => setOpM2(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium">Yolcu</label>
            <input type="number" required value={opPax} onChange={(e) => setOpPax(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium">Overbooking Delta</label>
          <input type="number" value={overbooking} onChange={(e) => setOverbooking(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
        </div>
      </AdminForm>
    </div>
  );
}
