# PROJECT MASTER BRIEF
## Proje Adı
antso_denizcilik

## Amaç
Modern, güvenli ve stabil çalışan tek operatörlü feribot bilet satış ve rezervasyon sistemi geliştirmek.

Referans mantık: akgunlerbilet.com  
Ancak arayüz daha modern, daha güven veren ve wizard yapısında olacak.

## Proje Tanımı
Bu proje klasik bir bilet satış arayüzü değildir.  
Sistem, çok boyutlu kapasite kısıtlarıyla çalışan güvenli bir rezervasyon ve satış altyapısıdır.

Asıl hedef sadece bilet satmak değil; yolcu, araç, tır, kabin, metre ve gemi içi alan kısıtlarını doğru yöneten, hata toleransı çok düşük, operasyonel ve hukuki risk doğurmayan bir allocation tabanlı sistem kurmaktır.

## Kritik Kurallar
- Sistem hata kabul etmez.
- Backend kapasite hesabı çok sağlam çalışmalıdır.
- Yolcu, araç, tır, kabin, metre/metrekare ve gemi içi alan mantığı doğru hesaplanmalıdır.
- İptal edilen bilet sonrası sadece gerçekten uygun kapasite tekrar satışa açılmalıdır.
- Tek yolcu iptali oldu diye tır satışı açılmamalıdır.
- Hold, booking, payment, cancellation, refund ve inventory mantığı transaction disiplininde çalışmalıdır.
- Ödeme güvenliği kritiktir.
- Yanlış işleyiş hukuki ve operasyonel risk doğurur.

## Sistem Tanımı (Zorunlu)
Bu proje klasik bilet satış sistemi değildir.

Sistem, çok boyutlu kapasite (multi-dimensional capacity) kısıtları ile çalışan real-time allocation engine mantığında tasarlanacaktır.

Kapasite sadece adet bazlı değil, aşağıdaki constraint'ler ile birlikte değerlendirilir:

- Yolcu kapasitesi (passenger count)
- Araç sayısı (vehicle count)
- Şerit metre (lane meter)
- Alan (m²)
- Kabin sayısı (cabin units)

Her rezervasyon isteği bu constraint'ler üzerinden atomic olarak değerlendirilir.  
Hiçbir constraint ihlal edilmeden allocation yapılır.

## İşlem Prensipleri
- HOLD mekanizması zorunludur.
- HOLD, timeout bazlı reservation lock mantığında çalışmalıdır.
- HOLD sırasında kapasite geçici olarak düşmelidir.
- Payment başarısız olursa HOLD rollback edilmelidir.
- Tüm işlemler transaction ve concurrency-safe olmalıdır.
- Parallel request'lerde race condition oluşmamalıdır.
- Capacity check her kritik işlem anında yeniden değerlendirilmelidir.
- Hiçbir satış sadece “adet” mantığıyla onaylanmamalıdır.
- Allocation engine tek karar verici katman olmalıdır.

## Cancellation Sistemi
- İptaller partial capacity release mantığında çalışmalıdır.
- Sadece iptal edilen kaydın gerçekten serbest bıraktığı constraint alanları tekrar satışa açılmalıdır.
- Sistem hiçbir zaman yanlış kapasite açmamalıdır.
- Tekil iptal, ilişkisiz kapasite tiplerini satışa açmamalıdır.

## Core Sistem Modülleri
- Sefer yönetimi
- Gemi ve kapasite yönetimi
- Inventory / allocation engine
- HOLD yönetimi
- Rezervasyon yönetimi
- Ödeme yönetimi
- İptal / iade yönetimi
- Admin paneli
- Public satış wizard’ı
- Check-in operasyonu

## Geliştirme Yöntemi
- Tüm kodu Claude Code yazacak.
- Tek repo içinde çalışılacak.
- Modül bazlı ayrı chat mantığı kullanılacak.
- Her adım tek tek ilerleyecek.
- Bir adım bitmeden sonraki adıma geçilmeyecek.
- Gereksiz detay olmayacak, net aksiyon olacak.

## Geliştirme Sırası
1. Sistem prensibi
2. Domain model
3. Veritabanı
4. Rezervasyon / capacity / payment mantığı
5. Admin
6. Public wizard
7. Check-in

## Başarı Kriteri
Sistem; kapasiteyi yanlış hesaplamayan, hatalı satış açmayan, ödeme ve rezervasyon akışını güvenli yöneten, iptal sonrası sadece doğru envanteri geri açan, modern ve güven veren bir feribot satış platformu olarak çalışmalıdır.
