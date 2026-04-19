# CLAUDE.md — Antso Denizcilik

Bu dosya, Claude'un projeyi sıfırdan tanıması için yazılmıştır.

---

## Proje Özeti

**Antso Denizcilik** — Akgünler Denizcilik'in feribot biletlerini satan bir acentenin web sitesi.  
Tek güzergah: **Anamur ↔ Girne** (feribot).  
Müşteri biletleri Akgünler'in kendi API'si üzerinden alınır; ödeme Akgünler'in 3D Secure sistemi ile yapılır.

- **GitHub:** https://github.com/onursuay/antso_denizcilik
- **Canlı site:** https://bilet.antsodenizcilik.com
- **Stack:** Next.js 16 App Router + TypeScript + Tailwind + Supabase (PostgreSQL + Auth + RLS)
- **Deploy:** Vercel (otomatik, `main` push'ta)

---

## Akgünler API Entegrasyonu

Akgünler, PHP tabanlı bir REST API sunar. Tüm istekler `POST` + `application/x-www-form-urlencoded`.

| Parametre | Değer |
|---|---|
| Base URL | `https://www.akgunlerbilet.com/akgunler_web_service/api.php` |
| `a_id` | `2145` (Antso acente ID) |
| `ak_id` | `777` (Akgünler kullanıcı ID) |
| 3D Secure URL | `https://www.akgunlerbilet.com/ws_secure_payment.php` |

**Önemli:** `a_id` ve `ak_id` credential'ları asla tarayıcıya gönderilmez. Tüm Akgünler API çağrıları Next.js server-side proxy route'larından geçer.

### Booking Akışı (5 adım)

```
1. getGuzergahlar()         → güzergah listesi (Anamur-Girne vb.)
2. getGuzergahBilgileri()   → seçilen güzergahın şehirleri + yolcu türleri
3. getSeferler()            → mevcut seferler + sepetId (s_id) oluşur
4. getYolcular()            → yolcu slot'ları (sefer seçilince)
5. setYolcuBilgisi()        → yolcu bilgileri doldurulur → toplam_fiyat döner
6. bileteDonustur3D()       → 3D Secure form parametreleri → tarayıcı Akgünler'e POST
7. [Akgünler callback]      → /api/akgunler/payment-callback → bileteDonustur3D → confirmation sayfası
8. getRezervasyonaAitBiletler() → bilet seri numaraları
```

---

## Dizin Yapısı

```
src/
├── app/
│   ├── (public)/               # Müşteri sayfaları
│   │   ├── page.tsx            # Ana sayfa — AkgunlerBookingWizard
│   │   ├── akgunler/confirmation/[id]/  # Ödeme sonrası bilet sayfası
│   │   ├── voyages/[id]/       # Dahili sefer detay (internal sistem)
│   │   ├── bookings/[id]/      # Rezervasyon detay
│   │   └── holds/[id]/pay/     # Hold ödeme sayfası
│   ├── (checkin)/              # QR check-in sistemi
│   ├── admin/                  # Admin paneli (gemi, sefer, ops, gelir)
│   ├── auth/                   # Login, register, logout, callback
│   └── api/
│       ├── akgunler/           # Akgünler proxy route'ları (7 adet)
│       │   ├── routes/         # GET güzergahlar + bilgileri
│       │   ├── sailings/       # GET seferler
│       │   ├── passengers/     # GET yolcular / POST bilgi kaydet
│       │   ├── checkout/       # POST → 3D form parametreleri
│       │   ├── payment-callback/ # POST Akgünler'den geri dönüş
│       │   ├── tickets/        # GET biletler
│       │   └── countries/      # GET ülkeler
│       ├── voyages/            # Dahili sefer API
│       ├── bookings/           # Rezervasyon API
│       ├── holds/              # Hold (yer tutma) API
│       ├── payments/           # Ödeme onay API
│       ├── admin/              # Admin API
│       ├── ops/                # Ops/reconciliation API
│       ├── checkin/            # Check-in API
│       ├── cron/               # Cron worker'lar
│       └── webhooks/           # Payment/refund webhook'lar
│
├── components/
│   ├── domain/akgunler/        # Booking wizard UI (5 bileşen)
│   │   ├── booking-wizard.tsx  # Ana wizard — step yönetimi
│   │   ├── route-selector.tsx  # Adım 1: güzergah + tarih + yolcu
│   │   ├── sailing-list.tsx    # Adım 2: sefer seçimi
│   │   ├── passenger-form.tsx  # Adım 3: yolcu bilgileri
│   │   └── payment-form.tsx    # Adım 4: kart + 3D Secure
│   ├── domain/                 # Diğer domain bileşenleri
│   ├── layout/                 # Header bileşenleri
│   └── ui/                     # Genel UI primitive'leri
│
├── lib/
│   ├── akgunler/
│   │   ├── client.ts           # Akgünler API istemcisi (tüm fonksiyonlar)
│   │   ├── types.ts            # Akgünler TypeScript tipleri
│   │   └── errors.ts           # AkgunlerApiError sınıfı
│   ├── api/                    # API handler yardımcıları
│   ├── auth/                   # Guards, roller
│   ├── db/                     # Supabase sorgu fonksiyonları
│   ├── gateway/                # iyzico ödeme adaptörü + webhook HMAC
│   ├── supabase/               # Client/server/admin Supabase instance'ları
│   ├── validation/             # Zod şemaları
│   └── pricing.ts              # Sunucu taraflı fiyat hesaplama
│
└── types/
    ├── database.ts             # Supabase tablo tipleri
    ├── domain.ts               # Domain modelleri
    └── api.ts                  # API request/response tipleri
```

---

## Veritabanı (Supabase)

7 migration dosyası `migrations/` klasöründe. Supabase Dashboard SQL Editor'e sırayla yapıştırılarak uygulanır.

| Migration | İçerik |
|---|---|
| 001 | Ana şema — tüm tablolar (19 tablo) |
| 002 | Core fonksiyonlar |
| 003 | İptal + check-in fonksiyonları |
| 004 | Reconciliation fonksiyonları |
| 005 | Sefer yönetimi fonksiyonları |
| 006 | Raporlama fonksiyonları |
| 007 | RLS politikaları |

Test verisi için: `migrations/seed_test_data.sql`

---

## Ortam Değişkenleri

`.env.local` (yerel) ve Vercel Dashboard → Settings → Environment Variables (prod):

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Ödeme (dahili sistem — iyzico)
PAYMENT_GATEWAY=iyzico
PAYMENT_GATEWAY_API_KEY=
PAYMENT_GATEWAY_SECRET_KEY=
PAYMENT_WEBHOOK_SECRET=
REFUND_WEBHOOK_SECRET=

# Cron
CRON_SECRET=                        # Vercel Cron isteklerini doğrular

# App
NEXT_PUBLIC_APP_URL=https://bilet.antsodenizcilik.com
WEBHOOK_SKIP_VERIFICATION=          # Sadece dev'de: true

# Akgünler API (prod'da Vercel'e eklenmelidir)
AKGUNLER_BASE_URL=https://www.akgunlerbilet.com/akgunler_web_service/api.php
AKGUNLER_A_ID=2145
AKGUNLER_AK_ID=777
AKGUNLER_3D_PAYMENT_URL=https://www.akgunlerbilet.com/ws_secure_payment.php
AKGUNLER_CALLBACK_URL=https://bilet.antsodenizcilik.com/api/akgunler/payment-callback
```

**Not:** `CRON_SECRET` Vercel'e eklenirken `printf '%s' 'değer'` kullanın, `echo` kullanmayın (trailing newline sorunu yaratır).

---

## Vercel Cron Jobs

`vercel.json` içinde tanımlı:

| Route | Zamanlama | Görev |
|---|---|---|
| `/api/cron/sweep-holds` | Her 15 dk | Süresi dolmuş hold'ları serbest bırak |
| `/api/cron/reconcile` | Her saat | Ödeme-rezervasyon tutarsızlıklarını yakala |
| `/api/cron/refund-retry` | Her 6 saat | Başarısız iadeleri tekrar dene |
| `/api/cron/health` | Her 5 dk | Sistem sağlık kontrolü |

---

## Kimlik Doğrulama

- Supabase Auth (email + password)
- Roller: `admin`, `operator`, `checkin_staff`, `passenger`
- Route koruması: `src/lib/supabase/middleware.ts`
- Guard fonksiyonları: `src/lib/auth/guards.ts`

---

## Önemli Notlar

1. **İki sistem birlikte çalışır:**
   - **Akgünler sistemi** — gerçek bilet satışı, ana sayfa "Online Bilet Al" tab'ı
   - **Dahili sistem** — Supabase tabanlı, voyage/booking/hold yönetimi, admin paneli

2. **Ana sayfa iki tab:**
   - "Online Bilet Al" → `AkgunlerBookingWizard` (4 adımlı native wizard)
   - "Sefer Sorgula" → dahili sefer sorgulama

3. **3D Secure akışı:** Kart bilgileri Next.js sunucusuna gelir → Akgünler API'sine iletilir → Akgünler, tarayıcının POST etmesi gereken form parametrelerini döner → `PaymentForm` hidden form'u otomatik submit eder → Akgünler 3D sayfasını açar → ödeme sonrası `/api/akgunler/payment-callback`'e yönlendirir.

4. **`require()` kullanımı:** `SeferSorgula` component'i içinde `require()` ile import yapılıyor — bu kasıtlı bir kalıptır, değiştirmeyin.

5. **Build kontrolü:** Her `git push`'tan önce `npm run build` çalıştırın ve hata olmadığını doğrulayın.
