"use client";

import { useState, useEffect } from "react";

interface YolcuData {
  yolcu_id: number;
  yolcu_tur_id: number;
  yolcu_tipi: string;
  yolcu_tur_ad: string;
  toplam_fiyat_genel: number;
  vergi_turleri: Array<{ id: number; aciklama: string }>;
  insan_ulke_id?: number;
  insan_ad?: string;
  insan_soyad?: string;
  insan_pasaport_no?: string;
  insan_cinsiyet?: string;
  insan_dogum_tarihi?: string | null;
  yolcu_tel_no?: string;
  vergi_tur_id?: number | null;
  arac_marka_model?: string;
  arac_plaka_aciklama?: string;
}

interface Ulke {
  id: number;
  title: string;
  ulke_kodu: string;
}

interface PassengerFormProps {
  yolcular: YolcuData[];
  onSubmit: (yolcuBilgileri: Array<Record<string, unknown>>) => void;
  onBack: () => void;
}

function PassengerFields({
  yolcu,
  index,
  ulkeler,
  onChange,
}: {
  yolcu: YolcuData;
  index: number;
  ulkeler: Ulke[];
  onChange: (index: number, field: string, value: string | number) => void;
}) {
  return (
    <div className="rounded-lg border p-4">
      <h4 className="mb-3 text-sm font-semibold text-gray-700">
        {index + 1}. Yolcu — {yolcu.yolcu_tur_ad}
      </h4>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500">Ad</label>
          <input
            type="text"
            required
            defaultValue={yolcu.insan_ad ?? ""}
            onChange={(e) => onChange(index, "insan_ad", e.target.value)}
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm uppercase"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">Soyad</label>
          <input
            type="text"
            required
            defaultValue={yolcu.insan_soyad ?? ""}
            onChange={(e) => onChange(index, "insan_soyad", e.target.value)}
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm uppercase"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">Cinsiyet</label>
          <select
            required
            defaultValue={yolcu.insan_cinsiyet ?? ""}
            onChange={(e) => onChange(index, "insan_cinsiyet", e.target.value)}
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
          >
            <option value="">Secin...</option>
            <option value="E">Erkek</option>
            <option value="K">Kadin</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">Pasaport / TC No</label>
          <input
            type="text"
            required
            defaultValue={yolcu.insan_pasaport_no ?? ""}
            onChange={(e) => onChange(index, "insan_pasaport_no", e.target.value)}
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">Dogum Tarihi</label>
          <input
            type="date"
            required
            defaultValue={yolcu.insan_dogum_tarihi ?? ""}
            onChange={(e) => onChange(index, "insan_dogum_tarihi", e.target.value)}
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">Uyruk</label>
          <select
            required
            defaultValue={yolcu.insan_ulke_id ?? ""}
            onChange={(e) => onChange(index, "insan_ulke_id", parseInt(e.target.value))}
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
          >
            <option value="">Secin...</option>
            {ulkeler.map((u) => (
              <option key={u.id} value={u.id}>{u.title}</option>
            ))}
          </select>
        </div>
        {index === 0 && (
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500">Telefon (opsiyonel)</label>
            <input
              type="tel"
              defaultValue={yolcu.yolcu_tel_no ?? ""}
              onChange={(e) => onChange(index, "yolcu_tel_no", e.target.value)}
              placeholder="+90 5xx xxx xx xx"
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
            />
          </div>
        )}
        {yolcu.vergi_turleri && yolcu.vergi_turleri.length > 0 && (
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500">Vergi Turu</label>
            <select
              defaultValue={yolcu.vergi_tur_id ?? ""}
              onChange={(e) => onChange(index, "vergi_tur_id", parseInt(e.target.value))}
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
            >
              <option value="">Secin...</option>
              {yolcu.vergi_turleri.map((v) => (
                <option key={v.id} value={v.id}>{v.aciklama}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

export function PassengerForm({ yolcular, onSubmit, onBack }: PassengerFormProps) {
  const [ulkeler, setUlkeler] = useState<Ulke[]>([]);
  const [formData, setFormData] = useState<Record<number, Record<string, unknown>>>(() => {
    const init: Record<number, Record<string, unknown>> = {};
    yolcular.forEach((y, i) => {
      init[i] = {
        id: y.yolcu_id,
        insan_ad: y.insan_ad ?? "",
        insan_soyad: y.insan_soyad ?? "",
        insan_cinsiyet: y.insan_cinsiyet ?? "",
        insan_pasaport_no: y.insan_pasaport_no ?? "",
        insan_dogum_tarihi: y.insan_dogum_tarihi ?? "",
        insan_ulke_id: y.insan_ulke_id ?? 0,
        yolcu_tel_no: y.yolcu_tel_no ?? "",
        vergi_tur_id: y.vergi_tur_id ?? null,
      };
    });
    return init;
  });

  useEffect(() => {
    fetch("/api/akgunler/countries")
      .then((r) => r.json())
      .then((data) => setUlkeler(data.ulkeler ?? []))
      .catch(() => {});
  }, []);

  function handleFieldChange(index: number, field: string, value: string | number) {
    setFormData((prev) => ({
      ...prev,
      [index]: { ...prev[index], [field]: value },
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = Object.values(formData);
    onSubmit(result);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">Yolcu Bilgileri</h3>

      {yolcular.map((yolcu, i) => (
        <PassengerFields
          key={yolcu.yolcu_id}
          yolcu={yolcu}
          index={i}
          ulkeler={ulkeler}
          onChange={handleFieldChange}
        />
      ))}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
        >
          ← Geri
        </button>
        <button
          type="submit"
          className="flex-1 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Devam — Odemeye Gec
        </button>
      </div>
    </form>
  );
}
