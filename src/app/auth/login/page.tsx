"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";
  const callbackError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(callbackError ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
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
    <div className="grid w-full max-w-5xl antso-box-gap lg:grid-cols-[1.05fr_0.95fr]">
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
      </section>

      <section className="rounded-[34px] border border-[#d3e1e7] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,250,252,0.98))] p-7 shadow-[0_26px_70px_rgba(18,38,60,0.08)] lg:p-8">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[linear-gradient(180deg,#15314b_0%,#10253d_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_40px_rgba(18,38,60,0.18)] transition hover:brightness-105 disabled:opacity-50"
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
