import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";

export async function PublicHeader() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-white/10 bg-[#0C1829]">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <AnchorIcon />
          <div className="leading-none">
            <div className="text-sm font-bold tracking-widest text-white">ANTSO</div>
            <div className="text-[10px] font-medium tracking-widest text-blue-400">DENİZCİLİK</div>
          </div>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          <Link href="/" className="text-sm text-slate-300 transition-colors hover:text-white">
            Bilet Al
          </Link>
          <Link
            href="/account/bookings"
            className="text-sm text-slate-300 transition-colors hover:text-white"
          >
            Rezervasyonlarım
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/account/bookings"
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                Hesabım
              </Link>
              <form action="/auth/logout" method="post">
                <button
                  type="submit"
                  className="text-sm text-slate-400 transition-colors hover:text-white"
                >
                  Çıkış
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-sm text-slate-300 transition-colors hover:text-white"
              >
                Giriş Yap
              </Link>
              <Link
                href="/auth/register"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
              >
                Kayıt Ol
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

function AnchorIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <circle cx="12" cy="6" r="2" stroke="#60a5fa" strokeWidth="2" />
      <path
        d="M12 8v13M5 16l7 5 7-5M8 11H4M20 11h-4"
        stroke="#60a5fa"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
