import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gizlilik Politikası | Antso Denizcilik",
  description: "Antso Denizcilik gizlilik politikası ve kişisel veri işleme ilkeleri.",
};

export default function GizlilikPolitikasiPage() {
  return (
    <div className="antso-page-space py-16">
      <div className="mx-auto max-w-3xl px-4">
        <h1 className="mb-2 text-3xl font-bold text-slate-800">Gizlilik Politikası</h1>
        <p className="mb-10 text-sm text-slate-400">Son güncelleme: Nisan 2025</p>

        <div className="space-y-8 text-slate-600">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-800">1. Genel Bilgiler</h2>
            <p>
              Antso Denizcilik Acentesi olarak; web sitemizi kullanan ziyaretçilerimizin ve bilet
              satın alan müşterilerimizin kişisel verilerinin gizliliğini korumak önceliğimizdir.
              Bu politika, hangi verileri topladığımızı, neden topladığımızı ve nasıl kullandığımızı
              açıklamaktadır.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-800">2. Toplanan Kişisel Veriler</h2>
            <p className="mb-2">Hizmetlerimizden yararlanmanız kapsamında aşağıdaki veriler işlenebilmektedir:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Ad, soyad, doğum tarihi, cinsiyet, uyruk</li>
              <li>Pasaport veya kimlik numarası</li>
              <li>E-posta adresi ve telefon numarası</li>
              <li>Ödeme işlemine ilişkin sipariş bilgileri (kart bilgileri sitemizde saklanmaz)</li>
              <li>IP adresi ve tarayıcı bilgileri</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-800">3. Verilerin Kullanım Amaçları</h2>
            <ul className="ml-5 list-disc space-y-1">
              <li>Feribot bileti rezervasyonu ve satışı</li>
              <li>Müşteri hizmetleri ve destek</li>
              <li>Yasal yükümlülüklerin yerine getirilmesi</li>
              <li>Güvenlik ve doğrulama süreçleri</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-800">4. Üçüncü Taraflarla Paylaşım</h2>
            <p>
              Kişisel verileriniz; bilet işlemlerinin tamamlanabilmesi amacıyla Akgünler Denizcilik
              ile ve yasal zorunluluklar kapsamında yetkili kamu kurum ve kuruluşlarıyla paylaşılabilir.
              Pazarlama amacıyla üçüncü taraflarla paylaşılmaz.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-800">5. Veri Güvenliği</h2>
            <p>
              Web sitemiz SSL/TLS şifrelemesi ile korunmaktadır. Ödeme işlemleri Akgünler
              Denizcilik&apos;in 3D Secure altyapısı üzerinden yürütülmekte olup kart bilgileri
              sunucularımızda tutulmamaktadır.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-800">6. Haklarınız</h2>
            <p>
              6698 sayılı KVKK kapsamında kişisel verilerinize erişim, düzeltme, silme veya
              işleme itiraz hakkına sahipsiniz. Talepleriniz için{" "}
              <a href="mailto:info@antsodenizcilik.com" className="text-brand-ocean hover:underline">
                info@antsodenizcilik.com
              </a>{" "}
              adresine yazabilirsiniz.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-800">7. İletişim</h2>
            <p>
              Gizlilik politikamıza ilişkin sorularınız için:
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
