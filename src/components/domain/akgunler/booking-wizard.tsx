"use client";

import { useState, useEffect } from "react";
import { RouteSelector } from "./route-selector";
import { SailingList } from "./sailing-list";
import { PassengerForm } from "./passenger-form";
import { PaymentForm } from "./payment-form";

interface GuzergahData {
  id: number;
  baslik: string;
  sehirler: Array<{ id: number; ad: string }>;
  yolcu_turleri: Array<{ id: number; title: string; yolcu_kodu: string }>;
}

interface SeferData {
  id: number;
  sefer_tarih: string;
  gemi: string;
  ucret: number;
  formatted_price: string;
  secili_mi: boolean;
}

interface YolcuData {
  yolcu_id: number;
  yolcu_tur_id: number;
  yolcu_tipi: string;
  yolcu_tur_ad: string;
  toplam_fiyat_genel: number;
  vergi_turleri: Array<{ id: number; aciklama: string }>;
}

type Step = "route" | "sailing" | "passenger" | "payment";

export function AkgunlerBookingWizard() {
  const [step, setStep] = useState<Step>("route");
  const [guzergahlar, setGuzergahlar] = useState<GuzergahData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booking state
  const [selectedGuzergah, setSelectedGuzergah] = useState<GuzergahData | null>(null);
  const [cikisSehirId, setCikisSehirId] = useState(0);
  const [varisSehirId, setVarisSehirId] = useState(0);
  const [tarih, setTarih] = useState("");
  const [yolcuSayilari, setYolcuSayilari] = useState<Array<{ id: number; sayi: number }>>([]);

  // Sailing state
  const [seferler, setSeferler] = useState<SeferData[]>([]);
  const [sepetId, setSepetId] = useState(0);
  const [selectedSeferId, setSelectedSeferId] = useState(0);

  // Passenger state
  const [yolcular, setYolcular] = useState<YolcuData[]>([]);
  const [toplamFiyat, setToplamFiyat] = useState(0);

  // Load routes on mount
  useEffect(() => {
    fetch("/api/akgunler/routes")
      .then((r) => r.json())
      .then((data) => {
        setGuzergahlar(data.guzergahlar ?? []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  async function handleRouteSearch(params: {
    guzergah: GuzergahData;
    cikisSehirId: number;
    varisSehirId: number;
    tarih: string;
    yolcuTurleri: Array<{ id: number; sayi: number }>;
  }) {
    setError(null);
    setLoading(true);
    setSelectedGuzergah(params.guzergah);
    setCikisSehirId(params.cikisSehirId);
    setVarisSehirId(params.varisSehirId);
    setTarih(params.tarih);
    setYolcuSayilari(params.yolcuTurleri);

    try {
      const sp = new URLSearchParams({
        sc_id: String(params.cikisSehirId),
        sv_id: String(params.varisSehirId),
        tarih: params.tarih,
        y_mod: "tek-gidis",
        y_t: JSON.stringify(params.yolcuTurleri),
      });

      const res = await fetch(`/api/akgunler/sailings?${sp}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setSeferler(data.g_seferler ?? []);
      setSepetId(data.s_id ?? 0);
      setStep("sailing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sefer aranamadi");
    } finally {
      setLoading(false);
    }
  }

  async function handleSailingSelect(seferId: number) {
    setError(null);
    setLoading(true);
    setSelectedSeferId(seferId);

    try {
      const sp = new URLSearchParams({
        s_id: String(sepetId),
        gs_id: String(seferId),
        y_mod: "tek-gidis",
      });

      const res = await fetch(`/api/akgunler/passengers?${sp}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setYolcular(data.yolcular ?? []);
      setStep("passenger");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yolcu bilgileri yuklenemedi");
    } finally {
      setLoading(false);
    }
  }

  async function handlePassengerSubmit(yolcuBilgileri: Array<Record<string, unknown>>) {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/akgunler/passengers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ s_id: sepetId, yolcular: yolcuBilgileri }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setToplamFiyat(data.toplam_fiyat ?? 0);
      setStep("payment");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yolcu bilgileri gonderilemedi");
    } finally {
      setLoading(false);
    }
  }

  if (loading && step === "route") {
    return <p className="text-sm text-gray-500">Guzergahlar yukleniyor...</p>;
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="mb-6 flex gap-1 text-xs">
        {(["route", "sailing", "passenger", "payment"] as Step[]).map((s, i) => (
          <div
            key={s}
            className={`flex-1 rounded py-1.5 text-center ${
              step === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
            }`}
          >
            {i + 1}. {s === "route" ? "Guzergah" : s === "sailing" ? "Sefer" : s === "passenger" ? "Yolcu" : "Odeme"}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {loading && step !== "route" && (
        <p className="text-sm text-gray-500">Yukleniyor...</p>
      )}

      {!loading && step === "route" && (
        <RouteSelector
          guzergahlar={guzergahlar}
          onSearch={handleRouteSearch}
        />
      )}

      {!loading && step === "sailing" && (
        <SailingList
          seferler={seferler}
          onSelect={handleSailingSelect}
          onBack={() => setStep("route")}
        />
      )}

      {!loading && step === "passenger" && (
        <PassengerForm
          yolcular={yolcular}
          onSubmit={handlePassengerSubmit}
          onBack={() => setStep("sailing")}
        />
      )}

      {!loading && step === "payment" && (
        <PaymentForm
          sepetId={sepetId}
          toplamFiyat={toplamFiyat}
          onBack={() => setStep("passenger")}
        />
      )}
    </div>
  );
}
