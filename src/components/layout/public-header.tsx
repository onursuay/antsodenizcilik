import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";

export async function PublicHeader() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b bg-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold">
          Antso Denizcilik
        </Link>

        <div className="flex items-center gap-4 text-sm">
          <Link href="/" className="hover:underline">
            Seferler
          </Link>

          {user ? (
            <>
              <Link href="/account/bookings" className="hover:underline">
                Rezervasyonlarım
              </Link>
              <form action="/auth/logout" method="post">
                <button type="submit" className="hover:underline">
                  Çıkış
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="hover:underline">
                Giriş Yap
              </Link>
              <Link
                href="/auth/register"
                className="rounded bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700"
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
