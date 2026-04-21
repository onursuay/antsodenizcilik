# Ödeme Yüzeyi Güvenlik Notu

## Kart Verisi

Kart verisi (PAN, CVV, son kullanma) Next.js sunucusuna **hiçbir zaman ulaşmaz**.

Akış:
1. Kullanıcı `/akgunler/checkout` sayfasında kart bilgisini tarayıcıda girer
2. Tarayıcı formu doğrudan `https://www.akgunlerbilet.com/ws_secure_payment.php` adresine POST eder
3. Akgünler 3D Secure sayfasını açar; ödeme burada tamamlanır
4. Akgünler `/api/akgunler/payment-callback` endpoint'ine sonucu bildirir (kart verisi içermez)

## Route İzolasyonu

Ödeme ve onay sayfaları `src/app/(payment)/` route grubu altında:

| Route | Açıklama |
|---|---|
| `/akgunler/checkout` | Kart girişi — doğrudan Akgünler'e POST |
| `/akgunler/confirmation/[id]` | Ödeme sonrası bilet görüntüleme |

Bu sayfalarda:
- Header/footer yok (minimal layout)
- `noindex, nofollow` meta
- Supabase bağlantısı yok (CSP `connect-src 'self'`)
- Üçüncü parti script yok — mevcut kodda hiç Analytics/GTM/Hotjar/pixel yoktur; bu belge kod seviyesinde tescil eder

## CSP

Global CSP + ödeme route'larına özel ek CSP (`next.config.ts`):

```
/akgunler/(.*)  →  connect-src 'self'  (Supabase kaldırıldı)
```

Tüm sayfalarda:
- `form-action 'self' https://www.akgunlerbilet.com`
- `frame-ancestors 'none'`
- Production'da `unsafe-eval` yok

## Endpoint Güvenliği

- Tüm Akgünler proxy route'ları HMAC-SHA256 cart token doğrulaması gerektirir (`AKGUNLER_CART_SECRET`)
- Token TTL: 4 saat
- Payment callback: `result !== "success"` kontrol edilir, field presence loglanır (değer değil)
- Checkout route: runtime'da kart alanı hard-reject (`FORBIDDEN_CARD_FIELDS`)

## Ortam Gereksinimleri

| Değişken | Açıklama |
|---|---|
| `AKGUNLER_CART_SECRET` | HMAC secret — her ortamda farklı olmalı |
| `NEXT_PUBLIC_APP_URL` | Callback URL'i için doğru domain (örn. `https://ticket.antsodenizcilik.com`) |
| `AKGUNLER_BASE_URL` | Akgünler API base URL |
| `AKGUNLER_3D_PAYMENT_URL` | 3D Secure form action URL |

## Rate Limiting

`src/lib/rate-limit.ts` — şu an in-memory, instance-local.
`RateLimiter` interface'ini implemente eden Vercel KV / Upstash Redis sınıfı yazılıp swap edilebilir.

## Bilinen Sınırlar

- PCI scope tamamen sıfır değildir — SAQ A-EP uygulanabilir (merchant kart sayfasını kontrol ediyor)
- Rate limiting instance-local: yüksek traffic'te dağıtık limit (Vercel KV) gereklidir
- Akgünler callback'inde `cc_nr` / `cc_cvc2` alanları dönebilir — büyük ihtimalle maskelenmiş; Akgünler ile teyit edilmeli

## Prod Doğrulama

```bash
# Header kontrolü
node scripts/check-headers.mjs https://ticket.antsodenizcilik.com

# Kart alanı reddi
curl -s -X POST https://ticket.antsodenizcilik.com/api/akgunler/checkout \
  -H "Content-Type: application/json" \
  -d '{"sepetId":1,"email":"x@x.com","cartToken":"x","ccNr":"4111111111111111"}' | jq .
# Beklenen: {"error":"Gecersiz istek"} 400
```
