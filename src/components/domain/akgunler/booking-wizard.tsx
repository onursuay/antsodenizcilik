"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PassengerForm } from "./passenger-form";
import { PaymentForm } from "./payment-form";
import { ProcessingOverlay } from "./processing-overlay";
import { RouteSelector } from "./route-selector";
import { SailingList } from "./sailing-list";

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
  const [selectedSeferId, setSelectedSeferId] = useState(0);

  const [yolcular, setYolcular] = useState<YolcuData[]>([]);
  const [toplamFiyat, setToplamFiyat] = useState(0);

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
        body: JSON.stringify({ s_id: sepetId, yolcular: yolcuBilgileri }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }

      setToplamFiyat(data.toplam_fiyat ?? 0);
      setStep("payment");
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
        <section className="relative overflow-hidden bg-brand-ink text-white" id="bilet-al">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(94,188,213,0.3),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(36,95,116,0.22),transparent_24%),linear-gradient(180deg,#12263c_0%,#142d45_56%,#112337_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-[#eef4f7] md:h-24" />

          <div className="relative antso-hero-shell">
            <div className="antso-box-stack">
              <div className="grid items-stretch gap-12 lg:grid-cols-[1.02fr_0.98fr]">
                <div className="antso-dark-panel flex h-full flex-col rounded-[36px] p-6 md:p-8">
                  <div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs uppercase tracking-[0.24em] text-brand-seafoam shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                      <span className="h-2 w-2 rounded-full bg-brand-sky" />
                      Akgünler resmi satış noktası
                    </span>

                    <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                      Anamur ile Girne arasında
                      <span className="mt-2 block text-brand-seafoam">
                        hızlı, güvenli ve modern feribot rezervasyonu
                      </span>
                    </h1>

                    <p className="mt-5 max-w-2xl text-base leading-7 text-white/[0.72] sm:text-lg">
                      Feribot seferlerini gerçek zamanlı sorgulayın, yolcu bilgilerini tek akışta
                      tamamlayın ve 3D Secure ile ödemenizi güvenle bitirip biletinizi anında alın.
                    </p>
                  </div>

                  <div className="mt-8 grid antso-box-gap sm:grid-cols-2">
                    <HeroBalanceCard
                      title="Hızlı ve odaklı akış"
                      description="Bu ekran yalnızca Anamur ↔ Girne hattına odaklanır; bu sayede arama, yolcu bilgileri ve ödeme adımları daha temiz ilerler."
                    />
                    <HeroBalanceCard
                      title="Kurumsal güvence"
                      description="Sefer arama, yolcu bilgileri ve 3D Secure ödeme süreci tek akışta daha kontrollü ve anlaşılır şekilde ilerler."
                    />
                  </div>

                  <div className="mt-auto pt-6">
                    <div className="flex flex-wrap gap-3 text-sm text-white/[0.72]">
                      <TrustPill label="3D Secure ödeme" />
                      <TrustPill label="Anlık bilet üretimi" />
                      <TrustPill label="Yolcu ve araç desteği" />
                    </div>
                  </div>
                </div>

                <div className="relative h-full">
                  <div className="absolute -left-6 -top-6 h-28 w-28 rounded-full bg-brand-sky/18 blur-3xl" />
                  <div className="absolute -bottom-8 -right-6 h-36 w-36 rounded-full bg-brand-ocean/16 blur-3xl" />
                  <div className="antso-soft-panel relative flex h-full flex-col overflow-hidden rounded-[36px] p-5 md:p-7">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-sky/45 to-transparent" />
                    <div className="mb-6 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-brand-ocean/60">
                          Feribot araması
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                          Güncel seferleri şimdi sorgulayın
                        </h2>
                      </div>
                      <div className="rounded-full border border-brand-sky/12 bg-brand-mist/75 px-3 py-1 text-xs font-semibold text-brand-ocean">
                        Tek ekranda arama
                      </div>
                    </div>

                    {initialLoading ? (
                      <SearchSkeleton />
                    ) : (
                      <RouteSelector guzergahlar={guzergahlar} onSearch={handleRouteSearch} />
                    )}
                  </div>
                </div>
              </div>

              <div className="grid antso-box-gap md:grid-cols-2 xl:grid-cols-5">
                {HERO_FEATURES.map((item) => (
                  <HeroFeatureCard
                    key={item.eyebrow}
                    eyebrow={item.eyebrow}
                    title={item.title}
                    description={item.description}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="antso-overlap-shell">
          <div className="grid antso-box-gap lg:grid-cols-3">
            <FeatureCard
              title="Seferleri hızlı kıyaslayın"
              description="Saat, gemi ve kişi başı fiyat detayını tek listede görüp doğrudan seçim yapın."
            />
            <FeatureCard
              title="Bilgileri hatasız tamamlayın"
              description="Yolcu, belge ve iletişim bilgilerini adım adım girin; özet paneli süreci canlı takip etsin."
            />
            <FeatureCard
              title="Ödeme sonrası hemen devam edin"
              description="Ödemeniz tamamlandığında bilet numaraları ve rezervasyon detayları aynı akışta görünür."
            />
          </div>
        </section>

        <section id="sefer-takvimi" className="antso-section-shell antso-section-shell-start">
          <HomeSectionHeader
            eyebrow="Sefer Takvimi"
            title="Planınızı güncel sefer akışına göre netleştirin"
            description="Tek güzergah üzerinde çalışan rezervasyon akışı, seçtiğiniz tarihe göre anlık seferleri ve biletlenebilir seçenekleri listeler."
          />
          <div className="antso-section-stack grid antso-box-gap lg:grid-cols-3">
            <TimelineCard
              title="Anamur → Girne"
              description="Gidiş yönünde seçtiğiniz tarihe ait müsait feribotlar arama sonucunda canlı olarak listelenir."
            />
            <TimelineCard
              title="Girne → Anamur"
              description="Dönüş planlı seyahatlerde karşı yön seferi aynı akış içinde seçilerek rezervasyon tek seferde tamamlanır."
            />
            <TimelineCard
              title="Biletleme akışı"
              description="Tarih, sefer, yolcu bilgileri ve ödeme adımları ardışık ilerler; biletler ödeme sonrası anında oluşur."
            />
          </div>
        </section>

        <section id="kurumsal" className="antso-section-shell">
          <div className="grid antso-box-gap lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[34px] bg-brand-ink p-8 text-white shadow-[0_28px_80px_rgba(15,23,42,0.18)]">
              <p className="text-xs uppercase tracking-[0.24em] text-brand-seafoam">Kurumsal</p>
              <h2 className="mt-4 text-3xl font-semibold">
                Antso Denizcilik, Anamur ve Girne hattında odaklı bir online satış deneyimi sunar
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/[0.7]">
                Site, Akgünler Denizcilik biletleme altyapısını server-side entegrasyon ile kullanır.
                Yolcu akışı tek güzergaha odaklanır; bu sayede sefer arama, yolcu bilgisi ve ödeme
                deneyimi daha hızlı ve daha anlaşılır ilerler.
              </p>
            </div>

            <div className="grid antso-box-gap md:grid-cols-2">
              <CorporateCard
                title="Resmi acente akışı"
                description="Akgünler API çağrıları tarayıcı yerine sunucu üzerinden yapılır; kritik kimlik bilgileri istemciye açılmaz."
              />
              <CorporateCard
                title="Odaklı rezervasyon"
                description="Sadece Anamur ↔ Girne hattı için tasarlanan akış, karar süresini kısaltan sade bir arayüz sunar."
              />
              <CorporateCard
                title="Güvenli ödeme"
                description="Kart bilgileri 3D Secure akışıyla işlenir; ödeme doğrulaması operatörün güvenli yönlendirmesi ile tamamlanır."
              />
              <CorporateCard
                title="Rezervasyon takibi"
                description="Ödeme sonrası confirmation ekranı ve rezervasyon detayları üzerinden bilet ve işlem durumu izlenebilir."
              />
            </div>
          </div>
        </section>

        <section id="sss" className="antso-section-shell">
          <HomeSectionHeader
            eyebrow="Sıkca Sorulan Sorular"
            title="Biletleme sürecinde en çok sorulan konular"
            description="Rezervasyon akışında karar vermeyi kolaylaştıran temel bilgileri tek yerde topladık."
          />
          <div className="antso-section-stack grid antso-box-gap lg:grid-cols-2">
            <FaqCard
              question="Sefer saatlerini nerede görüyorum?"
              answer="Ana sayfadaki arama modülünde tarih ve yolcu bilgilerinizi seçtiğinizde, o güne ait müsait seferler sonuç ekranında canlı olarak listelenir."
            />
            <FaqCard
              question="Ödeme sonrası biletler ne zaman oluşur?"
              answer="Ödeme 3D Secure doğrulaması tamamlandıktan sonra biletler anında oluşturulur ve confirmation ekranında bilet numaraları gösterilir."
            />
            <FaqCard
              question="Yolcu bilgilerini neden eksiksiz girmeliyim?"
              answer="Biletleme işlemi operatör sistemine gerçek yolcu verileriyle işlendiği için ad, soyad, belge numarası ve doğum tarihi alanları eksiksiz olmalıdır."
            />
            <FaqCard
              question="Rezervasyonumu daha sonra nereden takip ederim?"
              answer="Hesabınıza giriş yaptıktan sonra Rezervasyonlarım ekranından rezervasyon detaylarını, ödeme ve iade durumlarını görüntüleyebilirsiniz."
            />
          </div>
        </section>

        <section id="iletisim" className="antso-section-shell">
          <HomeSectionHeader
            eyebrow="İletişim"
            title="Rezervasyon ve işlem takibi için en hızlı erişim yolları"
            description="Canlı akışta destek almanız gereken durumlarda aşağıdaki alanlar üzerinden işleminizi takip edebilirsiniz."
          />
          <div className="antso-section-stack grid antso-box-gap lg:grid-cols-3">
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
      <section className="relative overflow-hidden bg-brand-ink text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(94,188,213,0.22),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(36,95,116,0.16),transparent_24%),linear-gradient(180deg,#12263c_0%,#132a40_100%)]" />
        <div className="relative antso-section-shell">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-brand-seafoam">
                Rezervasyon akışı
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-white">
                {cikisSehirAd} <span className="text-white/42">→</span> {varisSehirAd}
              </h1>
              <p className="mt-2 text-sm text-white/[0.68]">
                Sefer seçimi, yolcu bilgileri ve ödeme adımlarını tek akışta tamamlayın.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setStep("route")}
              className="inline-flex items-center rounded-full border border-white/[0.12] bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.1]"
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

          <div className="antso-dark-panel mt-6 rounded-[30px] p-3">
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

function HeroFeatureCard({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_50px_rgba(0,0,0,0.16)]">
      <p className="text-[11px] uppercase tracking-[0.22em] text-white/42">{eyebrow}</p>
      <p className="mt-3 text-lg font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-white/[0.65]">{description}</p>
    </div>
  );
}

function HeroBalanceCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-7 text-white/[0.64]">{description}</p>
    </div>
  );
}

function TrustPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      {label}
    </span>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="antso-elevated-card rounded-[30px] p-6">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-mist text-brand-ocean">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M5 12h14m-7-7 7 7-7 7"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
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
    <div className="max-w-3xl">
      <p className="text-xs uppercase tracking-[0.24em] text-brand-ocean/70">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">{description}</p>
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
      <h3 className="mt-5 text-xl font-semibold text-slate-900">{title}</h3>
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
      <p className="text-lg font-semibold text-slate-900">{title}</p>
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
      <p className="text-lg font-semibold text-slate-900">{question}</p>
      <p className="mt-3 text-sm leading-7 text-slate-600">{answer}</p>
    </div>
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
      <p className="text-lg font-semibold text-slate-900">{title}</p>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
      <Link
        href={href}
        className="mt-6 inline-flex items-center rounded-full bg-brand-ink px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(18,38,60,0.16)] transition hover:bg-[#0f2134]"
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
    <div className="rounded-[26px] border border-white/10 bg-white/[0.05] px-5 py-4">
      <p className="text-xs uppercase tracking-[0.2em] text-white/42">{title}</p>
      <p className="mt-2 text-base font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-white/58">{description}</p>
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
          ? "border-brand-sky/60 bg-brand-mist text-brand-ink"
          : completed
            ? "border-emerald-400/35 bg-emerald-400/10 text-white"
            : "border-white/[0.08] bg-white/[0.03] text-white/[0.62]"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
            active
              ? "bg-brand-ink text-white"
              : completed
                ? "bg-emerald-400 text-brand-ink"
                : "bg-white/[0.08] text-white"
          }`}
        >
          {completed ? "✓" : index + 1}
        </div>
        <div>
          <p className={`text-sm font-semibold ${active ? "text-brand-ink" : "text-inherit"}`}>
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
      <div className="flex gap-3">
        <div className="h-14 flex-1 rounded-[24px] bg-slate-100" />
        <div className="h-14 flex-1 rounded-[24px] bg-slate-100" />
      </div>
      <div className="grid antso-box-gap lg:grid-cols-[1fr_auto_1fr]">
        <div className="h-28 rounded-[26px] bg-slate-100" />
        <div className="mx-auto h-14 w-14 rounded-[24px] bg-slate-100" />
        <div className="h-28 rounded-[26px] bg-slate-100" />
      </div>
      <div className="grid antso-box-gap xl:grid-cols-3">
        <div className="h-28 rounded-[26px] bg-slate-100" />
        <div className="h-28 rounded-[26px] bg-slate-100" />
        <div className="h-28 rounded-[26px] bg-slate-100" />
      </div>
      <div className="h-28 rounded-[30px] bg-slate-100" />
    </div>
  );
}
