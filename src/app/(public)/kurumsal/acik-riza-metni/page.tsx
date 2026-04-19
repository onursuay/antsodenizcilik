import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Açık Rıza Metni | Antso Denizcilik",
  description: "Antso Denizcilik KVKK kapsamında açık rıza metni.",
};

export default function AcikRizaMetniPage() {
  return (
    <div className="antso-page-space py-16">
      <div className="mx-auto max-w-3xl px-4">
        <h1 className="mb-2 text-3xl font-bold text-slate-800">Açık Rıza Metni</h1>
        <p className="mb-10 text-sm text-slate-400">Son güncelleme: Nisan 2026</p>

        <div className="space-y-8 text-slate-600">
          <p>
            6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) kapsamında{" "}
            <strong className="text-slate-700">Antso Denizcilik Acentesi</strong>{" "}
            (&quot;Şirket&quot;) tarafından işlenecek kişisel verilerime ilişkin olarak,
            Aydınlatma Metni çerçevesinde bilgilendirildiğimi, aşağıda açıklanan
            işleme faaliyetlerine özgür irademle açık rıza verdiğimi beyan ederim.
          </p>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-800">1. Rıza Kapsamı</h2>
            <p>
              Kişisel verilerimin (ad, soyad, T.C. kimlik / pasaport numarası,
              doğum tarihi, uyruk, iletişim bilgileri, ödeme bilgileri) aşağıdaki
              amaçlarla işlenmesine açık rıza veriyorum:
            </p>
            <ul className="ml-5 mt-3 list-disc space-y-1">
              <li>Feribot bileti rezervasyonu ve satışının gerçekleştirilmesi</li>
              <li>
                Bilet işlemlerinin tamamlanabilmesi amacıyla Akgünler Denizcilik A.Ş.
                ile ve gümrük / liman otoriteleri ile paylaşılması
              </li>
              <li>
                Seyahat tarih / saat değişiklikleri veya iptalleri ile ilgili SMS
                ve e-posta yoluyla bilgilendirme yapılması
              </li>
              <li>Müşteri destek hizmetlerinin sağlanması</li>
              <li>Yasal yükümlülüklerin yerine getirilmesi</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-800">2. Yurt Dışına Aktarım</h2>
            <p>
              Kıbrıs&apos;a (Kuzey Kıbrıs Türk Cumhuriyeti) giriş işlemleri için
              kimlik ve seyahat verilerimin ilgili ülke otoritelerine ve Akgünler
              Denizcilik A.Ş. aracılığıyla bu otoritelere aktarılmasına açık rıza
              veriyorum.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-800">3. Rızanın Geri Alınması</h2>
            <p>
              Açık rızamı dilediğim zaman{" "}
              <a
                href="mailto:info@antsodenizcilik.com"
                className="text-brand-ocean hover:underline"
              >
                info@antsodenizcilik.com
              </a>{" "}
              adresine yazılı başvuru göndererek geri alabileceğimi biliyorum. Rızamı
              geri çekmem, yalnızca ileriye yönelik sonuç doğurur; geçmişte
              gerçekleştirilmiş işleme faaliyetlerinin hukuka uygunluğunu etkilemez.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-800">4. Haklarım</h2>
            <p>
              KVKK&apos;nın 11. maddesi kapsamında sahip olduğum haklar{" "}
              <a
                href="/kurumsal/aydinlatma-metni"
                className="text-brand-ocean hover:underline"
              >
                Aydınlatma Metni
              </a>{" "}
              içinde ayrıntılı olarak belirtilmiştir. Bu haklarımı{" "}
              <a
                href="mailto:info@antsodenizcilik.com"
                className="text-brand-ocean hover:underline"
              >
                info@antsodenizcilik.com
              </a>{" "}
              adresine başvurarak kullanabileceğimi biliyorum.
            </p>
          </section>

          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            Bu metni okuduğumu, anladığımı ve yukarıda belirtilen işleme ile
            aktarım faaliyetlerine KVKK m. 5/1 ve m. 9 kapsamında özgür irademle
            açık rıza verdiğimi kabul ve beyan ederim.
          </p>
        </div>
      </div>
    </div>
  );
}
