"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ProcessingOverlay } from "./processing-overlay";

type TripType = "tek-gidis" | "gidis-donus";

interface YolcuTur {
  id: number;
  title: string;
  yolcu_kodu: string;
  yolcu_tipi: string;
}

interface GuzergahData {
  id: number;
  baslik: string;
  sehirler: Array<{ id: number; ad: string }>;
  yolcu_turleri: YolcuTur[];
  arac_turleri: YolcuTur[];
  kabin_turleri: YolcuTur[];
}

interface SeferData {
  id: number;
  sefer_tarih: string;
  full_date?: string;
  trip_number?: string;
  gemi: string;
  ucret: number;
  formatted_price: string;
  secili_mi?: boolean;
}

interface YolcuData {
  yolcu_id: number;
  yolcu_tur_id: number;
  yolcu_tipi: "insan" | "diger" | "kabin";
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
}

interface Ulke {
  id: number;
  title: string;
  ulke_kodu: string;
}

interface YolcuSayi {
  id: number;
  sayi: number;
}

interface BookingSearchState {
  guzergahId: number;
  cikisSehirId: number;
  varisSehirId: number;
  gidisTarihi: string;
  donusTarihi: string;
  tripType: TripType;
  yolcuTurleri: YolcuSayi[];
}

interface BookingSession {
  id: string;
  guzergahlar: GuzergahData[];
  search: BookingSearchState;
  sailings: {
    s_id: number;
    g_seferler: SeferData[];
    d_seferler: SeferData[];
  };
  selected: {
    gidisSeferId: number | null;
    donusSeferId: number | null;
  };
  passengers?: {
    yolcular: YolcuData[];
    toplamFiyat?: number;
  };
}

interface CheckoutPayload {
  formAction: string;
  formParams: Record<string, string>;
}

interface ScheduleRouteLink {
  title: string;
  href: string;
  mod: string;
  slug: string;
}

interface ScheduleTrip {
  direction: string;
  time: string;
  vessel: string;
}

interface ScheduleDay {
  date: string;
  weekday: string;
  trips: ScheduleTrip[];
}

interface SchedulePayload {
  sourceUrl: string;
  selectedRoute: ScheduleRouteLink | null;
  routes: ScheduleRouteLink[];
  directions: string[];
  days: ScheduleDay[];
}

const SESSION_KEY = "antso-public-booking-session:";
const DEFAULT_DURATION_MINUTES = 150;
const FIELD_CLASS =
  "h-[58px] w-full rounded-[18px] border border-slate-200 bg-white pl-12 pr-4 text-[15px] font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-ocean";
const HERO_FIELD_CLASS =
  "h-[56px] w-full rounded-xl border-none bg-[#eff4f7] pl-12 pr-4 text-[15px] font-medium text-[#171d1e] outline-none transition focus:ring-2 focus:ring-[#34a8b3]";

const PASSENGER_LABELS = [
  "Yetişkin (12+)",
  "Öğrenci",
  "Gazi / Diplomat",
  "Bebek (0-2 Yaş)",
  "Bebek (3-6 Yaş)",
  "Çocuk (7-12 Yaş)",
  "Asker/Subay",
  "Subay Ailesi",
];

const CABIN_LABELS = ["2 Kişilik Kabin", "4 Kişilik Kabin"];
// Fallback used only when Akgünler API is unreachable (e.g. CF block).
// IDs are placeholders — real IDs load from API when available.
const REFERENCE_HOME_ROUTE: GuzergahData = {
  id: 1,
  baslik: "Anamur - Girne",
  sehirler: [
    { id: 1, ad: "Anamur" },
    { id: 2, ad: "Girne" },
  ],
  yolcu_turleri: [
    { id: 1, title: "Sivil", yolcu_kodu: "SIV", yolcu_tipi: "insan" },
    { id: 2, title: "Öğrenci", yolcu_kodu: "OGR", yolcu_tipi: "insan" },
    { id: 3, title: "Asker", yolcu_kodu: "ASK", yolcu_tipi: "insan" },
  ],
  arac_turleri: [
    { id: 10, title: "Otomobil", yolcu_kodu: "OTO", yolcu_tipi: "diger" },
    { id: 11, title: "Motosiklet", yolcu_kodu: "MOT", yolcu_tipi: "diger" },
  ],
  kabin_turleri: [],
};

function makeSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readStoredSession(sessionId: string): BookingSession | null {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(`${SESSION_KEY}${sessionId}`);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as BookingSession;
  } catch {
    return null;
  }
}

function saveStoredSession(session: BookingSession) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(`${SESSION_KEY}${session.id}`, JSON.stringify(session));
}

function formatDateForApi(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

// HTML <input type="date"> YYYY-MM-DD döner; Akgünler d/m/Y bekler.
function formatBirthDateForApi(value: string) {
  if (!value) return "";
  if (value.includes("/")) return value;
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatDateLabel(value: string) {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("tr-TR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function parseTimeToMinutes(value: string) {
  const match = value.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function minutesToTime(value: number) {
  const normalized = ((value % 1440) + 1440) % 1440;
  const hour = String(Math.floor(normalized / 60)).padStart(2, "0");
  const minute = String(normalized % 60).padStart(2, "0");
  return `${hour}:${minute}`;
}

function inferArrivalTime(timeLabel: string) {
  const minutes = parseTimeToMinutes(timeLabel);
  if (minutes === null) return "--:--";
  return minutesToTime(minutes + DEFAULT_DURATION_MINUTES);
}

function buildPassengerSummary(guzergah: GuzergahData | null, value: YolcuSayi[]) {
  if (!guzergah) return "Yolcu ve araç seçin";

  const all = [
    ...guzergah.yolcu_turleri,
    ...guzergah.kabin_turleri,
    ...guzergah.arac_turleri,
  ];

  const labels = value
    .filter((item) => item.sayi > 0)
    .map((item) => {
      const found = all.find((entry) => entry.id === item.id);
      return found ? `${item.sayi} ${found.title}` : null;
    })
    .filter(Boolean);

  return labels.length > 0 ? labels.join(", ") : "Yolcu ve araç seçin";
}

function getSelectedGuzergah(guzergahlar: GuzergahData[], search: BookingSearchState) {
  return guzergahlar.find((item) => item.id === search.guzergahId) ?? null;
}

function getPortName(guzergahlar: GuzergahData[], search: BookingSearchState, type: "from" | "to") {
  const guzergah = getSelectedGuzergah(guzergahlar, search);
  if (!guzergah) return "";

  const id = type === "from" ? search.cikisSehirId : search.varisSehirId;
  return guzergah.sehirler.find((item) => item.id === id)?.ad ?? "";
}

function buildDefaultSearch(guzergahlar: GuzergahData[]): BookingSearchState {
  const first = guzergahlar[0];
  const firstPassenger = first?.yolcu_turleri[0];

  // Antso: Anamur kalkış, Girne varış varsayılan
  const anamur = first?.sehirler.find((s) => s.ad.toLowerCase().includes("anamur"));
  const girne = first?.sehirler.find((s) => s.ad.toLowerCase().includes("girne"));

  return {
    guzergahId: first?.id ?? 0,
    cikisSehirId: anamur?.id ?? first?.sehirler[0]?.id ?? 0,
    varisSehirId: girne?.id ?? first?.sehirler[1]?.id ?? 0,
    gidisTarihi: "",
    donusTarihi: "",
    tripType: "tek-gidis",
    yolcuTurleri: firstPassenger ? [{ id: firstPassenger.id, sayi: 1 }] : [],
  };
}

function getCount(items: YolcuSayi[], id: number) {
  return items.find((item) => item.id === id)?.sayi ?? 0;
}

function updateCount(items: YolcuSayi[], id: number, next: number) {
  if (next <= 0) return items.filter((item) => item.id !== id);
  if (items.some((item) => item.id === id)) {
    return items.map((item) => (item.id === id ? { ...item, sayi: next } : item));
  }
  return [...items, { id, sayi: next }];
}

function getDisplayPrice(session: BookingSession) {
  if (typeof session.passengers?.toplamFiyat === "number") {
    return session.passengers.toplamFiyat;
  }

  return (session.passengers?.yolcular ?? []).reduce(
    (sum, item) => sum + (item.toplam_fiyat_genel ?? 0),
    0
  );
}

// Akgünler API fiyatları kuruş (×100) olarak döner. TL'ye çevir.
function toLira(kurus: number) {
  return (kurus ?? 0) / 100;
}

function getTripSelectionReady(session: BookingSession) {
  if (!session.selected.gidisSeferId) return false;
  if (session.search.tripType === "gidis-donus" && !session.selected.donusSeferId) return false;
  return true;
}

export function PublicBookingHome() {
  const router = useRouter();
  // Form hemen render edilsin — Anamur-Girne varsayılanıyla başla,
  // fetch arka planda route bilgisini günceller.
  const [guzergahlar, setGuzergahlar] = useState<GuzergahData[]>([REFERENCE_HOME_ROUTE]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/akgunler/routes")
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) {
          throw new Error(json.error ?? "Güzergah bilgisi alınamadı.");
        }
        if (json.guzergahlar?.length) {
          setGuzergahlar(json.guzergahlar);
        }
      })
      .catch((requestError) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Güzergah bilgisi alınamadı."
        );
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#f5fafc] text-[#171d1e]">
      <section
        id="bilet-al"
        className="relative z-10 flex min-h-[640px] flex-col items-center justify-center px-6 py-20"
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/hero-sea.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b1e2e]/20 via-transparent to-[#f5fafccc]" />

        <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center pt-8 text-center">
          <div className="mb-8 w-full">
            <h1 className="font-headline mx-auto max-w-5xl animate-hero-title text-3xl font-extrabold tracking-[-0.04em] text-white opacity-0 sm:text-4xl md:text-5xl lg:text-6xl">
              HIZLI VE KONFORLU SEYAHATİN
              <span className="block">AYRICALIĞINI YAŞAYIN</span>
            </h1>
            <p className="mx-auto mt-4 max-w-full animate-hero-sub px-2 text-sm font-medium leading-6 text-white/90 opacity-0 md:whitespace-nowrap md:text-base lg:text-lg">
              Akdeniz&apos;in Kıbrıs&apos;a en yakın noktası Anamur&apos;dan Girne&apos;ye sadece 1 Saat 45 Dakikada Ulaşın.
            </p>
          </div>

          <div className="w-full rounded-[2rem] bg-white/20 p-2 shadow-[0_24px_48px_-12px_rgba(23,29,30,0.08)] backdrop-blur-[12px]">
            <div className="rounded-[1.75rem] bg-white p-6 md:p-8">
              <BookingSearchCard
                guzergahlar={guzergahlar}
                variant="hero"
                submitLabel="Sefer Ara"
                onSearchComplete={(sessionId) => router.push(`/voyages/${sessionId}`)}
              />
              {error && (
                <p className="mt-5 text-left text-sm font-medium text-amber-700">
                  Sefer sorgulama şu an geçici olarak kullanılamamaktadır. Kısa süre içinde tekrar deneyin.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <WhyChooseUsSection />

    </div>
  );
}

function useInView<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, ...options }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [options]);

  return { ref, inView };
}

const FEATURES = [
  {
    title: "EN YAKIN ROTA",
    description:
      "Kıbrıs'a en yakın noktada bulunan Antso Limanı'ndan, Girne'ye 1,5 saatte ulaşın.",
    icon: (
      <svg viewBox="0 0 64 64" fill="none" className="h-full w-full">
        <path d="M32 8c-7.18 0-13 5.82-13 13 0 9.75 13 25 13 25s13-15.25 13-25c0-7.18-5.82-13-13-13z" fill="#0f2d4c" />
        <circle cx="32" cy="21" r="5" fill="#fff" />
        <path d="M8 50c6-2 10-2 14 0s10 2 14 0 8-2 12 0 6 2 8 1" stroke="#7fb8d1" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    title: "KONFORLU SEYAHAT",
    description:
      "Yolcularımıza özel güvenlik standartları ve üstün konfor özelliklerinden faydalanın.",
    icon: (
      <svg viewBox="0 0 64 64" fill="none" className="h-full w-full">
        <circle cx="26" cy="18" r="7" stroke="#0f2d4c" strokeWidth="2.5" fill="none" />
        <path d="M18 54V36c0-4 3-7 8-7s8 3 8 7v18" stroke="#0f2d4c" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <rect x="36" y="30" width="14" height="22" rx="2" fill="#7fb8d1" />
        <path d="M40 30v-5h6v5" stroke="#0f2d4c" strokeWidth="2" fill="none" />
        <circle cx="22" cy="14" r="3" fill="#7fb8d1" />
        <path d="M19 14l2 2 4-4" stroke="#0f2d4c" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    title: "HIZLI ULAŞIM",
    description:
      "350 metre uzunluğunda hizmet veren iskelemize 2 adet gemi yanaşabilmektedir.",
    icon: (
      <svg viewBox="0 0 64 64" fill="none" className="h-full w-full">
        <path d="M12 42h40l-4 8H16l-4-8z" fill="#0f2d4c" />
        <path d="M18 42V28h28v14" fill="#0f2d4c" />
        <rect x="22" y="22" width="20" height="6" fill="#0f2d4c" />
        <rect x="30" y="16" width="4" height="6" fill="#0f2d4c" />
        <rect x="24" y="32" width="4" height="4" fill="#fff" />
        <rect x="32" y="32" width="4" height="4" fill="#fff" />
        <rect x="40" y="32" width="4" height="4" fill="#fff" />
        <path d="M6 54c4-2 8-2 12 0s8 2 12 0 8-2 12 0 8 2 12 0 6-2 8-1" stroke="#7fb8d1" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    title: "GÜVENLİ ÖDEME",
    description:
      "Güvenli ödeme sistemimiz sayesinde kişisel bilgileriniz daima güvende rahat edin.",
    icon: (
      <svg viewBox="0 0 64 64" fill="none" className="h-full w-full">
        <rect x="8" y="18" width="42" height="28" rx="3" fill="#0f2d4c" />
        <rect x="8" y="24" width="42" height="6" fill="#7fb8d1" />
        <rect x="14" y="36" width="10" height="4" rx="1" fill="#fff" />
        <path d="M42 30l12 3v8c0 7-5 11-12 13-7-2-12-6-12-13v-8l12-3z" fill="#7fb8d1" stroke="#0f2d4c" strokeWidth="2" />
        <path d="M36 40l4 4 8-8" stroke="#0f2d4c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    ),
  },
];

function WhyChooseUsSection() {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <section className="relative overflow-hidden bg-white py-24">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-16 select-none text-center font-headline text-[80px] font-extrabold uppercase leading-none tracking-tight text-[#e2eef5]/70 md:text-[140px]"
      >
        Anamur Deniz
        <br />
        Otobüsleri
      </span>

      <div ref={ref} className="relative mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <p className="mb-3 flex items-center justify-center gap-3 text-sm font-semibold uppercase tracking-[0.22em] text-[#56b9d0]">
            <span className="h-px w-8 bg-[#56b9d0]" />
            Anamur Deniz Otobüsleri
            <span className="h-px w-8 bg-[#56b9d0]" />
          </p>
          <h2 className="font-headline text-3xl font-extrabold tracking-tight text-[#0f2d4c] md:text-5xl">
            NEDEN BİZİ TERCİH ETMELİSİNİZ
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, index) => (
            <div
              key={feature.title}
              style={{ transitionDelay: `${index * 120}ms` }}
              className={`group relative flex flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white px-6 py-10 text-center shadow-sm transition-all duration-700 ease-out hover:-translate-y-2 hover:border-[#56b9d0]/50 hover:shadow-[0_20px_40px_-12px_rgba(15,45,76,0.18)] ${
                inView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
              }`}
            >
              <div className="mx-auto mb-6 h-24 w-24 transition-transform duration-500 group-hover:scale-110">
                {feature.icon}
              </div>
              <h3 className="mb-4 font-headline text-lg font-extrabold tracking-wide text-[#0f2d4c]">
                {feature.title}
              </h3>
              <p className="text-sm leading-6 text-slate-500">{feature.description}</p>
              <span className="absolute bottom-0 right-0 h-0 w-0 border-b-[18px] border-l-[18px] border-b-[#56b9d0]/50 border-l-transparent transition-all duration-500 group-hover:border-b-[24px] group-hover:border-l-[24px]" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReferenceHeroSearchCard({
  guzergahlar,
  onSearchComplete,
}: {
  guzergahlar: GuzergahData[];
  onSearchComplete: (sessionId: string) => void;
}) {
  const [search, setSearch] = useState(() => {
    const initial = buildDefaultSearch(guzergahlar);
    return {
      ...initial,
      tripType: "tek-gidis" as TripType,
      yolcuTurleri: [{ id: 1, sayi: 1 }],
    };
  });
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const first = buildDefaultSearch(guzergahlar);
    setSearch({
      ...first,
      tripType: "tek-gidis",
      yolcuTurleri: [{ id: 1, sayi: 1 }],
    });
  }, [guzergahlar]);

  const guzergah = getSelectedGuzergah(guzergahlar, search);
  const sehirler = guzergah?.sehirler ?? [];
  const isGidisDonus = search.tripType === "gidis-donus";
  const isValid =
    search.cikisSehirId &&
    search.varisSehirId &&
    search.gidisTarihi &&
    (!isGidisDonus || !!search.donusTarihi);

  function setTripType(type: TripType) {
    setSearch((cur) => ({ ...cur, tripType: type, donusTarihi: type === "tek-gidis" ? "" : cur.donusTarihi }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isValid) return;

    setError(null);
    setOverlayOpen(true);

    try {
      const query = new URLSearchParams({
        sc_id: String(search.cikisSehirId),
        sv_id: String(search.varisSehirId),
        tarih: formatDateForApi(search.gidisTarihi),
        y_mod: search.tripType,
        y_t: JSON.stringify(search.yolcuTurleri),
      });
      if (isGidisDonus && search.donusTarihi) {
        query.set("d_tarih", formatDateForApi(search.donusTarihi));
      }

      const response = await fetch(`/api/akgunler/sailings?${query}`);
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Seferler getirilemedi.");
      }

      const id = makeSessionId();
      saveStoredSession({
        id,
        guzergahlar,
        search: { ...search },
        sailings: {
          s_id: json.s_id ?? 0,
          g_seferler: json.g_seferler ?? [],
          d_seferler: json.d_seferler ?? [],
        },
        selected: { gidisSeferId: null, donusSeferId: null },
      });

      onSearchComplete(id);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Seferler getirilemedi."
      );
    } finally {
      setOverlayOpen(false);
    }
  }

  return (
    <>
      <ProcessingOverlay
        open={overlayOpen}
        title="İşleminiz Yapılıyor. Lütfen Bekleyiniz."
        description="Seçtiğiniz rota için en uygun sefer seçenekleri hazırlanıyor."
      />

      <div className="space-y-4">
        {/* Trip type toggle */}
        <div className="flex gap-2">
          {(["tek-gidis", "gidis-donus"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setTripType(type)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                search.tripType === type
                  ? "bg-[#006971] text-white"
                  : "bg-[#eff4f7] text-[#595f61] hover:bg-[#e2ecef]"
              }`}
            >
              <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 ${search.tripType === type ? "border-white" : "border-[#595f61]"}`}>
                {search.tripType === type && <span className="block h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              {type === "tek-gidis" ? "Tek Yön" : "Gidiş – Dönüş"}
            </button>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          className={`grid grid-cols-1 items-end gap-4 ${isGidisDonus ? "md:grid-cols-5" : "md:grid-cols-4"}`}
        >
          <ReferenceSelectField
            label="Kalkış Limanı"
            icon="departure"
            value={String(search.cikisSehirId)}
            onChange={(value) => setSearch((cur) => ({ ...cur, cikisSehirId: Number(value) }))}
            options={sehirler.map((item) => ({ value: String(item.id), label: item.ad }))}
          />
          <ReferenceSelectField
            label="Varış Limanı"
            icon="arrival"
            value={String(search.varisSehirId)}
            onChange={(value) => setSearch((cur) => ({ ...cur, varisSehirId: Number(value) }))}
            options={sehirler
              .filter((item) => item.id !== search.cikisSehirId)
              .map((item) => ({ value: String(item.id), label: item.ad }))}
          />
          <ReferenceDateField
            label="Gidiş Tarihi"
            value={search.gidisTarihi}
            onChange={(value) =>
              setSearch((cur) => ({
                ...cur,
                gidisTarihi: value,
                donusTarihi: cur.donusTarihi && value > cur.donusTarihi ? "" : cur.donusTarihi,
              }))
            }
          />
          {isGidisDonus && (
            <ReferenceDateField
              label="Dönüş Tarihi"
              value={search.donusTarihi}
              min={search.gidisTarihi}
              onChange={(value) => setSearch((cur) => ({ ...cur, donusTarihi: value }))}
            />
          )}
          <button
            type="submit"
            disabled={!isValid}
            className="antso-shimmer relative flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#006971] text-lg font-bold text-white shadow-[0_14px_30px_rgba(0,105,113,0.32)] transition hover:bg-[#00565c] hover:shadow-[0_18px_40px_rgba(0,105,113,0.42)] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#006971]/75 disabled:shadow-none"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.2-5.2M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Sefer Ara
          </button>
        </form>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700">
          {error}
        </div>
      )}
    </>
  );
}

function ReferenceSelectField({
  label,
  value,
  onChange,
  options,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  icon: "departure" | "arrival";
}) {
  return (
    <label className="space-y-2">
      <span className="ml-1 block text-xs font-bold uppercase tracking-[0.22em] text-[#595f61]">
        {label}
      </span>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#006971]">
          <FerryPortIcon className="h-5 w-5" direction={icon} />
        </span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-14 w-full appearance-none rounded-xl border-none bg-[#eff4f7] pl-12 pr-4 text-[15px] font-medium text-[#171d1e] outline-none transition focus:ring-2 focus:ring-[#34a8b3]"
        >
          <option value="">Seçiniz</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

const CAL_DAY_NAMES = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];
const CAL_MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromISODate(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function CalendarMonthGrid({
  year,
  month,
  selected,
  minDate,
  onPick,
}: {
  year: number;
  month: number;
  selected: Date | null;
  minDate: Date;
  onPick: (d: Date) => void;
}) {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="w-[240px]">
      <div className="mb-3 text-center text-sm font-semibold text-slate-800">
        {CAL_MONTH_NAMES[month]} {year}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {CAL_DAY_NAMES.map((d) => (
          <div key={d} className="py-1 text-center text-[11px] font-semibold text-slate-400">
            {d}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`e-${i}`} className="h-8" />;
          const disabled = date < minDate;
          const isSelected = selected ? sameDay(date, selected) : false;
          const isToday = sameDay(date, today);
          return (
            <button
              key={date.getTime()}
              type="button"
              disabled={disabled}
              onClick={() => onPick(date)}
              className={`h-8 rounded-md text-xs font-medium transition-colors ${
                disabled
                  ? "cursor-not-allowed text-slate-300"
                  : isSelected
                    ? "bg-[#006971] text-white shadow-sm"
                    : isToday
                      ? "ring-1 ring-[#006971]/50 text-[#006971] hover:bg-[#006971]/10"
                      : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AntsoDatePicker({
  label,
  value,
  min,
  disabled,
  onChange,
  variant = "hero",
}: {
  label: string;
  value: string;
  min?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  variant?: "hero" | "compact";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = (min ? fromISODate(min) : null) ?? today;
  const selected = fromISODate(value);

  const [viewDate, setViewDate] = useState<Date>(() => {
    const base = selected ?? minDate;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  useEffect(() => {
    if (!open) return;
    const base = selected ?? minDate;
    setViewDate(new Date(base.getFullYear(), base.getMonth(), 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const viewYear1 = viewDate.getFullYear();
  const viewMonth1 = viewDate.getMonth();
  const viewMonth2 = viewMonth1 === 11 ? 0 : viewMonth1 + 1;
  const viewYear2 = viewMonth1 === 11 ? viewYear1 + 1 : viewYear1;

  const goBack = () =>
    setViewDate(new Date(viewYear1, viewMonth1 - 1, 1));
  const goForward = () =>
    setViewDate(new Date(viewYear1, viewMonth1 + 1, 1));

  const handlePick = (d: Date) => {
    onChange(toISODate(d));
    setOpen(false);
  };

  const displayValue = selected
    ? selected.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" })
    : "gg.aa.yyyy";

  const triggerClass = variant === "hero"
    ? `${HERO_FIELD_CLASS} flex items-center text-left`
    : `${FIELD_CLASS} flex items-center text-left`;

  const labelClass = variant === "hero"
    ? "ml-1 block text-xs font-bold uppercase tracking-[0.22em] text-[#595f61]"
    : "mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400";

  const iconColor = variant === "hero" ? "text-[#006971]" : "text-[#10253d]";

  return (
    <div ref={ref} className="relative">
      <span className={labelClass}>{label}</span>
      <div className="relative mt-2">
        <span className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${iconColor}`}>
          <CalendarIcon className="h-5 w-5" />
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className={`${triggerClass} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        >
          <span className={selected ? "text-slate-900" : "text-slate-400"}>
            {displayValue}
          </span>
        </button>
      </div>
      {open && !disabled && (
        <div className="absolute left-0 top-full z-50 mt-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_24px_48px_rgba(15,23,42,0.12)]">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={goBack}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100"
              aria-label="Önceki ay"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={goForward}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100"
              aria-label="Sonraki ay"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="flex flex-col gap-6 md:flex-row">
            <CalendarMonthGrid
              year={viewYear1}
              month={viewMonth1}
              selected={selected}
              minDate={minDate}
              onPick={handlePick}
            />
            <div className="hidden md:block">
              <CalendarMonthGrid
                year={viewYear2}
                month={viewMonth2}
                selected={selected}
                minDate={minDate}
                onPick={handlePick}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReferenceDateField({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  onChange: (value: string) => void;
}) {
  return (
    <AntsoDatePicker label={label} value={value} min={min} onChange={onChange} variant="hero" />
  );
}

export function PublicBookingResultsPage({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<BookingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = readStoredSession(sessionId);
    setSession(stored);
    setLoading(false);
  }, [sessionId]);

  const summary = useMemo(() => {
    if (!session) return null;

    const guzergah = getSelectedGuzergah(session.guzergahlar, session.search);
    const from = getPortName(session.guzergahlar, session.search, "from");
    const to = getPortName(session.guzergahlar, session.search, "to");
    const gidis = session.sailings.g_seferler.find(
      (item) => item.id === session.selected.gidisSeferId
    );
    const donus = session.sailings.d_seferler.find(
      (item) => item.id === session.selected.donusSeferId
    );

    return { guzergah, from, to, gidis, donus };
  }, [session]);

  function persist(nextSession: BookingSession) {
    saveStoredSession(nextSession);
    setSession(nextSession);
  }

  async function handleContinue() {
    if (!session || !getTripSelectionReady(session)) return;

    setBusy(true);
    setError(null);

    try {
      const search = new URLSearchParams({
        s_id: String(session.sailings.s_id),
        gs_id: String(session.selected.gidisSeferId),
        y_mod: session.search.tripType,
      });

      if (session.selected.donusSeferId) {
        search.set("ds_id", String(session.selected.donusSeferId));
      }

      const response = await fetch(`/api/akgunler/passengers?${search}`);
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error ?? "Yolcu bilgileri hazırlanamadı.");
      }

      const nextSession: BookingSession = {
        ...session,
        passengers: {
          yolcular: json.yolcular ?? [],
        },
      };

      persist(nextSession);
      router.push(`/voyages/${session.id}/book`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Yolcu bilgileri hazırlanamadı."
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <PageSkeleton />;
  }

  if (!session || !summary) {
    return <MissingSessionCard />;
  }

  const totalPrice = toLira(
    (summary.gidis?.ucret ?? 0) + (summary.donus?.ucret ?? 0)
  );

  const matchesDate = (item: SeferData, date: string) =>
    !date || (item.sefer_tarih ?? "").slice(0, 10) === date;

  const gidisItems = session.sailings.g_seferler.filter((item) =>
    matchesDate(item, session.search.gidisTarihi)
  );
  const donusItems = session.sailings.d_seferler.filter((item) =>
    matchesDate(item, session.search.donusTarihi)
  );

  return (
    <div className="min-h-screen bg-[#f3f5f8] pb-10">
      <section className="bg-[#10253d] pb-8 pt-4">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-3 flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-white/80 transition hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Ana sayfaya dön
            </Link>
          </div>
          <BookingSearchCard
            guzergahlar={session.guzergahlar}
            initialSearch={session.search}
            sessionId={session.id}
            variant="compact"
            submitLabel="Ara"
            onSearchComplete={(nextId) => {
              const stored = readStoredSession(nextId);
              setSession(stored);
              router.replace(`/voyages/${nextId}`);
            }}
          />
        </div>
      </section>

      <section className="-mt-3">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            {error && <ErrorPanel message={error} />}

            <TripListSection
              title="Gidiş Seferleri"
              subtitle={`${summary.from} → ${summary.to} · ${formatDateLabel(
                session.search.gidisTarihi
              )}`}
              dateLabel={formatDateLabel(session.search.gidisTarihi)}
              items={gidisItems}
              from={summary.from}
              to={summary.to}
              selectedId={session.selected.gidisSeferId}
              onSelect={(tripId) =>
                persist({
                  ...session,
                  selected: { ...session.selected, gidisSeferId: tripId },
                })
              }
            />

            {session.search.tripType === "gidis-donus" && (
              <TripListSection
                title="Dönüş Seferleri"
                subtitle={`${summary.to} → ${summary.from} · ${formatDateLabel(
                  session.search.donusTarihi
                )}`}
                dateLabel={formatDateLabel(session.search.donusTarihi)}
                items={donusItems}
                from={summary.to}
                to={summary.from}
                selectedId={session.selected.donusSeferId}
                onSelect={(tripId) =>
                  persist({
                    ...session,
                    selected: { ...session.selected, donusSeferId: tripId },
                  })
                }
              />
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_18px_46px_rgba(18,38,60,0.08)]">
              <p className="text-[13px] font-semibold text-[#10253d]">Sefer Özeti</p>

              <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                <SummaryBox
                  label="Rota"
                  value={`${summary.from} → ${summary.to}`}
                />
                <SummaryBox
                  label="Yolcular"
                  value={buildPassengerSummary(summary.guzergah, session.search.yolcuTurleri)}
                />
                <SummaryBox
                  label="Gidiş"
                  value={
                    summary.gidis
                      ? `${summary.gidis.sefer_tarih} · ${summary.gidis.gemi}`
                      : "Lütfen gidiş seferini seçiniz."
                  }
                />
                {session.search.tripType === "gidis-donus" && (
                  <SummaryBox
                    label="Dönüş"
                    value={
                      summary.donus
                        ? `${summary.donus.sefer_tarih} · ${summary.donus.gemi}`
                        : "Lütfen dönüş seferini seçiniz."
                    }
                  />
                )}
              </div>

              <div className="mt-5 rounded-[14px] bg-[#f5f8fb] px-4 py-4">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Toplam</span>
                  <span className="text-lg font-semibold text-slate-900">
                    {totalPrice.toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    TL
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleContinue}
                disabled={!getTripSelectionReady(session) || busy}
                className="mt-5 flex h-[48px] w-full items-center justify-center rounded-[12px] bg-[#1f4aa8] text-sm font-semibold text-white transition hover:bg-[#183f90] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {busy ? "Hazırlanıyor..." : "Devam Et"}
              </button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

export function PublicBookingCheckoutPage({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<BookingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [ulkeler, setUlkeler] = useState<Ulke[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutPayload, setCheckoutPayload] = useState<CheckoutPayload | null>(null);
  const autoFormRef = useRef<HTMLFormElement>(null);

  const [contact, setContact] = useState({
    email: "",
    phone: "",
    phone2: "",
  });
  const [payment, setPayment] = useState({
    holder: "",
    cardNumber: "",
    expMonth: "",
    expYear: "",
    cvv: "",
    agreed: false,
  });
  const [forms, setForms] = useState<Record<number, Record<string, unknown>>>({});

  useEffect(() => {
    const stored = readStoredSession(sessionId);
    setSession(stored);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    if (!session?.passengers?.yolcular?.length) return;

    const next: Record<number, Record<string, unknown>> = {};
    session.passengers.yolcular.forEach((yolcu, index) => {
      next[index] = {
        id: yolcu.yolcu_id,
        insan_ad: yolcu.insan_ad ?? "",
        insan_soyad: yolcu.insan_soyad ?? "",
        insan_cinsiyet: yolcu.insan_cinsiyet ?? "",
        insan_pasaport_no: yolcu.insan_pasaport_no ?? "",
        insan_dogum_tarihi: yolcu.insan_dogum_tarihi ?? "",
        insan_ulke_id: yolcu.insan_ulke_id ?? 0,
        vergi_tur_id: yolcu.vergi_tur_id ?? "",
      };
    });
    setForms(next);
    setContact((current) => ({
      ...current,
      phone: session.passengers?.yolcular?.[0]?.yolcu_tel_no ?? current.phone,
    }));
  }, [session]);

  useEffect(() => {
    fetch("/api/akgunler/countries")
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) return;
        setUlkeler(json.ulkeler ?? []);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (checkoutPayload && autoFormRef.current) {
      autoFormRef.current.submit();
    }
  }, [checkoutPayload]);

  function updatePassenger(index: number, field: string, value: string | number) {
    setForms((current) => ({
      ...current,
      [index]: {
        ...current[index],
        [field]: value,
      },
    }));
  }

  async function handleCheckoutSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!session?.passengers?.yolcular?.length) return;

    setSubmitting(true);
    setError(null);

    try {
      const yolcular = session.passengers.yolcular.map((yolcu, index) => ({
        id: yolcu.yolcu_id,
        insan_ad: String(forms[index]?.insan_ad ?? "").trim().toUpperCase(),
        insan_soyad: String(forms[index]?.insan_soyad ?? "").trim().toUpperCase(),
        insan_cinsiyet: String(forms[index]?.insan_cinsiyet ?? "") as "E" | "K",
        insan_pasaport_no: String(forms[index]?.insan_pasaport_no ?? "").trim(),
        insan_dogum_tarihi: formatBirthDateForApi(String(forms[index]?.insan_dogum_tarihi ?? "")),
        insan_ulke_id: Number(forms[index]?.insan_ulke_id ?? 0),
        vergi_tur_id: forms[index]?.vergi_tur_id
          ? Number(forms[index]?.vergi_tur_id)
          : undefined,
        yolcu_tel_no:
          index === 0
            ? contact.phone.trim()
            : index === 1 && contact.phone2.trim()
              ? contact.phone2.trim()
              : undefined,
      }));

      const passengerResponse = await fetch("/api/akgunler/passengers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          s_id: session.sailings.s_id,
          yolcular,
        }),
      });

      const passengerJson = await passengerResponse.json();
      if (!passengerResponse.ok) {
        throw new Error(passengerJson.error ?? "Yolcu bilgileri kaydedilemedi.");
      }

      const nextSession: BookingSession = {
        ...session,
        passengers: {
          yolcular: session.passengers?.yolcular ?? [],
          toplamFiyat: passengerJson.toplam_fiyat ?? getDisplayPrice(session),
        },
      };
      saveStoredSession(nextSession);
      setSession(nextSession);

      const checkoutResponse = await fetch("/api/akgunler/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sepetId: session.sailings.s_id,
          ccHolder: payment.holder.trim().toUpperCase(),
          ccNr: payment.cardNumber.replace(/\s/g, ""),
          ccCvc2: payment.cvv,
          ccExpMonth: payment.expMonth,
          ccExpYear: payment.expYear,
          email: contact.email.trim(),
        }),
      });

      const checkoutJson = await checkoutResponse.json();
      if (!checkoutResponse.ok) {
        throw new Error(checkoutJson.error ?? "Ödeme yönlendirmesi oluşturulamadı.");
      }

      setCheckoutPayload(checkoutJson as CheckoutPayload);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Ödeme işlemi başlatılamadı."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <PageSkeleton />;
  }

  if (!session || !session.passengers?.yolcular?.length) {
    return <MissingSessionCard />;
  }

  const from = getPortName(session.guzergahlar, session.search, "from");
  const to = getPortName(session.guzergahlar, session.search, "to");
  const gidis = session.sailings.g_seferler.find(
    (item) => item.id === session.selected.gidisSeferId
  );
  const donus = session.sailings.d_seferler.find(
    (item) => item.id === session.selected.donusSeferId
  );
  const totalPrice = toLira(getDisplayPrice(session));

  return (
    <div className="min-h-screen bg-[#f3f5f8] pb-10">
      {checkoutPayload && (
        <form
          ref={autoFormRef}
          method="POST"
          action={checkoutPayload.formAction}
          className="hidden"
        >
          {Object.entries(checkoutPayload.formParams).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
        </form>
      )}

      <section className="bg-[#10253d] py-5">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between gap-4 text-white">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#8ec4db]">
                Yolcu ve Ödeme
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Rezervasyon bilgilerinizi tamamlayın</h1>
            </div>
            <BrandLogo className="w-[104px]" imageClassName="h-auto w-full object-contain brightness-0 invert" />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 pt-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <form onSubmit={handleCheckoutSubmit} className="space-y-5">
          {error && <ErrorPanel message={error} />}

          <SectionCard title="Seyahat ile ilgili Uyarılar" compact>
            <ul className="space-y-2 text-sm leading-6 text-slate-600">
              <li>Check-in sırasında kimlik veya pasaport belgenizi yanınızda bulundurunuz.</li>
              <li>Yolcu bilgileri seyahat belgesindeki haliyle eksiksiz girilmelidir.</li>
              <li>Ödeme sonrasında biletleme işlemi Akgünler 3D Secure ekranında tamamlanır.</li>
            </ul>
          </SectionCard>

          <SectionCard title="İletişim Bilgisi" compact>
            <div className="grid gap-4 md:grid-cols-3">
              <FormField label="E-posta Adresi">
                <input
                  type="email"
                  required
                  value={contact.email}
                  onChange={(event) =>
                    setContact((current) => ({ ...current, email: event.target.value }))
                  }
                  className="h-[48px] w-full rounded-[14px] border border-slate-200 px-4 text-sm outline-none focus:border-brand-ocean"
                  placeholder="ornek@mail.com"
                />
              </FormField>
              <FormField label="Telefon #1">
                <input
                  type="tel"
                  required
                  value={contact.phone}
                  onChange={(event) =>
                    setContact((current) => ({ ...current, phone: event.target.value }))
                  }
                  className="h-[48px] w-full rounded-[14px] border border-slate-200 px-4 text-sm outline-none focus:border-brand-ocean"
                  placeholder="+90 5xx xxx xx xx"
                />
              </FormField>
              <FormField label="Telefon #2">
                <input
                  type="tel"
                  value={contact.phone2}
                  onChange={(event) =>
                    setContact((current) => ({ ...current, phone2: event.target.value }))
                  }
                  className="h-[48px] w-full rounded-[14px] border border-slate-200 px-4 text-sm outline-none focus:border-brand-ocean"
                  placeholder="+90 5xx xxx xx xx (opsiyonel)"
                />
              </FormField>
            </div>
            <p className="mt-3 flex items-start gap-2 rounded-[10px] bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
              <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
              </svg>
              <span>
                Olabilecek sefer saati/tarih değişikliklerinde girdiğiniz telefon numaralarına SMS ile bilgi verilecektir.
                Gideceğiniz ülkede açık ve SMS alabilecek bir numara olması gerekmektedir.
              </span>
            </p>
          </SectionCard>

          <SectionCard title="Yolcular">
            <div className="space-y-4">
              {session.passengers.yolcular.map((yolcu, index) => (
                <div key={yolcu.yolcu_id} className="rounded-[12px] border border-slate-200 bg-white p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {index + 1}. {yolcu.yolcu_tur_ad}
                      </p>
                      <p className="text-xs text-slate-500">
                        {toLira(yolcu.toplam_fiyat_genel).toLocaleString("tr-TR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        TL
                      </p>
                    </div>
                    <div className="flex rounded-full border border-slate-200 bg-[#f8fafc] p-1">
                      <button
                        type="button"
                        onClick={() => updatePassenger(index, "insan_cinsiyet", "E")}
                        className={`rounded-full px-4 py-2 text-xs font-semibold ${
                          forms[index]?.insan_cinsiyet === "E"
                            ? "bg-[#10253d] text-white"
                            : "text-slate-600"
                        }`}
                      >
                        Bay
                      </button>
                      <button
                        type="button"
                        onClick={() => updatePassenger(index, "insan_cinsiyet", "K")}
                        className={`rounded-full px-4 py-2 text-xs font-semibold ${
                          forms[index]?.insan_cinsiyet === "K"
                            ? "bg-[#10253d] text-white"
                            : "text-slate-600"
                        }`}
                      >
                        Bayan
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[1fr_1fr_100px_1fr_1fr]">
                    <FormField label="Ad">
                      <input
                        type="text"
                        required
                        value={String(forms[index]?.insan_ad ?? "")}
                        onChange={(event) =>
                          updatePassenger(index, "insan_ad", event.target.value.toUpperCase())
                        }
                        className="h-[48px] w-full rounded-[14px] border border-slate-200 px-4 text-sm outline-none focus:border-brand-ocean"
                      />
                    </FormField>
                    <FormField label="Soyad">
                      <input
                        type="text"
                        required
                        value={String(forms[index]?.insan_soyad ?? "")}
                        onChange={(event) =>
                          updatePassenger(index, "insan_soyad", event.target.value.toUpperCase())
                        }
                        className="h-[48px] w-full rounded-[14px] border border-slate-200 px-4 text-sm outline-none focus:border-brand-ocean"
                      />
                    </FormField>
                    <FormField label="Cinsiyet">
                      <input
                        type="text"
                        readOnly
                        value={forms[index]?.insan_cinsiyet === "K" ? "Bayan" : forms[index]?.insan_cinsiyet === "E" ? "Bay" : ""}
                        className="h-[44px] w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none"
                      />
                    </FormField>
                    <FormField label="Doğum Tarihi">
                      <input
                        type="date"
                        required
                        value={String(forms[index]?.insan_dogum_tarihi ?? "")}
                        onChange={(event) =>
                          updatePassenger(index, "insan_dogum_tarihi", event.target.value)
                        }
                        className="h-[48px] w-full rounded-[14px] border border-slate-200 px-4 text-sm outline-none focus:border-brand-ocean"
                      />
                    </FormField>
                    <FormField label="Uyruk">
                      <select
                        required
                        value={String(forms[index]?.insan_ulke_id ?? "")}
                        onChange={(event) =>
                          updatePassenger(index, "insan_ulke_id", Number(event.target.value))
                        }
                        className="h-[48px] w-full rounded-[14px] border border-slate-200 px-4 text-sm outline-none focus:border-brand-ocean"
                      >
                        <option value="">Seçiniz</option>
                        {ulkeler.map((ulke) => (
                          <option key={ulke.id} value={ulke.id}>
                            {ulke.title}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="TC / Pasaport">
                      <input
                        type="text"
                        required
                        value={String(forms[index]?.insan_pasaport_no ?? "")}
                        onChange={(event) =>
                          updatePassenger(index, "insan_pasaport_no", event.target.value)
                        }
                        className="h-[48px] w-full rounded-[14px] border border-slate-200 px-4 text-sm outline-none focus:border-brand-ocean"
                      />
                    </FormField>
                    <FormField label="Yolcu Vergi Türü">
                      <select
                        value={String(forms[index]?.vergi_tur_id ?? "")}
                        onChange={(event) =>
                          updatePassenger(index, "vergi_tur_id", event.target.value)
                        }
                        className="h-[44px] w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-brand-ocean lg:col-span-2"
                      >
                        <option value="">Seçiniz</option>
                        {yolcu.vergi_turleri.map((vergi) => (
                          <option key={vergi.id} value={vergi.id}>
                            {vergi.aciklama}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Ekstra Hizmetler" compact>
            <div className="space-y-3">
              {["KKTC 2GB eSIM İnternet Paketi", "KKTC 3GB eSIM İnternet Paketi", "KKTC 5GB eSIM İnternet Paketi"].map((item, index) => (
                <label key={item} className="flex items-start gap-3 rounded-[10px] border border-slate-200 px-3 py-3 text-sm text-slate-600">
                  <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300" />
                  <span>{item} · {(261.11 + index * 52).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL</span>
                </label>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Hediye İndirim Kodları" compact>
            <div className="grid gap-3 md:grid-cols-[1fr_120px]">
              <input
                type="text"
                className="h-[44px] w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-brand-ocean"
                placeholder="İndirim kodunuz"
              />
              <button
                type="button"
                className="h-[44px] rounded-[8px] border border-slate-200 bg-[#f8fafc] text-sm font-semibold text-slate-700"
              >
                Uygula
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Kart Bilgileri">
            <div className="mb-4 flex flex-wrap gap-2">
              {["VISA", "MASTERCARD", "TROY"].map((brand) => (
                <span
                  key={brand}
                  className="rounded-full border border-slate-200 bg-[#fafbfd] px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-slate-500"
                >
                  {brand}
                </span>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Kart Üzerindeki Ad Soyad">
                <input
                  type="text"
                  required
                  value={payment.holder}
                  onChange={(event) =>
                    setPayment((current) => ({
                      ...current,
                      holder: event.target.value.toUpperCase(),
                    }))
                  }
                  className="h-[44px] w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-brand-ocean"
                />
              </FormField>

              <FormField label="Kart Numarası">
                <input
                  type="text"
                  required
                  value={payment.cardNumber}
                  onChange={(event) =>
                    setPayment((current) => ({
                      ...current,
                      cardNumber: event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 16)
                        .replace(/(.{4})/g, "$1 ")
                        .trim(),
                    }))
                  }
                  className="h-[44px] w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-brand-ocean"
                  placeholder="0000 0000 0000 0000"
                />
              </FormField>

              <FormField label="Ay">
                <select
                  required
                  value={payment.expMonth}
                  onChange={(event) =>
                    setPayment((current) => ({ ...current, expMonth: event.target.value }))
                  }
                  className="h-[44px] w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-brand-ocean"
                >
                  <option value="">Ay</option>
                  {Array.from({ length: 12 }, (_, index) => {
                    const month = String(index + 1).padStart(2, "0");
                    return (
                      <option key={month} value={month}>
                        {month}
                      </option>
                    );
                  })}
                </select>
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Yıl">
                  <select
                    required
                    value={payment.expYear}
                    onChange={(event) =>
                      setPayment((current) => ({ ...current, expYear: event.target.value }))
                    }
                    className="h-[44px] w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-brand-ocean"
                  >
                    <option value="">Yıl</option>
                    {Array.from({ length: 10 }, (_, index) => {
                      const year = String(new Date().getFullYear() + index);
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    })}
                  </select>
                </FormField>
                <FormField label="CVV">
                  <input
                    type="text"
                    required
                    value={payment.cvv}
                    onChange={(event) =>
                      setPayment((current) => ({
                        ...current,
                        cvv: event.target.value.replace(/\D/g, "").slice(0, 4),
                      }))
                    }
                    className="h-[44px] w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-brand-ocean"
                    placeholder="123"
                  />
                </FormField>
              </div>
            </div>

            <label className="mt-4 flex items-start gap-3 rounded-[10px] bg-[#fafbfd] p-3 text-sm text-slate-600">
              <input
                type="checkbox"
                required
                checked={payment.agreed}
                onChange={(event) =>
                  setPayment((current) => ({ ...current, agreed: event.target.checked }))
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              <span>Kullanım şartlarını okudum ve kabul ediyorum.</span>
            </label>
          </SectionCard>

          <button
            type="submit"
            disabled={submitting || !payment.agreed}
            className="flex h-[50px] w-full items-center justify-center rounded-[8px] bg-[#1f4aa8] text-sm font-semibold text-white transition hover:bg-[#183f90] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? "İşlem hazırlanıyor..." : "Güvenli Ödeme Yap"}
          </button>
        </form>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-5">
            <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-[0_18px_46px_rgba(18,38,60,0.08)]">
              <p className="text-[13px] font-semibold text-[#10253d]">Sefer</p>
              <div className="mt-4 space-y-3">
                <SummaryBox label="Gidiş" value={gidis ? `${gidis.sefer_tarih} · ${from} → ${to}` : "Seçilmedi"} />
                {session.search.tripType === "gidis-donus" && (
                  <SummaryBox
                    label="Dönüş"
                    value={donus ? `${donus.sefer_tarih} · ${to} → ${from}` : "Seçilmedi"}
                  />
                )}
              </div>
            </div>

            <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-[0_18px_46px_rgba(18,38,60,0.08)]">
              <p className="text-[13px] font-semibold text-[#10253d]">Fiyat</p>
              <div className="mt-4 space-y-3">
                {session.passengers.yolcular.map((yolcu, index) => (
                  <div key={yolcu.yolcu_id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">
                      {index + 1}. {yolcu.yolcu_tur_ad}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {toLira(yolcu.toplam_fiyat_genel).toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      TL
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-[18px] bg-[#f5f8fb] px-4 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Toplam</span>
                  <span className="text-lg font-semibold text-slate-900">
                    {totalPrice.toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    TL
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function BookingSearchCard({
  guzergahlar,
  initialSearch,
  sessionId,
  variant,
  submitLabel,
  onSearchComplete,
}: {
  guzergahlar: GuzergahData[];
  initialSearch?: BookingSearchState;
  sessionId?: string;
  variant: "hero" | "compact";
  submitLabel: string;
  onSearchComplete: (sessionId: string) => void;
}) {
  const [search, setSearch] = useState<BookingSearchState>(
    initialSearch ?? buildDefaultSearch(guzergahlar)
  );
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!initialSearch) {
      setSearch(buildDefaultSearch(guzergahlar));
    }
  }, [guzergahlar, initialSearch]);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setPopoverOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const guzergah = getSelectedGuzergah(guzergahlar, search);
  const sehirler = guzergah?.sehirler ?? [];
  const isValid =
    search.guzergahId &&
    search.cikisSehirId &&
    search.varisSehirId &&
    search.gidisTarihi &&
    (search.tripType === "tek-gidis" || search.donusTarihi);

  function updateSearch(partial: Partial<BookingSearchState>) {
    setSearch((current) => ({ ...current, ...partial }));
  }

  function swapPorts() {
    setSearch((current) => ({
      ...current,
      cikisSehirId: current.varisSehirId,
      varisSehirId: current.cikisSehirId,
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isValid || !guzergah) return;

    setError(null);
    setOverlayOpen(true);

    try {
      const query = new URLSearchParams({
        sc_id: String(search.cikisSehirId),
        sv_id: String(search.varisSehirId),
        tarih: formatDateForApi(search.gidisTarihi),
        y_mod: search.tripType,
        y_t: JSON.stringify(search.yolcuTurleri.filter((item) => item.sayi > 0)),
      });

      if (search.tripType === "gidis-donus" && search.donusTarihi) {
        query.set("d_tarih", formatDateForApi(search.donusTarihi));
      }

      const response = await fetch(`/api/akgunler/sailings?${query}`);
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Seferler getirilemedi.");
      }

      const id = sessionId ?? makeSessionId();
      const session: BookingSession = {
        id,
        guzergahlar,
        search,
        sailings: {
          s_id: json.s_id ?? 0,
          g_seferler: json.g_seferler ?? [],
          d_seferler: json.d_seferler ?? [],
        },
        selected: {
          gidisSeferId: null,
          donusSeferId: null,
        },
      };

      saveStoredSession(session);
      onSearchComplete(id);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Seferler getirilemedi."
      );
    } finally {
      setOverlayOpen(false);
    }
  }

  return (
    <>
      <ProcessingOverlay
        open={overlayOpen}
        title="İşleminiz Yapılıyor. Lütfen Bekleyiniz."
        description="Seçtiğiniz kriterlere uygun seferler ve fiyat bilgileri hazırlanıyor."
      />

      <form onSubmit={handleSubmit} className={`space-y-4 ${variant === "compact" ? "rounded-[18px] bg-white p-4 shadow-[0_12px_30px_rgba(0,0,0,0.12)]" : ""}`}>
        {variant === "hero" ? (
          <div className="flex flex-wrap gap-4 px-2">
            <TripTypeButton
              active={search.tripType === "tek-gidis"}
              label="Tek Yön"
              onClick={() =>
                updateSearch({ tripType: "tek-gidis", donusTarihi: "" })
              }
            />
            <TripTypeButton
              active={search.tripType === "gidis-donus"}
              label="Gidiş - Dönüş"
              onClick={() => updateSearch({ tripType: "gidis-donus" })}
            />
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <TripTypeButton
              active={search.tripType === "tek-gidis"}
              label="Tek Yön"
              onClick={() =>
                updateSearch({ tripType: "tek-gidis", donusTarihi: "" })
              }
            />
            <TripTypeButton
              active={search.tripType === "gidis-donus"}
              label="Gidiş - Dönüş"
              onClick={() => updateSearch({ tripType: "gidis-donus" })}
            />
          </div>
        )}

        {error && <ErrorPanel message={error} />}

        <div
          className={`grid gap-3 ${
            variant === "hero"
              ? "xl:grid-cols-[minmax(0,1.15fr)_52px_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.08fr)_112px]"
              : "xl:grid-cols-[minmax(0,1.15fr)_52px_minmax(0,1.15fr)_minmax(0,0.85fr)_minmax(0,0.85fr)_minmax(0,1fr)_120px]"
          }`}
        >
          <RouteField
            label="Nereden"
            value={String(search.cikisSehirId)}
            onChange={(value) => updateSearch({ cikisSehirId: Number(value) })}
            options={sehirler.map((item) => ({ value: String(item.id), label: item.ad }))}
            variant={variant}
          />

          <button
            type="button"
            onClick={swapPorts}
            className={`hidden self-end xl:flex xl:items-center xl:justify-center ${
              variant === "hero"
                ? "h-[56px] rounded-xl bg-[#eff4f7] text-[#006971]"
                : "h-[58px] rounded-[18px] border border-slate-200 bg-white text-slate-500 transition hover:text-brand-ocean"
            }`}
            aria-label="Limanları değiştir"
          >
            <SwapIcon className="h-5 w-5" />
          </button>

          <RouteField
            label="Nereye"
            value={String(search.varisSehirId)}
            onChange={(value) => updateSearch({ varisSehirId: Number(value) })}
            options={sehirler
              .filter((item) => item.id !== search.cikisSehirId)
              .map((item) => ({ value: String(item.id), label: item.ad }))}
            variant={variant}
          />

          <DateField
            label="Gidiş Tarihi"
            value={search.gidisTarihi}
            onChange={(value) =>
              updateSearch({
                gidisTarihi: value,
                donusTarihi:
                  search.donusTarihi && value > search.donusTarihi
                    ? ""
                    : search.donusTarihi,
              })
            }
            variant={variant}
          />

          <DateField
            label="Dönüş Tarihi"
            value={search.donusTarihi}
            disabled={search.tripType === "tek-gidis"}
            onChange={(value) => updateSearch({ donusTarihi: value })}
            variant={variant}
          />

          <div ref={popoverRef} className="relative">
            <button
              type="button"
              onClick={() => setPopoverOpen((current) => !current)}
            className={`w-full text-left shadow-sm ${
              variant === "hero"
                ? "rounded-xl border-none bg-[#eff4f7] px-4 py-[10px]"
                : "rounded-[18px] border border-slate-200 bg-white px-4 py-[9px]"
            }`}
            >
              <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Yolcu ve Araç
              </span>
              <span className="mt-1 block truncate text-sm font-medium text-slate-900">
                {buildPassengerSummary(guzergah, search.yolcuTurleri)}
              </span>
            </button>

            {popoverOpen && (
              <PassengerVehiclePanel
                guzergah={guzergah}
                value={search.yolcuTurleri}
                onChange={(items) => updateSearch({ yolcuTurleri: items })}
                onClose={() => setPopoverOpen(false)}
              />
            )}
          </div>

          <button
            type="submit"
            disabled={!isValid}
            className={`text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 ${
              variant === "hero"
                ? "h-[56px] rounded-full bg-[linear-gradient(135deg,#006971_0%,#34a8b3_100%)] shadow-[0_18px_36px_rgba(0,105,113,0.24)] hover:scale-[1.02]"
                : "h-[58px] rounded-[18px] bg-[#f08a00] hover:bg-[#dd7d00]"
            }`}
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </>
  );
}

function TripListSection({
  title,
  subtitle,
  dateLabel,
  items,
  from,
  to,
  selectedId,
  onSelect,
}: {
  title: string;
  subtitle: string;
  dateLabel: string;
  items: SeferData[];
  from: string;
  to: string;
  selectedId: number | null;
  onSelect: (tripId: number) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[124px_minmax(0,1fr)]">
        <div className="flex items-center justify-between rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-[#10253d]">
          <span className="text-lg leading-none">←</span>
          <span className="text-center text-sm font-medium">{dateLabel}</span>
        </div>
        <div className="flex items-center justify-center rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600">
          {subtitle}
        </div>
      </div>

      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-slate-200 bg-[#fafbfd] px-4 py-6 text-sm text-slate-500">
            Bu tarih için uygun sefer bulunamadı.
          </div>
        ) : (
          items.map((item) => (
            <TripCard
              key={item.id}
              item={item}
              from={from}
              to={to}
              selected={selectedId === item.id}
              onSelect={() => onSelect(item.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}

function TripCard({
  item,
  from,
  to,
  selected,
  onSelect,
}: {
  item: SeferData;
  from: string;
  to: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const departureTime = (item.sefer_tarih.match(/\d{1,2}:\d{2}/)?.[0]) ?? item.sefer_tarih;
  const arrivalTime = inferArrivalTime(item.sefer_tarih);
  const priceValue = item.formatted_price.replace(/\s*TL\s*$/i, "").trim();

  return (
    <article
      className={`rounded-[16px] border bg-white p-5 transition ${
        selected
          ? "border-[#1f4aa8] shadow-[0_14px_38px_rgba(31,74,168,0.12)]"
          : "border-slate-200"
      }`}
    >
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[12px] border border-slate-200 bg-white text-[#1f4aa8]">
          <FerryIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">Akgünler Denizcilik</p>
          <p className="truncate text-xs text-slate-500">
            {item.trip_number ? `Sefer No ${item.trip_number}` : item.gemi}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[1fr_auto] md:gap-6">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
          <div>
            <p className="font-headline text-3xl font-bold leading-none tracking-[-0.02em] text-slate-900">
              {departureTime}
            </p>
            <p className="mt-1.5 text-xs font-medium text-slate-500">{from}</p>
          </div>

          <div className="flex flex-col items-center text-center">
            <p className="text-xs font-medium text-slate-600">{item.gemi}</p>
            <div className="my-2 flex w-full items-center gap-2">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-[#1f4aa8]">⛴</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <p className="text-[11px] text-slate-400">Yaklaşık 2 sa 30 dk</p>
          </div>

          <div className="text-right">
            <p className="font-headline text-3xl font-bold leading-none tracking-[-0.02em] text-slate-900">
              {arrivalTime}
            </p>
            <p className="mt-1.5 text-xs font-medium text-slate-500">{to}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4 md:justify-end md:border-t-0 md:pt-0 md:pl-6 md:[border-left:1px_solid_#f1f5f9]">
          <div className="text-right">
            <p className="whitespace-nowrap font-headline text-2xl font-bold leading-none tracking-[-0.02em] text-slate-900">
              {priceValue}
              <span className="ml-1.5 text-sm font-semibold text-slate-500">TL</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onSelect}
            className={`h-[44px] shrink-0 rounded-[10px] px-6 text-sm font-semibold text-white transition ${
              selected
                ? "bg-[#183f90]"
                : "bg-[#1f4aa8] hover:bg-[#183f90]"
            }`}
          >
            {selected ? "Seçildi" : "Seç"}
          </button>
        </div>
      </div>
    </article>
  );
}

function PassengerVehiclePanel({
  guzergah,
  value,
  onChange,
  onClose,
}: {
  guzergah: GuzergahData | null;
  value: YolcuSayi[];
  onChange: (items: YolcuSayi[]) => void;
  onClose: () => void;
}) {
  if (!guzergah) return null;

  return (
    <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-[380px] max-w-[92vw] rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.16)] before:absolute before:bottom-full before:right-10 before:border-[10px] before:border-transparent before:border-b-white before:content-['']">
      <div className="max-h-[420px] space-y-4 overflow-y-auto pr-1">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Yolcular
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {[
              ...guzergah.yolcu_turleri.filter((item) =>
                PASSENGER_LABELS.includes(item.title)
              ),
              ...guzergah.kabin_turleri.filter((item) =>
                CABIN_LABELS.includes(item.title)
              ),
            ].map((item) => (
              <CountRow
                key={item.id}
                label={item.title}
                count={getCount(value, item.id)}
                onDecrease={() =>
                  onChange(updateCount(value, item.id, getCount(value, item.id) - 1))
                }
                onIncrease={() =>
                  onChange(updateCount(value, item.id, getCount(value, item.id) + 1))
                }
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Kabin ve Araç
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {guzergah.arac_turleri.map((item) => (
              <CountRow
                key={item.id}
                label={item.title}
                count={getCount(value, item.id)}
                onDecrease={() =>
                  onChange(updateCount(value, item.id, getCount(value, item.id) - 1))
                }
                onIncrease={() =>
                  onChange(updateCount(value, item.id, getCount(value, item.id) + 1))
                }
              />
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-4 h-[44px] w-full rounded-[14px] bg-[#10253d] text-sm font-semibold text-white"
      >
        Tamam
      </button>
    </div>
  );
}

function CountRow({
  label,
  count,
  onIncrease,
  onDecrease,
}: {
  label: string;
  count: number;
  onIncrease: () => void;
  onDecrease: () => void;
}) {
  return (
    <div className="rounded-[12px] border border-slate-200 bg-white px-3 py-2">
      <div className="mb-2 text-[13px] font-medium text-slate-700">{label}</div>
      <div className="flex items-center justify-between rounded-[8px] border border-slate-200 px-3 py-2">
        <button
          type="button"
          onClick={onDecrease}
          className="text-base font-semibold text-slate-500"
        >
          -
        </button>
        <span className="text-sm font-semibold text-slate-900">{count}</span>
        <button
          type="button"
          onClick={onIncrease}
          className="text-base font-semibold text-slate-500"
        >
          +
        </button>
      </div>
    </div>
  );
}

function RouteField({
  label,
  value,
  onChange,
  options,
  variant,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  variant?: "hero" | "compact";
}) {
  return (
    <label className="block">
      <span className={`mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] ${variant === "hero" ? "ml-1 text-[#595f61]" : "text-slate-400"}`}>
        {label}
      </span>
      <div className="relative">
        <span className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${variant === "hero" ? "text-[#006971]" : "text-[#10253d]"}`}>
          <FerryIcon className="h-5 w-5" />
        </span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${variant === "hero" ? HERO_FIELD_CLASS : FIELD_CLASS} appearance-none`}
        >
          <option value="">Seçiniz</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
  disabled,
  variant,
  min,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  variant?: "hero" | "compact";
  min?: string;
}) {
  return (
    <AntsoDatePicker
      label={label}
      value={value}
      min={min}
      disabled={disabled}
      onChange={onChange}
      variant={variant ?? "compact"}
    />
  );
}

function TripTypeButton({
  active,
  label,
  dark,
  onClick,
}: {
  active: boolean;
  label: string;
  dark?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        dark
          ? active
            ? "bg-white text-[#1f4aa8]"
            : "border border-white/20 bg-transparent text-white"
          : active
            ? "text-[#171d1e]"
            : "text-slate-500"
      }`}
    >
      <span className="inline-flex items-center gap-2">
        <span className={`h-4 w-4 rounded-full border ${active ? "border-[#006971]" : "border-slate-300"}`}>
          <span className={`m-[3px] block h-2 w-2 rounded-full ${active ? "bg-[#006971]" : "bg-transparent"}`} />
        </span>
        {label}
      </span>
    </button>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] bg-[#f5f8fb] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function SectionCard({
  title,
  children,
  compact,
}: {
  title: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <section className={`overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-[0_18px_46px_rgba(18,38,60,0.08)] ${compact ? "" : ""}`}>
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <p className="text-[13px] font-semibold text-[#10253d]">{title}</p>
        <span className="text-slate-400">{compact ? "⌄" : ""}</span>
      </div>
      <div className="p-4">
      {children}
      </div>
    </section>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function SearchSkeleton() {
  return (
    <div className="grid gap-3 xl:grid-cols-[1fr_52px_1fr_1fr_1fr_1fr_150px]">
      {Array.from({ length: 7 }).map((_, index) => (
        <div
          key={index}
          className={`animate-pulse rounded-[18px] bg-slate-100 ${
            index === 1 ? "hidden xl:block" : "h-[58px]"
          }`}
        />
      ))}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="h-24 animate-pulse rounded-[24px] bg-slate-100" />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="h-64 animate-pulse rounded-[24px] bg-slate-100" />
          <div className="h-64 animate-pulse rounded-[24px] bg-slate-100" />
        </div>
        <div className="h-80 animate-pulse rounded-[24px] bg-slate-100" />
      </div>
    </div>
  );
}

function MissingSessionCard() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-[24px] border border-slate-200 bg-white p-8 text-center shadow-[0_18px_46px_rgba(18,38,60,0.08)]">
        <p className="text-lg font-semibold text-slate-900">
          Rezervasyon oturumu bulunamadı
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Lütfen aramayı yeniden başlatın.
        </p>
        <a
          href="/"
          className="mt-5 inline-flex h-[48px] items-center justify-center rounded-[14px] bg-[#10253d] px-5 text-sm font-semibold text-white"
        >
          Ana sayfaya dön
        </a>
      </div>
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

function FerryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.7}
        d="M3 10h18M4 10l1.5 6h13L20 10M7 10V7.5h10V10M8 19c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1"
      />
    </svg>
  );
}

function FerryPortIcon({
  className,
  direction,
}: {
  className?: string;
  direction: "departure" | "arrival";
}) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M4 16c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M6 13h12l-1.2-5H7.2L6 13Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d={direction === "departure" ? "M12 5h6m0 0-2-2m2 2-2 2" : "M12 5H6m0 0 2-2M6 5l2 2"}
      />
    </svg>
  );
}

function SwapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M7 7h11m0 0-3-3m3 3-3 3M17 17H6m0 0 3 3m-3-3 3-3"
      />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M8 3v3m8-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
      />
    </svg>
  );
}
