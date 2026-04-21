"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PassengerForm } from "./passenger-form";
import { ProcessingOverlay } from "./processing-overlay";
import { RouteSelector } from "./route-selector";
import { SailingList } from "./sailing-list";
import { CHECKOUT_SESSION_KEY } from "@/app/(payment)/akgunler/checkout/checkout-client";

interface GuzergahData {
  id: number;
  baslik: string;
  sehirler: Array<{ id: number; ad: string }>;
  yolcu_turleri: Array<{
    id: number;
    title: string;
    yolcu_kodu: string;
    yolcu_tipi: string;
  }>;
  arac_turleri: Array<{
    id: number;
    title: string;
    yolcu_kodu: string;
    yolcu_tipi: string;
  }>;
  kabin_turleri: Array<{
    id: number;
    title: string;
    yolcu_kodu: string;
    yolcu_tipi: string;
  }>;
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

const CONTENT_STEPS = [
  {
    key: "sailing",
    title: "Sefer seçimi",
    description: "Müsaitlik ve fiyatları karşılaştırın",
  },
  {
    key: "passenger",
    title: "Yolcu bilgileri",
    description: "Biletleme için zorunlu bilgileri tamamlayın",
  },
  {
    key: "payment",
    title: "Ödeme",
    description: "3D Secure ile güvenli ödeme yapın",
  },
] as const;

const HERO_FEATURES = [
  {
    eyebrow: "Tek rota, net akış",
    title: "Anamur ↔ Girne",
    description: "Karışık seçimler yerine odaklı ve hızlı bir rezervasyon deneyimi.",
  },
  {
    eyebrow: "Seyahat süresi",
    title: "Yaklaşık 2,5 saat",
    description: "Sefer detayında güncel saat bilgisiyle planınızı netleştirin.",
  },
  {
    eyebrow: "Bilet teslimi",
    title: "Ödeme sonrası anında",
    description: "Biletler Akgünler sistemi üzerinden tamamlanan ödeme sonrası oluşur.",
  },
  {
    eyebrow: "Canlı karşılaştırma",
    title: "Sefer ve fiyat özeti",
    description: "Müsaitlik ve fiyat bilgilerini tek listede görerek hızlı karar verin.",
  },
  {
    eyebrow: "Güven ön planda",
    title: "3D Secure ödeme",
    description: "Kart doğrulaması güvenli ödeme ekranında tamamlanır.",
  },
] as const;

export function AkgunlerBookingWizard() {
  const [step, setStep] = useState<Step>("route");
  const [guzergahlar, setGuzergahlar] = useState<GuzergahData[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [overlayState, setOverlayState] = useState<{
    title: string;
    description: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedGuzergah, setSelectedGuzergah] = useState<GuzergahData | null>(null);
  const [cikisSehirId, setCikisSehirId] = useState(0);
  const [varisSehirId, setVarisSehirId] = useState(0);
  const [tarih, setTarih] = useState("");
  const [donusTarih, setDonusTarih] = useState<string | undefined>(undefined);
  const [tripType, setTripType] = useState<"tek-gidis" | "gidis-donus">("tek-gidis");
  const [yolcuSayilari, setYolcuSayilari] = useState<Array<{ id: number; sayi: number }>>([]);

  const [seferler, setSeferler] = useState<SeferData[]>([]);
  const [sepetId, setSepetId] = useState(0);
  const [cartToken, setCartToken] = useState("");
  const [selectedSeferId, setSelectedSeferId] = useState(0);

  const [yolcular, setYolcular] = useState<YolcuData[]>([]);
  const router = useRouter();

  const cikisSehirAd =
    selectedGuzergah?.sehirler.find((item) => item.id === cikisSehirId)?.ad ?? "";
  const varisSehirAd =
    selectedGuzergah?.sehirler.find((item) => item.id === varisSehirId)?.ad ?? "";
  const selectedSefer = seferler.find((item) => item.id === selectedSeferId);
  const totalPassengers = yolcuSayilari.reduce((sum, item) => sum + item.sayi, 0);
  const currentIdx = CONTENT_STEPS.findIndex((item) => item.key === step);

  useEffect(() => {
    fetch("/api/akgunler/routes")
      .then((response) => response.json())
      .then((data) => {
        if (!data?.guzergahlar?.length && data?.error) {
          throw new Error(data.error);
        }
        setGuzergahlar(data.guzergahlar ?? []);
        setInitialLoading(false);
      })
      .catch((requestError) => {
        setError(getFriendlyRouteError(requestError));
        setInitialLoading(false);
      });
  }, []);

  function beginOverlay(title: string, description: string) {
    setOverlayState({ title, description });
    setLoading(true);
  }

  function endOverlay() {
    setLoading(false);
    setOverlayState(null);
  }

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
    beginOverlay(
      "Seferler hazırlanıyor",
      "En güncel müsaitlik ve fiyat bilgileri getiriliyor. Lütfen birkaç saniye bekleyin."
    );
    setSelectedGuzergah(params.guzergah);
    setCikisSehirId(params.cikisSehirId);
    setVarisSehirId(params.varisSehirId);
    setTarih(params.tarih);
    setDonusTarih(params.donusTarih);
    setTripType(params.tripType);
    setYolcuSayilari(params.yolcuTurleri);

    try {
      const queryParams: Record<string, string> = {
        sc_id: String(params.cikisSehirId),
        sv_id: String(params.varisSehirId),
        tarih: params.tarih,
        y_mod: params.tripType,
        y_t: JSON.stringify(params.yolcuTurleri),
      };

      if (params.tripType === "gidis-donus" && params.donusTarih) {
        queryParams.d_tarih = params.donusTarih;
      }

      const search = new URLSearchParams(queryParams);
      const response = await fetch(`/api/akgunler/sailings?${search}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setSeferler(data.g_seferler ?? []);
      setSepetId(data.s_id ?? 0);
      setCartToken(data.cart_token ?? "");
      setSelectedSeferId(0);
      setStep("sailing");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Sefer aranamadı");
    } finally {
      endOverlay();
    }
  }

  async function handleSailingSelect(seferId: number) {
    setError(null);
    beginOverlay(
      "Yolcu bilgileri hazırlanıyor",
      "Seçtiğiniz sefere göre gerekli alanlar hazırlanıyor."
    );
    setSelectedSeferId(seferId);

    try {
      const search = new URLSearchParams({
        s_id: String(sepetId),
        gs_id: String(seferId),
        y_mod: tripType,
        cart_token: cartToken,
      });

      const response = await fetch(`/api/akgunler/passengers?${search}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setYolcular(data.yolcular ?? []);
      setStep("passenger");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Yolcu bilgileri yüklenemedi"
      );
    } finally {
      endOverlay();
    }
  }

  async function handlePassengerSubmit(yolcuBilgileri: Array<Record<string, unknown>>) {
    setError(null);
    beginOverlay(
      "Ödeme adımı hazırlanıyor",
      "Yolcu bilgileriniz kaydediliyor ve güvenli ödeme ekranı hazırlanıyor."
    );

    try {
      const response = await fetch("/api/akgunler/passengers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ s_id: sepetId, yolcular: yolcuBilgileri, cart_token: cartToken }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }

      // Özet verisini sessionStorage'a kaydet; ödeme sayfası okuyacak
      sessionStorage.setItem(
        CHECKOUT_SESSION_KEY,
        JSON.stringify({
          toplamFiyat: data.toplam_fiyat ?? 0,
          sefer: selectedSefer,
          cikisSehirAd,
          varisSehirAd,
          yolcular,
        })
      );
      router.push(`/akgunler/checkout?sid=${sepetId}&ct=${encodeURIComponent(cartToken)}`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Yolcu bilgileri gönderilemedi"
      );
    } finally {
      endOverlay();
    }
  }

  if (step === "route") {
    return (
      <div className="overflow-hidden" id="ana-sayfa">
        <ProcessingOverlay
          open={Boolean(overlayState)}
          title={overlayState?.title ?? ""}
          description={overlayState?.description ?? ""}
        />
        <div className="antso-home-stack">
          <section className="relative overflow-hidden" id="bilet-al">
            <div className="absolute inset-0">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-[0.42]"
                style={{ backgroundImage: "url('/antso-liman.jpg')" }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,48,67,0.18)_0%,rgba(13,48,67,0.28)_18%,rgba(13,48,67,0.46)_46%,rgba(245,250,252,0.88)_84%,#f5fafc_100%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(94,188,213,0.38),transparent_24%),radial-gradient(circle_at_16%_18%,rgba(216,240,245,0.24),transparent_18%)]" />
            </div>

            <div className="relative mx-auto flex min-h-[720px] max-w-[86rem] flex-col items-center justify-center px-4 pb-16 pt-16 text-center sm:px-6 lg:min-h-[780px] lg:px-8">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/74 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-ocean shadow-[0_12px_30px_rgba(18,38,60,0.08)] ring-1 ring-white/85 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-brand-sky" />
                Akgünler resmi satış noktası
              </span>

              <div className="mt-7 max-w-4xl">
                <h1 className="font-heading text-[clamp(3.1rem,7vw,6rem)] font-extrabold leading-[0.9] tracking-[-0.07em] text-white drop-shadow-[0_20px_40px_rgba(13,48,67,0.25)]">
                  Ufka doğru
                  <br />
                  rotanızı çizin.
                </h1>
                <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/92 sm:text-lg">
                  Anamur ile Girne arasındaki yolculuğunuzu güncel sefer, yolcu ve ödeme akışını
                  tek ekranda tamamlayarak planlayın.
                </p>
              </div>

              <div className="mt-10 w-full max-w-6xl">
                <div className="antso-glass-panel rounded-[34px] p-[5px]">
                  <div className="rounded-[30px] bg-white/96 p-4 md:p-5">
                    {initialLoading ? (
                      <SearchSkeleton />
                    ) : (
                      <RouteSelector guzergahlar={guzergahlar} onSearch={handleRouteSearch} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="sefer-takvimi" className="mx-auto w-full max-w-[86rem] px-4 sm:px-6 lg:px-8">
            <div className="rounded-[34px] bg-white/68 p-5 shadow-[0_24px_60px_rgba(18,38,60,0.05)] ring-1 ring-white/75 backdrop-blur-sm">
              <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
                <div className="max-w-2xl text-left">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-ocean/70">
                    Sefer Takvimi
                  </p>
                  <h2 className="mt-3 font-heading text-[clamp(2.3rem,4vw,4rem)] font-extrabold tracking-[-0.06em] text-slate-900">
                    İkonik yolculuğunuzu tek akışta netleştirin
                  </h2>
                </div>
                <Link
                  href="/#bilet-al"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-brand-ocean transition hover:text-brand-ink"
                >
                  Tüm seferleri sorgula
                  <ArrowRightMini />
                </Link>
              </div>

              <div className="mt-[5px] grid gap-[5px] lg:grid-cols-[1.18fr_0.82fr]">
                <FeaturedRouteCard
                  badge="Öne çıkan rota"
                  title="Anamur ↔ Girne"
                  description="Tek rotaya odaklanan biletleme akışı sayesinde karar süresi kısalır, arama ekranı daha net çalışır ve yolculuk planı tek panelde tamamlanır."
                />
                <div className="grid gap-[5px]">
                  <MiniRouteCard
                    title="Gidiş seferleri"
                    description="Seçtiğiniz tarihteki müsait deniz otobüsü ve hızlı feribot seçenekleri canlı fiyatla görünür."
                  />
                  <MiniRouteCard
                    title="Dönüş planı"
                    description="Gidiş - dönüş seçiminde dönüş tarihi aynı akışta eklenir; yolcu ve ödeme adımları yeniden başlamaz."
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-[#edf4f7]">
            <div className="mx-auto w-full max-w-[86rem] px-4 py-8 sm:px-6 lg:px-8">
              <div className="max-w-2xl text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-ocean/70">
                  Ayrıcalıklı akışlar
                </p>
                <h2 className="mt-3 font-heading text-[clamp(2rem,3.5vw,3.5rem)] font-extrabold tracking-[-0.05em] text-slate-900">
                  Rezervasyon deneyimini hızlandıran avantajlar
                </h2>
              </div>

              <div className="mt-[5px] flex gap-[5px] overflow-x-auto pb-1">
                {HERO_FEATURES.slice(0, 3).map((item) => (
                  <OfferCard
                    key={item.eyebrow}
                    eyebrow={item.eyebrow}
                    title={item.title}
                    description={item.description}
                    featured={item.eyebrow === "Seyahat süresi"}
                  />
                ))}
              </div>
            </div>
          </section>

          <section id="kurumsal" className="mx-auto w-full max-w-[86rem] px-4 sm:px-6 lg:px-8">
            <div className="grid gap-[5px] lg:grid-cols-[0.88fr_1.12fr]">
              <div className="relative min-h-[540px] overflow-hidden rounded-[36px] bg-brand-ink shadow-[0_24px_70px_rgba(18,38,60,0.18)]">
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-[0.72]"
                  style={{ backgroundImage: "url('/antso-liman.jpg')" }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,42,60,0.08)_0%,rgba(12,42,60,0.38)_46%,rgba(12,42,60,0.92)_100%)]" />
                <div className="absolute bottom-5 left-5 right-5 rounded-[28px] bg-white/88 p-5 shadow-[0_18px_40px_rgba(18,38,60,0.12)] backdrop-blur">
                  <p className="text-5xl font-heading font-extrabold tracking-[-0.06em] text-brand-ocean">
                    01.
                  </p>
                  <p className="mt-3 font-heading text-xl font-bold text-slate-900">
                    Güvenli ve net biletleme
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Arama, yolcu bilgileri ve ödeme akışını tek panelde birleştiren sade bir deneyim.
                  </p>
                </div>
              </div>

              <div className="antso-soft-panel rounded-[36px] p-7 md:p-9">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-ocean/70">
                  Kurumsal
                </p>
                <h2 className="mt-4 font-heading text-[clamp(2.2rem,3.5vw,3.9rem)] font-extrabold tracking-[-0.06em] text-slate-900">
                  Deniz yolculuğunu daha anlaşılır ve daha premium hale getiriyoruz
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                  Antso Denizcilik, Anamur ve Girne hattında odaklı online satış deneyimi sunar.
                  Server-side entegrasyon, güvenli ödeme yönlendirmesi ve sade kullanıcı akışı
                  sayesinde biletleme süreci gereksiz karmaşadan arınır.
                </p>

                <div className="mt-8 grid gap-x-6 gap-y-6 md:grid-cols-2">
                  <EditorialFeature
                    title="Resmi acente akışı"
                    description="Akgünler API çağrıları sunucu üzerinden yapılır; kritik bilgiler istemciye açılmaz."
                  />
                  <EditorialFeature
                    title="Seçkin konfor"
                    description="Yolculuk süresi, fiyat ve rota özeti tek bir booking panelinde birlikte görünür."
                  />
                  <EditorialFeature
                    title="Güvenli ödeme"
                    description="3D Secure doğrulaması ile ödeme operatörün güvenli yönlendirmesinde tamamlanır."
                  />
                  <EditorialFeature
                    title="Rezervasyon takibi"
                    description="Ödeme sonrası confirmation ekranı ve rezervasyon detayları üzerinden süreç izlenebilir."
                  />
                </div>
              </div>
            </div>
          </section>

          <section id="iletisim" className="mx-auto w-full max-w-[86rem] px-4 sm:px-6 lg:px-8">
            <HomeSectionHeader
              eyebrow="İletişim"
              title="Rezervasyon ve işlem takibi için en hızlı erişim yolları"
              description="Canlı akışta destek almanız gereken durumlarda aşağıdaki alanlar üzerinden işleminizi takip edebilirsiniz."
            />
            <div className="mt-[5px] grid gap-[5px] lg:grid-cols-3">
              <ContactCard
                title="Yeni rezervasyon"
                description="Bilet almak için ana arama modülüne dönün ve tarih seçiminizi yaparak seferleri yeniden listeleyin."
                href="/#bilet-al"
                cta="Bilet al akışına git"
              />
              <ContactCard
                title="Rezervasyon takibi"
                description="Var olan rezervasyonlarınızın durumunu, ödeme kaydını ve bilet detaylarını hesap alanınızdan görüntüleyin."
                href="/account/bookings"
                cta="Rezervasyonlarımı aç"
              />
              <ContactCard
                title="Hesap erişimi"
                description="Rezervasyon geçmişinize erişmek veya işlemlerinizi tek yerde toplamak için hesabınıza giriş yapın."
                href="/auth/login"
                cta="Giriş yap"
              />
            </div>
          </section>

          <section id="sss" className="mx-auto w-full max-w-[86rem] px-4 pb-5 sm:px-6 lg:px-8">
            <HomeSectionHeader
              eyebrow="Sıkca Sorulan Sorular"
              title="Biletleme sürecinde en çok sorulan konular"
              description="Rezervasyon akışında karar vermeyi kolaylaştıran temel bilgileri sayfanın sonunda akordiyon olarak topladık."
            />
            <div className="mt-[5px] grid gap-[5px] lg:grid-cols-2">
              <FaqAccordionItem
                question="Sefer saatlerini nerede görüyorum?"
                answer="Ana sayfadaki arama modülünde tarih ve yolcu bilgilerinizi seçtiğinizde, o güne ait müsait seferler sonuç ekranında canlı olarak listelenir."
              />
              <FaqAccordionItem
                question="Ödeme sonrası biletler ne zaman oluşur?"
                answer="Ödeme 3D Secure doğrulaması tamamlandıktan sonra biletler anında oluşturulur ve confirmation ekranında bilet numaraları gösterilir."
              />
              <FaqAccordionItem
                question="Yolcu bilgilerini neden eksiksiz girmeliyim?"
                answer="Biletleme işlemi operatör sistemine gerçek yolcu verileriyle işlendiği için ad, soyad, belge numarası ve doğum tarihi alanları eksiksiz olmalıdır."
              />
              <FaqAccordionItem
                question="Rezervasyonumu daha sonra nereden takip ederim?"
                answer="Hesabınıza giriş yaptıktan sonra Rezervasyonlarım ekranından rezervasyon detaylarını, ödeme ve iade durumlarını görüntüleyebilirsiniz."
              />
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <ProcessingOverlay
        open={Boolean(overlayState)}
        title={overlayState?.title ?? ""}
        description={overlayState?.description ?? ""}
      />
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(94,188,213,0.18),transparent_26%),radial-gradient(circle_at_84%_12%,rgba(27,122,133,0.1),transparent_20%),linear-gradient(180deg,#eef9fc_0%,#f5fafc_58%,#edf5f8_100%)]" />
        <div className="relative antso-section-shell">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-brand-ocean/65">
                Rezervasyon akışı
              </p>
              <h1 className="mt-3 font-heading text-4xl font-extrabold tracking-[-0.04em] text-slate-900">
                {cikisSehirAd} <span className="text-slate-300">→</span> {varisSehirAd}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Sefer seçimi, yolcu bilgileri ve ödeme adımlarını tek akışta tamamlayın.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setStep("route")}
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-[0_10px_24px_rgba(18,38,60,0.04)] transition hover:border-slate-300 hover:text-brand-ocean"
            >
              Aramayı değiştir
            </button>
          </div>

          <div className="mt-6 grid antso-box-gap md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Rota"
              value={`${cikisSehirAd} → ${varisSehirAd}`}
              description={tripType === "gidis-donus" ? "Gidiş - dönüş" : "Tek yön"}
            />
            <SummaryCard
              title="Tarih"
              value={donusTarih ? `${tarih} / ${donusTarih}` : tarih}
              description="Seçilen seyahat günü"
            />
            <SummaryCard
              title="Yolcu"
              value={`${totalPassengers} yolcu`}
              description="Yolcu ve araç bilgisi ile"
            />
            <SummaryCard
              title="Seçili sefer"
              value={selectedSefer ? selectedSefer.sefer_tarih : "Henüz seçilmedi"}
              description={
                selectedSefer
                  ? `${selectedSefer.gemi}${selectedSefer.formatted_price ? ` · ${selectedSefer.formatted_price}` : ""}`
                  : "Sonraki adımda seçilecek"
              }
            />
          </div>

          <div className="antso-soft-panel mt-6 rounded-[30px] p-3">
            <div className="grid antso-box-gap lg:grid-cols-3">
              {CONTENT_STEPS.map((item, index) => (
                <StepRailItem
                  key={item.key}
                  index={index}
                  active={index === currentIdx}
                  completed={index < currentIdx}
                  title={item.title}
                  description={item.description}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="antso-section-shell">
        {error && !loading && (
          <div className="mb-6 rounded-[24px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-[0_18px_40px_rgba(239,68,68,0.08)]">
            {error}
          </div>
        )}

        {loading && !overlayState ? (
          <div className="antso-elevated-card rounded-[32px] p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-mist text-brand-ocean">
              <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
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
                  d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
                />
              </svg>
            </div>
            <p className="mt-5 text-lg font-semibold text-slate-900">Bilgileriniz hazırlanıyor</p>
            <p className="mt-2 text-sm text-slate-500">
              Güncel sefer, yolcu ve ödeme detayları yükleniyor.
            </p>
          </div>
        ) : (
          <>
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

          </>
        )}
      </section>
    </div>
  );
}

function getFriendlyRouteError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Güzergah bilgileri yüklenemedi";

  if (message.includes("Akgunler API HTTP 403")) {
    return "Akgünler servisleri local ortamdan şu anda 403 ile engelleniyor. Bu yüzden kalkış ve varış limanları yüklenemedi. Aynı akış production/Vercel ortamında çalışır; local testte upstream erişim açılmadan liman verisi gelmez.";
  }

  return message;
}

function FitLine({
  as: Component = "p",
  text,
  className,
  minSize,
  maxSize,
}: {
  as?: "h1" | "h2" | "p";
  text: string;
  className?: string;
  minSize: number;
  maxSize: number;
}) {
  const [fontSize, setFontSize] = useState(maxSize);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLHeadingElement | HTMLParagraphElement>(null);

  useEffect(() => {
    function updateSize() {
      const container = wrapperRef.current;
      const content = contentRef.current;

      if (!container || !content) return;

      let nextSize = maxSize;
      content.style.fontSize = `${nextSize}px`;
      content.style.whiteSpace = "nowrap";
      content.style.display = "block";

      while (nextSize > minSize && content.scrollWidth > container.clientWidth) {
        nextSize -= 1;
        content.style.fontSize = `${nextSize}px`;
      }

      setFontSize(nextSize);
    }

    updateSize();

    const observer = new ResizeObserver(() => updateSize());
    if (wrapperRef.current) observer.observe(wrapperRef.current);

    window.addEventListener("resize", updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, [text, minSize, maxSize]);

  return (
    <div ref={wrapperRef} className="w-full overflow-hidden">
      <Component
        ref={contentRef}
        className={className}
        style={{ fontSize, whiteSpace: "nowrap" }}
      >
        {text}
      </Component>
    </div>
  );
}

function HomeSectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="w-full">
      <p className="text-xs uppercase tracking-[0.24em] text-brand-ocean/70">{eyebrow}</p>
      <FitLine
        as="h2"
        text={title}
        minSize={28}
        maxSize={48}
        className="mt-3 font-heading font-extrabold leading-tight tracking-[-0.05em] text-slate-900"
      />
      <FitLine
        as="p"
        text={description}
        minSize={15}
        maxSize={18}
        className="mt-3 leading-7 text-slate-600"
      />
    </div>
  );
}

function TimelineCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="antso-elevated-card rounded-[30px] p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-mist text-brand-ocean">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z"
          />
        </svg>
      </div>
      <h3 className="mt-5 font-heading text-2xl font-extrabold tracking-[-0.03em] text-slate-900">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
    </div>
  );
}

function FeaturedRouteCard({
  badge,
  title,
  description,
}: {
  badge: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative min-h-[460px] overflow-hidden rounded-[34px] shadow-[0_24px_72px_rgba(18,38,60,0.16)]">
      <div
        className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-[1.03]"
        style={{ backgroundImage: "url('/antso-liman.jpg')" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,42,60,0.12)_0%,rgba(12,42,60,0.35)_46%,rgba(12,42,60,0.9)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 p-7 text-white">
        <span className="inline-flex rounded-full bg-white/18 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur">
          {badge}
        </span>
        <h3 className="mt-4 font-heading text-4xl font-extrabold tracking-[-0.05em]">{title}</h3>
        <p className="mt-3 max-w-xl text-sm leading-7 text-white/82">{description}</p>
      </div>
    </div>
  );
}

function MiniRouteCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="antso-elevated-card flex min-h-[227px] flex-col justify-end rounded-[30px] p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-ocean/55">
        Hızlı özet
      </p>
      <h3 className="mt-3 font-heading text-[1.8rem] font-extrabold tracking-[-0.04em] text-slate-900">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
    </div>
  );
}

function OfferCard({
  eyebrow,
  title,
  description,
  featured,
}: {
  eyebrow: string;
  title: string;
  description: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`min-w-[290px] rounded-[30px] p-6 shadow-[0_18px_42px_rgba(18,38,60,0.06)] md:min-w-[360px] ${
        featured
          ? "antso-gradient-cta text-white"
          : "antso-elevated-card text-slate-900"
      }`}
    >
      <p
        className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
          featured ? "text-white/70" : "text-brand-ocean/58"
        }`}
      >
        {eyebrow}
      </p>
      <h3 className="mt-3 font-heading text-[1.9rem] font-extrabold tracking-[-0.04em]">
        {title}
      </h3>
      <p className={`mt-3 text-sm leading-7 ${featured ? "text-white/82" : "text-slate-600"}`}>
        {description}
      </p>
    </div>
  );
}

function EditorialFeature({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 text-brand-ocean">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-mist">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="m5 12 5 5L20 7"
            />
          </svg>
        </span>
        <p className="font-heading text-xl font-bold tracking-[-0.03em] text-slate-900">{title}</p>
      </div>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
    </div>
  );
}

function CorporateCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="antso-elevated-card rounded-[30px] p-6">
      <p className="font-heading text-2xl font-extrabold tracking-[-0.03em] text-slate-900">{title}</p>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
    </div>
  );
}

function FaqCard({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <div className="antso-elevated-card rounded-[30px] p-6">
      <p className="font-heading text-2xl font-extrabold tracking-[-0.03em] text-slate-900">{question}</p>
      <p className="mt-3 text-sm leading-7 text-slate-600">{answer}</p>
    </div>
  );
}

function FaqAccordionItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <details className="antso-faq antso-elevated-card rounded-[28px] p-6">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
        <span className="font-heading text-[1.55rem] font-extrabold tracking-[-0.04em] text-slate-900">
          {question}
        </span>
        <span className="antso-faq-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-mist text-brand-ocean transition">
          +
        </span>
      </summary>
      <p className="mt-4 pr-8 text-sm leading-7 text-slate-600">{answer}</p>
    </details>
  );
}

function ContactCard({
  title,
  description,
  href,
  cta,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="antso-elevated-card rounded-[30px] p-6">
      <p className="font-heading text-2xl font-extrabold tracking-[-0.03em] text-slate-900">{title}</p>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
      <Link
        href={href}
        className="antso-gradient-cta mt-6 inline-flex items-center rounded-full px-5 py-3 text-sm font-semibold text-white transition hover:brightness-105"
      >
        {cta}
      </Link>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-[26px] bg-white/82 px-5 py-4 shadow-[0_14px_32px_rgba(18,38,60,0.05)] ring-1 ring-white/90 backdrop-blur-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-brand-ocean/55">{title}</p>
      <p className="mt-2 text-base font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function StepRailItem({
  index,
  active,
  completed,
  title,
  description,
}: {
  index: number;
  active: boolean;
  completed: boolean;
  title: string;
  description: string;
}) {
  return (
    <div
      className={`rounded-[24px] border px-4 py-4 transition ${
        active
          ? "border-brand-sky/40 bg-brand-mist text-brand-ink"
          : completed
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-slate-200 bg-white/70 text-slate-500"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
            active
              ? "bg-brand-ink text-white"
              : completed
                ? "bg-emerald-500 text-white"
                : "bg-slate-100 text-slate-500"
          }`}
        >
          {completed ? "✓" : index + 1}
        </div>
        <div>
          <p className={`font-heading text-sm font-bold ${active ? "text-brand-ink" : "text-inherit"}`}>
            {title}
          </p>
          <p className={`mt-1 text-xs ${active ? "text-brand-ocean/70" : "text-inherit"}`}>
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="antso-box-stack animate-pulse">
      <div className="grid gap-[5px] lg:grid-cols-[1.15fr_1.15fr_0.95fr_210px]">
        <div className="h-[82px] rounded-[24px] bg-slate-100" />
        <div className="h-[82px] rounded-[24px] bg-slate-100" />
        <div className="h-[82px] rounded-[24px] bg-slate-100" />
        <div className="h-[82px] rounded-[999px] bg-slate-100" />
      </div>
      <div className="grid gap-[5px] lg:grid-cols-[0.9fr_1.1fr_0.9fr]">
        <div className="h-[82px] rounded-[24px] bg-slate-100" />
        <div className="h-[82px] rounded-[24px] bg-slate-100" />
        <div className="h-[82px] rounded-[24px] bg-slate-100" />
      </div>
    </div>
  );
}

function ArrowRightMini() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}
