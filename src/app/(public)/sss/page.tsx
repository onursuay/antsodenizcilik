import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sıkça Sorulan Sorular | Antso Denizcilik",
  description: "Anamur-Girne feribot bileti hakkında sıkça sorulan sorular ve cevapları.",
};

const FAQS = [
  {
    q: "Hangi güzergahta sefer düzenliyorsunuz?",
    a: "Antso Denizcilik olarak Anamur (Türkiye) ile Girne (Kuzey Kıbrıs) arasında düzenli feribot seferleri sunuyoruz.",
  },
  {
    q: "Bilet satın almak için hesap açmam gerekiyor mu?",
    a: "Hayır. Misafir olarak da bilet satın alabilirsiniz. Ancak hesap açarak geçmiş biletlerinize kolayca ulaşabilirsiniz.",
  },
  {
    q: "Ödeme nasıl yapılıyor?",
    a: "Ödemeler Akgünler Denizcilik'in güvenli 3D Secure ödeme sistemi üzerinden kredi/banka kartı ile gerçekleştirilmektedir.",
  },
  {
    q: "Biletimi aldıktan sonra nasıl görüntülerim?",
    a: "Ödeme tamamlandıktan sonra bilet numaranız ve seyahat detaylarınız ekranda görüntülenir. Aynı bilgiler e-posta adresinize de iletilir.",
  },
  {
    q: "Pasaport veya kimlik belgesi gerekiyor mu?",
    a: "Evet. Kıbrıs'a geçiş için geçerli pasaport veya T.C. kimlik kartı zorunludur. Araç ile geçiş yapacaksanız araç ruhsatınızı da yanınızda bulundurmanız gerekmektedir.",
  },
  {
    q: "Yolculuk süresi ne kadar?",
    a: "Anamur-Girne feribotu yaklaşık 2,5 – 3 saat sürmektedir. Hava ve deniz koşullarına bağlı olarak süre değişebilir.",
  },
  {
    q: "Araçlı geçiş yapabilir miyim?",
    a: "Evet. Araçlı geçiş için ek ücret uygulanmaktadır. Bilet satın alırken araç tipinizi seçebilirsiniz.",
  },
  {
    q: "Sefer iptali veya değişiklik olursa ne olur?",
    a: "Olası iptal veya değişikliklerde Akgünler Denizcilik müşterilerini bilgilendirir. Detaylı bilgi için info@antsodenizcilik.com adresine yazabilir ya da +90 530 257 48 55 numaralı telefonu arayabilirsiniz.",
  },
  {
    q: "Liman vergisi veya ek ücretler var mı?",
    a: "Gösterilen bilet fiyatına liman hizmet bedeli dahildir. Gümrük ve pasaport işlemleri için ayrıca ücret alınmaz.",
  },
  {
    q: "Hayvanlarla seyahat edebilir miyim?",
    a: "Evcil hayvanlarla seyahat koşulları sefere göre farklılık gösterebilmektedir. Lütfen +90 530 257 48 55 numaralı hattı arayarak önceden bilgi alın.",
  },
];

export default function SSSPage() {
  return (
    <div className="antso-page-space py-16">
      <div className="mx-auto max-w-3xl px-4">
        <h1 className="mb-2 text-3xl font-bold text-slate-800">Sıkça Sorulan Sorular</h1>
        <p className="mb-10 text-slate-500">
          Anamur–Girne feribot seyahatiyle ilgili merak ettikleriniz.
        </p>

        <div className="space-y-4">
          {FAQS.map((faq, i) => (
            <details
              key={i}
              className="group rounded-2xl border border-slate-100 bg-white shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 font-semibold text-slate-700 hover:text-brand-ocean">
                {faq.q}
                <svg
                  className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="px-6 pb-5 text-slate-600">{faq.a}</p>
            </details>
          ))}
        </div>

        <div className="mt-12 rounded-2xl bg-blue-50 p-6 text-center">
          <p className="font-medium text-slate-700">Cevabını bulamadığınız bir soru mu var?</p>
          <p className="mt-1 text-sm text-slate-500">
            <a href="mailto:info@antsodenizcilik.com" className="text-brand-ocean hover:underline">
              info@antsodenizcilik.com
            </a>{" "}
            adresine yazın veya{" "}
            <a href="tel:+905302574855" className="text-brand-ocean hover:underline">
              +90 530 257 48 55
            </a>{" "}
            numaralı hattı arayın.
          </p>
        </div>
      </div>
    </div>
  );
}
