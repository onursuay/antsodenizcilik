"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminForm } from "@/components/ui/admin-form";
import { useMutation } from "@/hooks/use-api";

interface CabinTypeRow {
  label: string;
  baseCount: number;
  berthsPerCabin: number;
}

export default function NewVesselPage() {
  const router = useRouter();
  const { trigger, loading, error } = useMutation("/api/admin/vessels");

  const [name, setName] = useState("");
  const [baseLaneMeters, setBaseLaneMeters] = useState("");
  const [baseM2, setBaseM2] = useState("");
  const [basePassengerCapacity, setBasePassengerCapacity] = useState("");
  const [commissionedAt, setCommissionedAt] = useState("");
  const [cabinTypes, setCabinTypes] = useState<CabinTypeRow[]>([]);

  function addCabinType() {
    setCabinTypes([...cabinTypes, { label: "", baseCount: 1, berthsPerCabin: 2 }]);
  }

  function removeCabinType(index: number) {
    setCabinTypes(cabinTypes.filter((_, i) => i !== index));
  }

  function updateCabinType(index: number, field: keyof CabinTypeRow, value: string | number) {
    const updated = [...cabinTypes];
    updated[index] = { ...updated[index], [field]: value };
    setCabinTypes(updated);
  }

  async function handleSubmit() {
    await trigger({
      name,
      baseLaneMeters: parseFloat(baseLaneMeters),
      baseM2: parseFloat(baseM2),
      basePassengerCapacity: parseInt(basePassengerCapacity, 10),
      commissionedAt: new Date(commissionedAt).toISOString(),
      cabinTypes,
    });
    router.push("/admin/vessels");
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-2xl font-bold">Yeni Gemi</h1>

      <AdminForm onSubmit={handleSubmit} loading={loading} error={error}>
        <div>
          <label className="block text-sm font-medium">Ad</label>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium">Lane (m)</label>
            <input type="number" step="0.01" required value={baseLaneMeters} onChange={(e) => setBaseLaneMeters(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium">m²</label>
            <input type="number" step="0.01" required value={baseM2} onChange={(e) => setBaseM2(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium">Yolcu</label>
            <input type="number" required value={basePassengerCapacity} onChange={(e) => setBasePassengerCapacity(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium">Komisyon Tarihi</label>
          <input type="datetime-local" required value={commissionedAt} onChange={(e) => setCommissionedAt(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Kabin Tipleri</label>
            <button type="button" onClick={addCabinType} className="text-sm text-blue-600 hover:underline">+ Ekle</button>
          </div>
          {cabinTypes.map((ct, i) => (
            <div key={i} className="mt-2 flex gap-2 items-end">
              <div className="flex-1">
                <input type="text" placeholder="Etiket" value={ct.label} onChange={(e) => updateCabinType(i, "label", e.target.value)} className="w-full rounded border px-2 py-1 text-sm" />
              </div>
              <div className="w-20">
                <input type="number" placeholder="Adet" value={ct.baseCount} onChange={(e) => updateCabinType(i, "baseCount", parseInt(e.target.value, 10) || 0)} className="w-full rounded border px-2 py-1 text-sm" />
              </div>
              <div className="w-20">
                <input type="number" placeholder="Yatak" value={ct.berthsPerCabin} onChange={(e) => updateCabinType(i, "berthsPerCabin", parseInt(e.target.value, 10) || 0)} className="w-full rounded border px-2 py-1 text-sm" />
              </div>
              <button type="button" onClick={() => removeCabinType(i)} className="text-sm text-red-500 hover:underline">Sil</button>
            </div>
          ))}
        </div>
      </AdminForm>
    </div>
  );
}
