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
  yolcu_turleri: Array<{ id: number; title: string; yolcu_kodu: string; yolcu_tipi: string }>;
  arac_turleri: Array<{ id: number; title: string; yolcu_kodu: string; yolcu_tipi: string }>;
  kabin_turleri: Array<{ id: number; title: string; yolcu_kodu: string; yolcu_tipi: string }>;
}

interface SeferData {
  id: number;
  sefer_tarih: string;
  gemi: string;
  ucret: number;
  formatted_price: string;
  secili_mi: boolean;
  trip_number?: string;
  full_date?: string;
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
  const [donusTarih, setDonusTarih] = useState<string | undefined>(undefined);
  const [tripType, setTripType] = useState<"tek-gidis" | "gidis-donus">("tek-gidis");
  const [yolcuSayilari, setYolcuSayilari] = useState<Array<{ id: number; sayi: number }>>([]);

  // Sailing state
  const [seferler, setSeferler] = useState<SeferData[]>([]);
  const [sepetId, setSepetId] = useState(0);
  const [selectedSeferId, setSelectedSeferId] = useState(0);

  // Passenger state
  const [yolcular, setYolcular] = useState<YolcuData[]>([]);
  const [toplamFiyat, setToplamFiyat] = useState(0);

  // Derived
  const cikisSehirAd =
    selectedGuzergah?.sehirler.find((s) => s.id === cikisSehirId)?.ad ?? "";
  const varisSehirAd =
    selectedGuzergah?.sehirler.find((s) => s.id === varisSehirId)?.ad ?? "";
  const selectedSefer = seferler.find((s) => s.id === selectedSeferId);
  const totalPassengers = yolcuSayilari.reduce((sum, y) => sum + y.sayi, 0);

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
    donusTarih?: string;
    tripType: "tek-gidis" | "gidis-donus";
    yolcuTurleri: Array<{ id: number; sayi: number }>;
  }) {
    setError(null);
    setLoading(true);
    setSelectedGuzergah(params.guzergah);
    setCikisSehirId(params.cikisSehirId);
    setVarisSehirId(params.varisSehirId);
    setTarih(params.tarih);
    setDonusTarih(params.donusTarih);
    setTripType(params.tripType);
    setYolcuSayilari(params.yolcuTurleri);

    try {
      const spParams: Record<string, string> = {
        sc_id: String(params.cikisSehirId),
        sv_id: String(params.varisSehirId),
        tarih: params.tarih,
        y_mod: params.tripType,
        y_t: JSON.stringify(params.yolcuTurleri),
      };
      if (params.tripType === "gidis-donus" && params.donusTarih) {
        spParams.d_tarih = params.donusTarih;
      }
      const sp = new URLSearchParams(spParams);

      const res = await fetch(`/api/akgunler/sailings?${sp}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSeferler(data.g_seferler ?? []);
      setSepetId(data.s_id ?? 0);
      setStep("sailing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sefer aranamadı");
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
        y_mod: tripType,
      });

      const res = await fetch(`/api/akgunler/passengers?${sp}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setYolcular(data.yolcular ?? []);
      setStep("passenger");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yolcu bilgileri yüklenemedi");
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
      setError(err instanceof Error ? err.message : "Yolcu bilgileri gönderilemedi");
    } finally {
      setLoading(false);
    }
  }

  /* ───── HERO (step route) ───── */
  if (step === "route") {
    return (
      <div>
        {/* Hero */}
        <section className="bg-[#0C1829] px-4 pb-24 pt-16">
          <div className="mx-auto max-w-2xl">
            {/* Badge */}
            <div className="mb-7 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-medium tracking-wide text-white/75">
                <svg className="h-3.5 w-3.5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Resmi Akgünler Denizcilik Acentesi
              </span>
            </div>

            {/* Headline */}
            <div className="mb-10 text-center">
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Anamur
                <span className="mx-3 font-light text-blue-400">—</span>
                Girne
              </h1>
              <p className="mt-3 text-base text-white/55">
                Feribot bileti · Resmi acente · Anlık teslim
              </p>
            </div>

            {/* Search card */}
            <div className="rounded-2xl bg-white p-6 shadow-2xl md:p-8">
              {loading ? (
                <SearchSkeleton />
              ) : (
                <>
                  {error && (
                    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {error}
                    </div>
                  )}
                  <RouteSelector guzergahlar={guzergahlar} onSearch={handleRouteSearch} />
                </>
              )}
            </div>

            {/* Trust strip */}
            <div className="mt-7 flex flex-wrap justify-center gap-6 text-xs text-white/40">
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-white/30" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
                3D Secure Ödeme
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-white/30" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
                Lisanslı Acente
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-white/30" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                7/24 Destek
              </span>
            </div>
          </div>
        </section>

        {/* Route info strip */}
        <section className="border-b border-slate-100 bg-white px-4 py-10">
          <div className="mx-auto max-w-2xl">
            <div className="flex flex-col items-center gap-6 text-center md:flex-row md:gap-0 md:text-left">
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Kalkış Limanı
                </p>
                <p className="mt-1.5 text-xl font-bold text-slate-900">Anamur Limanı</p>
                <p className="mt-0.5 text-sm text-slate-500">Mersin, Türkiye</p>
              </div>
              <div className="flex flex-col items-center gap-1 px-8">
                <svg
                  className="h-8 w-8 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 2.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z"
                  />
                </svg>
                <p className="text-xs font-medium text-slate-400">~2sa 30dk</p>
              </div>
              <div className="flex-1 md:text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Varış Limanı
                </p>
                <p className="mt-1.5 text-xl font-bold text-slate-900">Girne Limanı</p>
                <p className="mt-0.5 text-sm text-slate-500">Girne, KKTC</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  /* ───── CONTENT STEPS (sailing / passenger / payment) ───── */
  const contentSteps = ["sailing", "passenger", "payment"] as const;
  const currentIdx = contentSteps.indexOf(step as typeof contentSteps[number]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-5xl px-4">
          {/* Search summary */}
          <div className="flex items-center gap-3 py-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-semibold text-slate-900">
                {cikisSehirAd} → {varisSehirAd}
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-600">{tarih}</span>
              {donusTarih && (
                <>
                  <span className="text-slate-300">→</span>
                  <span className="text-slate-600">{donusTarih}</span>
                </>
              )}
              {totalPassengers > 0 && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-600">{totalPassengers} Yolcu</span>
                </>
              )}
            </div>
            <button
              onClick={() => setStep("route")}
              className="ml-auto shrink-0 text-xs font-semibold text-blue-600 transition hover:text-blue-700"
            >
              Değiştir
            </button>
          </div>

          {/* Step progress */}
          <div className="-mx-4 flex border-t border-slate-100">
            {contentSteps.map((s, i) => (
              <div
                key={s}
                className={`flex-1 border-b-2 py-2 text-center text-xs font-semibold transition-colors ${
                  i === currentIdx
                    ? "border-blue-600 text-blue-600"
                    : i < currentIdx
                    ? "border-slate-200 text-slate-400"
                    : "border-transparent text-slate-300"
                }`}
              >
                {i + 1}.{" "}
                {s === "sailing" ? "Sefer Seç" : s === "passenger" ? "Yolcu Bilgileri" : "Ödeme"}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="mx-auto max-w-5xl px-4 pt-5">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3">
            <svg
              className="h-5 w-5 animate-spin text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-sm font-medium text-slate-500">Yükleniyor…</span>
          </div>
        </div>
      )}

      {/* Content */}
      {!loading && (
        <div className="mx-auto max-w-5xl px-4 py-8">
          {step === "sailing" && (
            <SailingList
              seferler={seferler}
              onSelect={handleSailingSelect}
              onBack={() => setStep("route")}
            />
          )}
          {step === "passenger" && (
            <PassengerForm
              yolcular={yolcular}
              onSubmit={handlePassengerSubmit}
              onBack={() => setStep("sailing")}
              sefer={selectedSefer}
              cikisSehirAd={cikisSehirAd}
              varisSehirAd={varisSehirAd}
            />
          )}
          {step === "payment" && (
            <PaymentForm
              sepetId={sepetId}
              toplamFiyat={toplamFiyat}
              onBack={() => setStep("passenger")}
              sefer={selectedSefer}
              cikisSehirAd={cikisSehirAd}
              varisSehirAd={varisSehirAd}
              yolcular={yolcular}
            />
          )}
        </div>
      )}
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 w-32 rounded-lg bg-slate-200" />
      <div className="grid grid-cols-3 gap-2">
        <div className="h-12 rounded-xl bg-slate-100" />
        <div className="h-12 rounded-xl bg-slate-100" />
        <div className="h-12 rounded-xl bg-slate-100" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="h-12 rounded-xl bg-slate-100" />
        <div className="h-12 rounded-xl bg-slate-100" />
      </div>
      <div className="h-12 rounded-xl bg-slate-200" />
    </div>
  );
}
