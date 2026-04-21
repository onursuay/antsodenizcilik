"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { CloudflareTurnstile } from "@/components/ui/cloudflare-turnstile";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";
  const callbackError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(callbackError ?? "");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!turnstileToken) {
      setError("Lütfen önce 'Gerçek kişi olduğunuzu doğrulayın' adımını tamamlayın.");
      return;
    }

    setLoading(true);

    const supabase = createBrowserSupabase();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  }

  return (
    <div className="grid w-full max-w-6xl antso-box-gap lg:grid-cols-[1.2fr_1fr]">
      <section className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,#132a40_0%,#10253d_100%)] p-8 text-white shadow-[0_30px_80px_rgba(18,38,60,0.18)] lg:p-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs uppercase tracking-[0.24em] text-brand-seafoam">
          <span className="h-2 w-2 rounded-full bg-brand-sky" />
          Hesabınıza giriş yapın
        </span>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
          Rezervasyonlarınıza
          <span className="mt-2 block text-brand-seafoam">tek ekrandan ulaşın</span>
        </h1>

        <p className="mt-4 max-w-xl text-sm leading-7 text-white/68 sm:text-base">
          Biletlerinizi, ödeme durumunuzu ve rezervasyon detaylarınızı hesabınızdan takip edin.
          Henüz hesabınız yoksa birkaç adımda yeni hesap oluşturabilirsiniz.
        </p>

        <div className="mt-8 grid antso-box-gap sm:grid-cols-3">
          <AuthHighlight
            title="Rezervasyon takibi"
            description="Bilet ve işlem geçmişinizi görüntüleyin."
          />
          <AuthHighlight
            title="Hızlı erişim"
            description="Gelecek yolculuklarınıza tek yerden ulaşın."
          />
          <AuthHighlight
            title="Güvenli yönetim"
            description="Hesap üzerinden işlem detaylarını izleyin."
          />
        </div>

        <div className="mt-6 flex flex-nowrap items-center justify-between gap-2 whitespace-nowrap text-[9px] font-medium uppercase tracking-[0.14em] text-white/55 sm:text-[10px]">
          <span className="inline-flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-brand-seafoam" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="10" width="16" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 018 0v3" />
            </svg>
            3D Secure ödeme
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-brand-seafoam" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7l8-4z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            Akgünler yetkili acentesi
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-brand-seafoam" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            SSL korumalı
          </span>
        </div>

        <div className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-brand-seafoam/80">Destek</p>
          <p className="mt-2 text-sm font-semibold text-white">Sorularınız için buradayız.</p>
          <div className="mt-3 flex flex-col gap-2 text-sm text-white/75 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-2">
            <a
              href="tel:+905302574855"
              className="inline-flex items-center gap-2 transition hover:text-white"
            >
              <svg className="h-4 w-4 text-brand-seafoam" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
              </svg>
              +90 530 257 48 55
            </a>
            <a
              href="https://wa.me/905302574855"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 transition hover:text-white"
            >
              <svg className="h-4 w-4 text-brand-seafoam" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.5 14.4c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.78-1.67-2.08-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.05 1.02-1.05 2.5s1.07 2.9 1.22 3.1c.15.2 2.1 3.2 5.1 4.48.71.3 1.27.49 1.7.62.72.23 1.37.2 1.88.12.58-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35zM12 2C6.48 2 2 6.48 2 12c0 1.76.46 3.45 1.33 4.95L2 22l5.2-1.36A9.95 9.95 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" />
              </svg>
              WhatsApp
            </a>
            <a
              href="mailto:info@antsodenizcilik.com"
              className="inline-flex items-center gap-2 transition hover:text-white"
            >
              <svg className="h-4 w-4 text-brand-seafoam" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 7l9 6 9-6" />
              </svg>
              info@antsodenizcilik.com
            </a>
          </div>
        </div>
      </section>

      <section className="rounded-[34px] border border-[#d3e1e7] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,250,252,0.98))] p-8 shadow-[0_26px_70px_rgba(18,38,60,0.08)] lg:p-10">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.24em] text-brand-ocean/62">Kullanıcı girişi</p>
          <h2 className="text-2xl font-semibold text-slate-900">Giriş Yap</h2>
          <p className="text-sm text-slate-500">
            E-posta adresiniz ve şifrenizle hesabınıza erişin.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
              E-posta
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#dbe6eb] bg-[#f5f9fb] px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-sky focus:bg-white"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
              Şifre
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#dbe6eb] bg-[#f5f9fb] px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-sky focus:bg-white"
            />
          </div>

          <div className="pt-1">
            <CloudflareTurnstile onVerify={setTurnstileToken} />
          </div>

          <button
            type="submit"
            disabled={loading || !turnstileToken}
            className="w-full rounded-full bg-[linear-gradient(180deg,#15314b_0%,#10253d_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_40px_rgba(18,38,60,0.18)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        <div className="mt-6 rounded-[28px] border border-brand-sky/14 bg-brand-mist/55 p-5">
          <p className="text-sm font-semibold text-slate-900">Henüz hesabınız yok mu?</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Yeni bir hesap oluşturarak rezervasyon geçmişinizi tek yerden yönetebilir, sonraki
            işlemlerinizi daha hızlı tamamlayabilirsiniz.
          </p>
          <Link
            href="/auth/register"
            className="mt-4 inline-flex items-center rounded-full border border-brand-sky/35 px-5 py-2.5 text-sm font-semibold text-brand-ocean transition hover:border-brand-sky/60 hover:bg-white"
          >
            Hesap Oluştur
          </Link>
        </div>
      </section>
    </div>
  );
}

function AuthHighlight({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-white/62">{description}</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-transparent antso-page-space">
      <div className="mx-auto flex max-w-7xl items-center justify-center">
        <Suspense fallback={<div className="text-sm text-gray-400">Yükleniyor...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
