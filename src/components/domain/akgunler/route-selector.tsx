"use client";

import { useState } from "react";

interface GuzergahData {
  id: number;
  baslik: string;
  sehirler: Array<{ id: number; ad: string }>;
  yolcu_turleri: Array<{ id: number; title: string; yolcu_kodu: string }>;
}

interface RouteSelectorProps {
  guzergahlar: GuzergahData[];
  onSearch: (params: {
    guzergah: GuzergahData;
    cikisSehirId: number;
    varisSehirId: number;
    tarih: string;
    yolcuTurleri: Array<{ id: number; sayi: number }>;
  }) => void;
}

export function RouteSelector({ guzergahlar, onSearch }: RouteSelectorProps) {
  const [guzergahId, setGuzergahId] = useState(0);
  const [cikisSehirId, setCikisSehirId] = useState(0);
  const [varisSehirId, setVarisSehirId] = useState(0);
  const [tarih, setTarih] = useState("");
  const [yetiskin, setYetiskin] = useState(1);
  const [cocuk, setCocuk] = useState(0);

  const selectedGuzergah = guzergahlar.find((g) => g.id === guzergahId);
  const sehirler = selectedGuzergah?.sehirler ?? [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGuzergah || !cikisSehirId || !varisSehirId || !tarih) return;

    const yolcuTurleri: Array<{ id: number; sayi: number }> = [];
    if (yetiskin > 0) yolcuTurleri.push({ id: 1, sayi: yetiskin }); // SİVİL (12+)
    if (cocuk > 0) yolcuTurleri.push({ id: 2, sayi: cocuk }); // ÇOCUK 7-12

    // Tarihi dd/mm/yyyy formatına çevir
    const [y, m, d] = tarih.split("-");
    const formattedDate = `${d}/${m}/${y}`;

    onSearch({
      guzergah: selectedGuzergah,
      cikisSehirId,
      varisSehirId,
      tarih: formattedDate,
      yolcuTurleri,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Guzergah</label>
        <select
          value={guzergahId}
          onChange={(e) => {
            setGuzergahId(parseInt(e.target.value));
            setCikisSehirId(0);
            setVarisSehirId(0);
          }}
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
          required
        >
          <option value={0}>Secin...</option>
          {guzergahlar.map((g) => (
            <option key={g.id} value={g.id}>{g.baslik}</option>
          ))}
        </select>
      </div>

      {sehirler.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Nereden</label>
            <select
              value={cikisSehirId}
              onChange={(e) => setCikisSehirId(parseInt(e.target.value))}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              required
            >
              <option value={0}>Secin...</option>
              {sehirler.map((s) => (
                <option key={s.id} value={s.id}>{s.ad}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Nereye</label>
            <select
              value={varisSehirId}
              onChange={(e) => setVarisSehirId(parseInt(e.target.value))}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              required
            >
              <option value={0}>Secin...</option>
              {sehirler.filter((s) => s.id !== cikisSehirId).map((s) => (
                <option key={s.id} value={s.id}>{s.ad}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium">Tarih</label>
        <input
          type="date"
          value={tarih}
          onChange={(e) => setTarih(e.target.value)}
          min={new Date().toISOString().split("T")[0]}
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">Yetiskin (12+)</label>
          <input
            type="number"
            min={1}
            max={10}
            value={yetiskin}
            onChange={(e) => setYetiskin(parseInt(e.target.value) || 1)}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Cocuk (7-12)</label>
          <input
            type="number"
            min={0}
            max={10}
            value={cocuk}
            onChange={(e) => setCocuk(parseInt(e.target.value) || 0)}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={!guzergahId || !cikisSehirId || !varisSehirId || !tarih}
        className="w-full rounded bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        Sefer Ara
      </button>
    </form>
  );
}
