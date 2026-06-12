import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kvkk | Antso Denizcilik",
  description:
    "Antso Denizcilik çerez politikası ve KVKK aydınlatma metni.",
  robots: { index: false, follow: true },
};

export default function KvkkPage() {
  return (
    <div className="antso-page-space py-16">
      <div className="mx-auto max-w-3xl px-4 text-slate-600">
        <h1 className="mb-2 text-3xl font-bold text-slate-800">Kvkk</h1>
        <p className="mb-10 text-slate-500">
          Çerez Politikası ve KVKK Aydınlatma Metni
        </p>

        <h2 className="mb-3 text-xl font-semibold text-slate-800">
          1. Çerez Nedir?
        </h2>
        <p className="mb-6 leading-relaxed">
          Çerezler (cookies), web sitemizi ziyaret ettiğinizde tarayıcınıza
          kaydedilen küçük metin dosyalarıdır. Sitenin düzgün çalışmasını,
          tercihlerinizin hatırlanmasını, ziyaret istatistiklerinin ölçülmesini
          ve size uygun içerik sunulmasını sağlarlar.
        </p>

        <h2 className="mb-3 text-xl font-semibold text-slate-800">
          2. Hangi Çerezleri Kullanıyoruz?
        </h2>
        <p className="mb-4 leading-relaxed">
          <strong>Antso Denizcilik</strong> web sitesinde aşağıdaki üç çerez
          kategorisi kullanılır. Ziyaretiniz sırasında açılan çerez izni
          penceresinden tercihlerinizi dilediğiniz zaman yönetebilirsiniz.
        </p>
        <div className="mb-6 overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-2 font-semibold">Kategori</th>
                <th className="px-4 py-2 font-semibold">Amaç</th>
                <th className="px-4 py-2 font-semibold">Onay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-2">Zorunlu</td>
                <td className="px-4 py-2">Temel işlevler, güvenlik, oturum.</td>
                <td className="px-4 py-2">Gerekli</td>
              </tr>
              <tr>
                <td className="px-4 py-2">Analitik</td>
                <td className="px-4 py-2">
                  Ziyaret istatistikleri (Google Analytics, Hotjar).
                </td>
                <td className="px-4 py-2">İsteğe bağlı</td>
              </tr>
              <tr>
                <td className="px-4 py-2">Pazarlama</td>
                <td className="px-4 py-2">
                  Reklam ölçümü ve yeniden pazarlama (Meta, Google Ads).
                </td>
                <td className="px-4 py-2">İsteğe bağlı</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mb-6 leading-relaxed">
          Sitemizde <strong>Google Consent Mode v2 (Onay Modu)</strong>{" "}
          uygulanmaktadır: Pazarlama veya analitik çerezlerine izin
          vermediğinizde ilgili araçlara kişisel veriniz aktarılmaz; ölçüm
          yalnızca kimliksiz biçimde yapılır.
        </p>

        <h2 className="mb-3 text-xl font-semibold text-slate-800">
          3. Çerezleri Nasıl Yönetebilirsiniz?
        </h2>
        <ul className="mb-6 list-disc space-y-2 pl-5 leading-relaxed">
          <li>
            Sitemize ilk girişte açılan çerez izni penceresinden “Kabul Et”,
            “Reddet” veya “Ayarlar” ile kategori bazında seçim yapabilirsiniz.
          </li>
          <li>
            Tarayıcınızın ayarlarından da çerezleri silebilir veya
            engelleyebilirsiniz.
          </li>
        </ul>

        <h2 className="mb-3 text-xl font-semibold text-slate-800">
          4. KVKK Aydınlatma Metni
        </h2>
        <h3 className="mb-2 font-semibold text-slate-700">
          4.1. Veri Sorumlusu
        </h3>
        <p className="mb-3 leading-relaxed">
          6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca,
          kişisel verileriniz veri sorumlusu sıfatıyla{" "}
          <strong>
            ANTSO DENİZCİLİK TURİZM TİCARET VE SANAYİ ANONİM ŞİRKETİ
          </strong>{" "}
          tarafından işlenmektedir.
        </p>
        <ul className="mb-6 list-none space-y-1 leading-relaxed">
          <li>
            <strong>E-posta:</strong>{" "}
            <a
              href="mailto:info@antsodenizcilik.com"
              className="text-brand-ocean hover:underline"
            >
              info@antsodenizcilik.com
            </a>
          </li>
          <li>
            <strong>Telefon:</strong> +90 530 257 48 55
          </li>
        </ul>

        <h3 className="mb-2 font-semibold text-slate-700">
          4.2. İşlenen Veriler, Amaç ve Hukuki Sebep
        </h3>
        <p className="mb-3 leading-relaxed">
          Çerezler aracılığıyla; IP adresi, cihaz/tarayıcı bilgisi, ziyaret
          edilen sayfalar ve (onay verdiyseniz) reklam tanımlayıcıları gibi
          veriler; sitenin güvenli sunulması, ziyaret istatistiklerinin
          ölçülmesi ve onayınıza bağlı olarak reklam faaliyetlerinin yürütülmesi
          amaçlarıyla işlenir. Zorunlu çerezler meşru menfaat ve hizmetin
          sunulabilmesi (KVKK m.5/2); analitik ve pazarlama çerezleri ise yalnızca{" "}
          <strong>açık rızanızla</strong> (KVKK m.5/1) işlenir.
        </p>

        <h3 className="mb-2 font-semibold text-slate-700">
          4.3. Haklarınız (KVKK m.11)
        </h3>
        <p className="mb-3 leading-relaxed">
          Kişisel verilerinize ilişkin bilgi talep etme, düzeltme, silme,
          işlemenin sınırlandırılması ve itiraz haklarına sahipsiniz.
          Taleplerinizi{" "}
          <a
            href="mailto:info@antsodenizcilik.com"
            className="text-brand-ocean hover:underline"
          >
            info@antsodenizcilik.com
          </a>{" "}
          üzerinden iletebilirsiniz.
        </p>
      </div>
    </div>
  );
}
