import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Çerez Politikası | Antso Denizcilik",
  description: "Antso Denizcilik çerez politikası ve çerezlerin kullanımı hakkında bilgi.",
};

export default function CerezPolitikasiPage() {
  return (
    <div className="antso-page-space py-16">
      <div className="mx-auto max-w-3xl px-4">
        <h1 className="mb-2 text-3xl font-bold text-slate-800">Çerez Politikası</h1>
        <p className="mb-10 text-sm text-slate-400">Son güncelleme: Nisan 2025</p>

        <div className="space-y-8 text-slate-600">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-800">Çerez Nedir?</h2>
            <p>
              Çerezler, ziyaret ettiğiniz web sitelerinin tarayıcınıza yerleştirdiği küçük metin
              dosyalarıdır. Sitemizi daha verimli çalıştırmak, size daha iyi bir deneyim sunmak ve
              oturumunuzu korumak amacıyla çerez kullanılmaktadır.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-800">Kullandığımız Çerez Türleri</h2>

            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <h3 className="mb-1 font-semibold text-slate-700">Zorunlu Çerezler</h3>
                <p className="text-sm">
                  Sitenin düzgün çalışması için gereklidir. Oturum yönetimi ve güvenlik
                  doğrulaması bu çerezler aracılığıyla sağlanır. Bu çerezler devre dışı bırakılamaz.
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <h3 className="mb-1 font-semibold text-slate-700">İşlevsel Çerezler</h3>
                <p className="text-sm">
                  Dil tercihi, oturum durumu ve bilet rezervasyon adımlarının hatırlanması gibi
                  işlevler için kullanılır.
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <h3 className="mb-1 font-semibold text-slate-700">Analitik Çerezler</h3>
                <p className="text-sm">
                  Ziyaretçi sayısı ve kullanım istatistikleri gibi anonim verileri toplamak için
                  kullanılabilir. Bu veriler sitemizdeki deneyimi iyileştirmek amacıyla analiz edilir.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-800">
              Çerezleri Nasıl Kontrol Edebilirsiniz?
            </h2>
            <p className="mb-3">
              Tarayıcı ayarlarından çerezleri devre dışı bırakabilir veya silebilirsiniz. Ancak
              zorunlu çerezlerin devre dışı bırakılması, sitenin bir bölümünün veya tamamının
              düzgün çalışmamasına neden olabilir.
            </p>
            <ul className="ml-5 list-disc space-y-1 text-sm">
              <li><strong className="text-slate-700">Chrome:</strong> Ayarlar → Gizlilik ve Güvenlik → Çerezler</li>
              <li><strong className="text-slate-700">Firefox:</strong> Seçenekler → Gizlilik ve Güvenlik → Çerezler</li>
              <li><strong className="text-slate-700">Safari:</strong> Tercihler → Gizlilik → Çerezleri Yönet</li>
              <li><strong className="text-slate-700">Edge:</strong> Ayarlar → Gizlilik, Arama ve Hizmetler → Çerezler</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-800">Üçüncü Taraf Çerezleri</h2>
            <p>
              Ödeme işlemleri sırasında Akgünler Denizcilik&apos;in 3D Secure sayfasına yönlendirilirsiniz.
              Bu sayfa kendi çerez politikasına tabidir.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-800">İletişim</h2>
            <p>
              Çerez politikamızla ilgili sorularınız için:
              <br />E-posta:{" "}
              <a href="mailto:info@antsodenizcilik.com" className="text-brand-ocean hover:underline">
                info@antsodenizcilik.com
              </a>
              <br />Telefon:{" "}
              <a href="tel:+905302574855" className="text-brand-ocean hover:underline">
                +90 530 257 48 55
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
