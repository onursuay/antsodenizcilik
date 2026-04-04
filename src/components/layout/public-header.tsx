import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { BrandLogo } from "@/components/ui/brand-logo";
import { PublicHeaderMenu } from "./public-header-menu";

export async function PublicHeader() {
  let user = null;

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = await createServerSupabase();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      user = authUser;
    } catch {
      user = null;
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#10253d]/96 shadow-[0_10px_30px_rgba(4,12,25,0.24)] backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center">
          <div className="rounded-[18px] bg-white px-3 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.18)] ring-1 ring-white/70">
            <BrandLogo
              priority
              className="w-[74px] sm:w-[84px]"
              imageClassName="h-auto w-full object-contain"
            />
          </div>
        </Link>

        <PublicHeaderMenu signedIn={Boolean(user)} />
      </nav>
    </header>
  );
}
