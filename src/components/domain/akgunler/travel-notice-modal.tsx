"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./travel-notice-modal.module.css";

const NOTICE_SECTIONS = [
  {
    title: "1. Kıbrıs Cumhuriyeti Pasaportu Sahipleri İçin Vize Bilgilendirmesi",
    paragraphs: [
      "2 Ocak 2026’dan itibaren, resmî ve umuma mahsus Kıbrıs Cumhuriyeti pasaportu sahibi Kıbrıslı Rum vatandaşlarının, Türkiye’ye seyahat etmeden önce vize almaları gerekmektedir.",
      "Vizeler, www.evisa.gov.tr adresi üzerinden e-vize olarak ya da Türkiye Cumhuriyeti’nin yurt dışındaki dış temsilciliklerinden temin edilebilecektir.",
    ],
  },
  {
    title: "2. TC Kimlikler Hakkında Önemli Bilgi",
    paragraphs: [
      "Her yaştan TC vatandaşı, 0-15 yaş dahil, KKTC’ye kimlik ile çıkacaksa kimliklerinin yeni tip, çipli ve fotoğraflı olması zorunludur.",
      "0-15 yaş arası çocukların fotoğraflı, çipli kimliği yoksa pasaportlarını kullanabilirler.",
    ],
  },
  {
    title: "3. Sefere Son 24 Saat Kala İptal ve Değişiklik Kuralları",
    paragraphs: [
      "Sefere kalan son 24 saat içerisinde biletler, kanıtlanabilir ve geçerli bir sebep olmaksızın açığa alınamaz veya farklı seferlere değiştirilemez. Bu durumda vergi hariç bilet tutarından %50 oranında kesinti uygulanarak iptal edilir.",
      "Sefere 6 saat kalana kadar süre içerisinde; kanıtlanabilir ve geçerli bir sebep olmaksızın biletler açığa alınamaz veya farklı seferlere değiştirilemez. Bu durumda vergi hariç bilet tutarından %75 oranında kesinti uygulanarak iptal edilir.",
    ],
  },
  {
    title: "4. Check-in ve Liman Kabul Saatleri",
    paragraphs: [
      "Biletinizde belirtilen sefer saatinden 60 dakika önce yolcu ve araç kabul işlemleri sonlanacaktır. Bu saatten sonra gelen yolcular için işlem yapılamayacaktır.",
      "Taşucu ve Girne limanlarında gerçekleştirilen gece seferlerinde, operasyonu yürüten birimlerin çalışma saatleri nedeniyle, tüm yolcuların en geç 23:00’da limana/gemiye alınması gerekmektedir.",
      "Via Mare gemisinin seyir süresi yaklaşık 5 saattir. Gemi kalkış saati, gemi kaptanı tarafından varış limanı açılış saati olan 08:00 sonrası liman girişi yapılacak şekilde planlanmaktadır.",
    ],
  },
  {
    title: "5. Evcil Hayvan Kuralları",
    paragraphs: [
      "Küçük boy evcil hayvanlar kapalı yolcu salonlarına sadece kafes içinde alınabilir.",
      "Salon içine alınabilecek maksimum kafes ölçüsü 105 cm x 73 cm x 79 cm’dir.",
      "Büyük boy evcil hayvanlar, güvertede gemi personelinin göstereceği yerde kafesinde yolculuk yapabilir.",
      "Kamaralara evcil hayvan kabul edilmemektedir.",
    ],
  },
  {
    title: "6. Araçla Seyahat ve Çipli Kimlik Bilgilendirmesi",
    paragraphs: [
      "KKTC ve TC vatandaşları, yeni tip çipli kimlikleri ile araçlarını Türkiye ve KKTC arasındaki kısa süreli turistik seyahatlerinde kullanabilirler. Turist olarak aracı ile seyahat edenlerden pasaport şartı kaldırılmıştır.",
      "Türkiye’ye araçlarıyla gitmek isteyen KKTC vatandaşları, Araç Kayıt Dairesi’nden çıkış iznini pasaport yerine KKTC çipli kimlik kartlarıyla yapmaları halinde araçlarını Türkiye’ye götürebilirler.",
      "TC vatandaşı araç sahipleri, TC çipli kimlikleri ile kısa süreli turist olarak gelebilirler.",
      "Oturma/çalışma izni olan veya öğrenci statüsündeki kişiler için araçları ile giriş/çıkışta pasaport zorunluluğu devam etmektedir.",
    ],
  },
  {
    title: "7. Yabancı Plakalı Araçlar İçin Önemli Bilgi",
    paragraphs: [
      "TC plaka olmayan, Kıbrıs plakası dahil yabancı plakalı araçların Türkiye’de gümrük işlemleri sırasında Türkiye sınırları içinde yeni kesilen veya geçmişte kesilen ve ödenmemiş cezalarla karşılaşması mümkündür.",
      "Bu cezalar trafik, köprü ve yol geçiş ücretlerini kapsayabilir.",
      "Ödemeler telefona indirilecek “GİB” uygulaması üzerinden yapılabilir.",
      "Ceza ücretlerini ödemeyen araç sahipleri çıkış yapamayacaktır.",
      "Nakit ceza tahsilatı sadece hafta içi mesai saatleri içinde yapılmaktadır.",
      "Mağduriyet yaşanmaması için gerekli kontrollerin önceden yapılması önemlidir.",
    ],
  },
  {
    title: "8. İletişim",
    paragraphs: ["Daha detaylı bilgi almak için:", "+90 530 257 48 55", "info@antsodenizcilik.com"],
  },
] as const;

export function TravelNoticeModal() {
  const [open, setOpen] = useState(true);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#071625]/68 px-3 py-4 backdrop-blur-sm sm:px-5">
      <div className={`${styles.frame} w-full max-w-4xl`}>
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="travel-notice-title"
          aria-describedby="travel-notice-description"
          className="relative flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[27px] bg-white shadow-[0_28px_90px_rgba(7,22,37,0.38)]"
        >
          <header className="relative border-b border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbfd_100%)] px-5 pb-4 pt-5 sm:px-7 sm:pb-5 sm:pt-6">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-ocean">
              Önemli Bilgilendirme
            </p>
            <h2 id="travel-notice-title" className="pr-12 text-xl font-bold tracking-tight text-[#10253d] sm:text-2xl">
              Seyahatleriniz İçin Bilinmesi Gerekenler
            </h2>
            <p id="travel-notice-description" className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Rezervasyon öncesinde seyahat, belge, check-in ve iptal kurallarını inceleyiniz.
            </p>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Bilgilendirme penceresini kapat"
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-brand-sky/60 hover:text-[#10253d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-sky sm:right-5 sm:top-5"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </header>

          <div className={`${styles.scroll} flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6`}>
            <div className="space-y-6">
              {NOTICE_SECTIONS.map((section) => (
                <section key={section.title}>
                  <h3 className="text-base font-semibold leading-6 text-[#10253d] sm:text-[17px]">
                    {section.title}
                  </h3>
                  <div className="mt-2 space-y-2.5 text-sm leading-6 text-slate-600 sm:text-[15px]">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <footer className="border-t border-slate-200/80 bg-white px-5 py-4 sm:px-7 sm:py-5">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="antso-gradient-cta inline-flex h-11 w-full items-center justify-center rounded-full px-6 text-sm font-semibold text-white transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-sky sm:w-auto sm:min-w-36"
            >
              Anladım
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
