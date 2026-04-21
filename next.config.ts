import type { NextConfig } from "next";

const AKGUNLER_PAYMENT_HOST = "https://www.akgunlerbilet.com";
const TURNSTILE_HOST = "https://challenges.cloudflare.com";

const securityHeaders = [
  // HTTPS zorunluluğu — 2 yıl, alt alan adları dahil
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Sayfanın iframe içine alınmasını engelle (clickjacking koruması)
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // Tarayıcının MIME sniffing yapmasını engelle
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Akgünler'e yönlendirirken tam URL yerine sadece origin iletilsin
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Gereksiz tarayıcı API'lerini kapat
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
  // CSP: form-action sadece kendi origin + Akgünler 3D Secure endpoint'i
  // frame-ancestors none: bu sayfayı kimse iframe edemez
  // connect-src: Supabase auth + kendi API route'ları
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js App Router hydration için unsafe-inline gerekli.
      // unsafe-eval development'ta gerekli; production'da kaldırılıyor.
      `script-src 'self' 'unsafe-inline' ${TURNSTILE_HOST}${process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""}`,
      // Tailwind ve Next.js inline style'ları için
      "style-src 'self' 'unsafe-inline'",
      // Görseller: kendi origin + data URI (önizlemeler)
      "img-src 'self' data: blob:",
      // next/font/google fontları build'de indirilip self'ten servis edilir
      "font-src 'self'",
      // XHR/fetch: kendi API'ler + Supabase (auth, realtime)
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      // Form POST: yalnızca kendi sayfalar ve Akgünler 3D Secure
      `form-action 'self' ${AKGUNLER_PAYMENT_HOST}`,
      // Cloudflare Turnstile challenge widget iframe
      `frame-src ${TURNSTILE_HOST}`,
      // Bu sayfayı hiçbir iframe içine alamaz
      "frame-ancestors 'none'",
      // Plugin nesneleri (Flash vb.) yasak
      "object-src 'none'",
      // Base tag manipülasyonunu engelle
      "base-uri 'self'",
    ].join("; "),
  },
];

// Ödeme sayfaları için daha sıkı CSP — Supabase bağlantısı kaldırıldı.
// Bu headers global CSP ile birlikte uygulanır; tarayıcı ikisini de zorunlu kılar (intersection).
const paymentSecurityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      // Ödeme sayfalarında Supabase bağlantısı gerekmez
      "connect-src 'self'",
      `form-action 'self' ${AKGUNLER_PAYMENT_HOST}`,
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      // Ödeme route'larına ek sıkı CSP (Supabase kaldırıldı)
      {
        source: "/akgunler/(.*)",
        headers: paymentSecurityHeaders,
      },
    ];
  },
};

export default nextConfig;
