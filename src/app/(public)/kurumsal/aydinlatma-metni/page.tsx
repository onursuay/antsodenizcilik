import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aydınlatma Metni | Antso Denizcilik",
  description: "Antso Denizcilik KVKK kapsamında kişisel verilerin korunması aydınlatma metni.",
};

export default function AydinlatmaMetniPage() {
  return (
    <div className="antso-page-space py-16">
      <div className="mx-auto max-w-3xl px-4">
        <h1 className="mb-2 text-3xl font-bold text-slate-800">
          Kişisel Verilerin Korunması Aydınlatma Metni
        </h1>
        <p className="mb-10 text-sm text-slate-400">Son güncelleme: Nisan 2025</p>

        <div className="space-y-8 text-slate-600">
          <p>
            6698 Sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca, kişisel verileriniz
            aşağıda açıklanan kapsamda <strong className="text-slate-700">Antso Denizcilik Acentesi</strong> (&quot;Şirket&quot;) tarafından
            işlenmektedir.
          </p>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-800">1. Veri Sorumlusu</h2>
            <p>
              Antso Denizcilik Acentesi
              <br />İskele Mahallesi, Anamur / Mersin
              <br />E-posta:{" "}
              <a href="mailto:info@antsodenizcilik.com" className="text-brand-ocean hover:underline">
                info@antsodenizcilik.com
              </a>
              <br />Tel:{" "}
              <a href="tel:+905302574855" className="text-brand-ocean hover:underline">
                +90 530 257 48 55
              </a>
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-800">
              2. İşlenen Kişisel Veriler ve İşleme Amaçları
            </h2>
            <p className="mb-3">
              Feribot bileti satın alma sürecinde aşağıdaki kişisel verileriniz işlenmektedir:
            </p>
            <ul className="ml-5 list-disc space-y-2">
              <li>
                <strong className="text-slate-700">Kimlik verileri</strong> (ad, soyad, doğum tarihi, uyruk, pasaport/kimlik no):
                Bilet rezervasyonu oluşturulması, gümrük ve sınır geçiş bildirimleri
              </li>
              <li>
                <strong className="text-slate-700">İletişim verileri</strong> (e-posta, telefon):
                Bilet teslimi, rezervasyon bildirimleri, müşteri desteği
              </li>
              <li>
                <strong className="text-slate-700">İşlem verileri</strong> (rezervasyon ID, ödeme referansı):
                Sözleşme ifası, yasal yükümlülük
              </li>
              <li>
                <strong className="text-slate-700">Elektronik işlem verileri</strong> (IP, oturum bilgisi):
                Güvenlik, fraud önleme
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-800">3. Hukuki Dayanak</h2>
            <p className="mb-2">Kişisel verileriniz;</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Sözleşmenin kurulması ve ifası (KVKK m. 5/2-c)</li>
              <li>Kanuni yükümlülük (KVKK m. 5/2-ç)</li>
              <li>Meşru menfaat (KVKK m. 5/2-f)</li>
            </ul>
            <p className="mt-2">hukuki sebeplerine dayanılarak işlenmektedir.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-800">4. Aktarım</h2>
            <p>
              Kişisel verileriniz; bilet işlemlerinin yürütülebilmesi amacıyla Akgünler Denizcilik
              A.Ş. ile ve yasal zorunluluklar kapsamında ilgili kamu kurumları ile paylaşılabilmektedir.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-800">5. Saklama Süresi</h2>
            <p>
              Verileriniz, ilgili mevzuatta öngörülen süreler ve işleme amacının gerektirdiği
              süre boyunca saklanmakta; akabinde imha edilmektedir.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-800">6. Haklarınız (KVKK m. 11)</h2>
            <p className="mb-2">Veri sorumlusuna başvurarak aşağıdaki haklarınızı kullanabilirsiniz:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
              <li>İşlenmişse bilgi talep etme</li>
              <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
              <li>Yurt içinde / yurt dışında aktarıldığı üçüncü kişileri bilme</li>
              <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme</li>
              <li>Silinmesini veya yok edilmesini isteme</li>
              <li>
                Otomatik sistemler ile analiz edilmesi nedeniyle aleyhinize bir sonucun ortaya
                çıkmasına itiraz etme
              </li>
              <li>
                Kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız hâlinde zararın
                giderilmesini talep etme
              </li>
            </ul>
            <p className="mt-3">
              Başvurularınızı{" "}
              <a href="mailto:info@antsodenizcilik.com" className="text-brand-ocean hover:underline">
                info@antsodenizcilik.com
              </a>{" "}
              adresine iletebilirsiniz.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
