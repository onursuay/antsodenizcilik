import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kural ve Koşullar | Antso Denizcilik",
  description:
    "Antso Denizcilik bilet satın alma, check-in, değişiklik, iptal, iade, bagaj, evcil hayvan, kimlik, araç ve seyahat şartları.",
};

const sections = [
  {
    title: "1. Genel Bilet Kullanım Şartları",
    items: [
      "Tüm kategorilerdeki biletler, satın alma esnasında belirtilen şahsa aittir; başkasına devredilemez veya kullandırılamaz.",
    ],
  },
  {
    title: "2. Check-in ve Biniş Kartı Kuralları",
    items: [
      "Satın alınan biletler, sefer günü yetkili acentaya ibraz edilmelidir.",
      "Yolcular, sefer saatinden en geç 2 saat önce hazır bulunmalıdır.",
      "Bayram, yılbaşı ve özel dönemlerde yolcuların en az 3 saat önce hazır bulunması gerekir.",
      "Araçlı yolcular için check-in işlemleri seferden 60 dakika önce kapanır.",
      "Araçsız yolcular için check-in işlemleri seferden 30 dakika önce kapanır.",
      "Biniş kartı olmayan yolcular gemiye alınmaz.",
    ],
  },
  {
    title: "3. Özel Statülü Biletler ve Belge Zorunluluğu",
    items: [
      "Öğrenci, asker, basın vb. biletlerde ilgili belgelerin ibraz edilmesi zorunludur.",
      "Yanlış veya eksik beyan nedeniyle doğan ücret farkları check-in sırasında tahsil edilir.",
      "Araç ücret kategorisi, ruhsatta resmi makamlarca tescil edilmiş türe göre belirlenir.",
    ],
  },
  {
    title: "4. Sefer Değişikliği ve İptal Yetkisi",
    items: [
      "Firma gerekli gördüğü hallerde sefer gününü, saatini, gemiyi veya gemi türünü değiştirebilir ya da seferi iptal edebilir.",
      "Bu değişiklikler nedeniyle yolcu veya acenteler zarar ya da tazminat talep edemez.",
    ],
  },
  {
    title: "5. Bilet İptal, İade ve Açığa Alma Kuralları",
    items: [
      "a. Satın alındıktan sonraki ilk 24 saat içinde cezasız iptal yapılabilir; bu hak aynı gün seferi için alınan biletlerde geçerli değildir.",
      "b. Sefere 24 saat kalana kadar değişiklik veya açık bilet işlemi yapılabilir; açık bilet 1 yıl içinde kullanılabilir.",
      "c. Sefere 24 saat kalana kadar yapılan iptallerde vergi hariç bilet tutarından %25 kesinti uygulanır.",
      "d. Son 24 saat içinde geçerli ve kanıtlanabilir bir sebep olmadan açığa alma veya değişiklik yapılamaz; iptalde %50 kesinti uygulanır.",
      "e. Sefere 6 saat kalana kadar geçerli ve kanıtlanabilir bir sebep olmadan açığa alma veya değişiklik yapılamaz; iptalde %75 kesinti uygulanır.",
      "f. Sefer kapanış saati itibarıyla sefer saati geçmiş biletlerde yalnızca vergi tutarı kadar iade yapılır.",
    ],
  },
  {
    title: "6. Sefer Değişikliği ve Ücret Farkları",
    items: [
      "Değişiklikte daha yüksek ücretli bir kademe oluşursa ücret farkı yolcu tarafından ödenir.",
      "Daha düşük ücretli bir kademe oluşursa iade yapılmaz.",
    ],
  },
  {
    title: "7. Mücbir Sebep / Hava Koşulları / Teknik Nedenler",
    items: [
      "Teknik neden, hava koşulları veya firma kararıyla iptal ya da değişiklik olduğunda yolcunun değişiklik, tam iade veya açık bilet hakkı vardır.",
      "Gemi türü veya güzergah değişirse ücret farkı kuralı uygulanır.",
    ],
  },
  {
    title: "8. Bagaj ve Araç Sorumluluğu",
    items: [
      "Feribot tipi gemilerde yolcu başına 3 valiz ve 1 el çantası taşınabilir.",
      "Hızlı deniz otobüslerinde yolcu başına 2 valiz ve 1 el bagajı taşınabilir.",
      "Fazla bagaj için ek ücret talep edilebilir veya fazla bagaj kabul edilmeyebilir.",
      "Bagajın hasar görmesi veya kaybolması halinde sorumluluk yolcuya aittir.",
      "Araç yükleme, seyir veya boşaltma sırasında oluşabilecek hasarlardan araç sahibi sorumludur.",
    ],
  },
  {
    title: "9. Seyahat Belgeleri ve Ülke Giriş Kuralları",
    items: [
      "Yolcular, iki liman ülkesinin yasa ve yönetmeliklerine uygun hareket etmekle yükümlüdür.",
      "Gerekli belgeler ibraz edilmelidir.",
      "Eksik veya uygun olmayan belgelerden doğabilecek sorunlar yolcunun sorumluluğundadır.",
    ],
  },
  {
    title: "10. Yasaklı Maddeler",
    items: [
      "Patlayıcı, yanıcı, kesici maddeler, sıkıştırılmış gazlar, radyoaktif maddeler, yasa dışı maddeler veya insan ve gemi güvenliğini tehlikeye atabilecek maddeler taşınamaz.",
    ],
  },
  {
    title: "11. Gemi Kuralları",
    items: [
      "Yolcular kaptanın talimatlarına uymakla yükümlüdür.",
      "Gemi içinde, limanda bekleme sırasında ve seyir boyunca elektronik sigara dahil tütün ürünü kullanılamaz.",
    ],
  },
  {
    title: "12. Hamile Yolcu Kuralları",
    items: [
      "28-35. hafta aralığındaki hamile yolculardan doktor raporu talep edilir.",
      "36. haftadan itibaren hamile yolcular sefere kabul edilmez.",
      "Hamilelik durumu acenteye bildirilmelidir.",
    ],
  },
  {
    title: "13. Yetkili Mahkeme",
    items: [
      "Taşımadan doğacak anlaşmazlıklarda KKTC Girne mahkemeleri yetkilidir.",
    ],
  },
  {
    title: "14. Güncel Kuralların Geçerliliği",
    items: [
      "Akgünler’in bilet üzerindeki kurallarda değişiklik yapma hakkı saklıdır.",
      "Ulusal veya uluslararası yasal değişiklikler geçerli olur.",
      "Güncel kurallar için www.akgunlerdenizcilik.com adresi dikkate alınmalıdır.",
    ],
  },
  {
    title: "15. Evcil Hayvan Kuralları",
    items: [
      "Küçük boy evcil hayvanlar kapalı yolcu salonlarına yalnızca kafes içinde alınabilir.",
      "Salon içine alınabilecek maksimum kafes ölçüsü 105 cm x 73 cm x 79 cm’dir.",
      "Büyük boy evcil hayvanlar güvertede, gemi personelinin göstereceği yerde, kafes içinde yolculuk yapabilir.",
      "Kamaralara evcil hayvan kabul edilmez.",
    ],
  },
  {
    title: "16. TC Kimlikler Hakkında Önemli Bilgi",
    items: [
      "Her yaştan TC vatandaşı, 0-15 yaş dahil, KKTC’ye kimlik ile çıkacaksa yeni tip, çipli ve fotoğraflı kimlik kullanmalıdır.",
      "0-15 yaş çocukların fotoğraflı çipli kimliği yoksa pasaport kullanılabilir.",
    ],
  },
  {
    title: "17. Araçla Seyahat Bilgileri",
    items: [
      "KKTC ve TC vatandaşları çipli kimlikleri ile araçlarını Türkiye’ye götürebilir.",
      "Türkiye’ye araçlarıyla gitmek isteyen KKTC vatandaşları, çıkış iznini KKTC çipli kimlik kartıyla yapmaları halinde araçlarını Türkiye’ye götürebilir.",
      "TC vatandaşları kısa süreli turist olarak çipli kimlikleriyle gelebilir.",
      "Oturma veya çalışma izni olan ya da öğrenci statüsündeki kişiler için araç giriş ve çıkışında pasaport zorunluluğu devam eder.",
    ],
  },
  {
    title: "18. Yabancı Plakalı Araçlar İçin Önemli Bilgi",
    items: [
      "Kıbrıs plakası dahil yabancı plakalı araçların Türkiye’deki gümrük işlemleri sırasında geçmiş veya yeni trafik, köprü ya da yol cezaları karşılarına çıkabilir.",
      "Ödemeler GİB uygulaması üzerinden yapılabilir.",
      "Ceza ödemeyen araç sahipleri çıkış yapamaz.",
      "Nakit ceza tahsilatı yalnızca hafta içi mesai saatlerinde yapılabilir.",
    ],
  },
  {
    title: "19. İletişim",
    items: ["Detaylı bilgi için +90 530 257 48 55 numaralı telefondan veya info@antsodenizcilik.com adresinden ulaşabilirsiniz."],
  },
] as const;

export default function KuralVeKosullarPage() {
  return (
    <div className="antso-page-space py-16">
      <div className="mx-auto max-w-4xl px-4">
        <h1 className="mb-3 text-3xl font-bold text-slate-800">Kural ve Koşullar</h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-500">
          Bilet satın alma, check-in, değişiklik, iptal, iade, bagaj, evcil hayvan, kimlik, araç ve seyahat şartları
        </p>

        <div className="mt-10 space-y-8 text-slate-600">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-3 text-lg font-semibold text-slate-800">{section.title}</h2>
              <ul className="ml-5 list-disc space-y-2 leading-7">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
