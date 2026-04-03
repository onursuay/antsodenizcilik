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
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[linear-gradient(180deg,rgba(16,31,49,0.94),rgba(18,38,60,0.92))] shadow-[0_10px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2.5 px-4 py-1.5">
        <Link href="/" className="flex items-center">
          <div className="rounded-[14px] bg-[linear-gradient(180deg,#ffffff_0%,#f3f8fa_100%)] px-2 py-1 shadow-[0_8px_18px_rgba(0,0,0,0.14)]">
            <BrandLogo
              priority
              className="w-[54px] sm:w-[61px]"
              imageClassName="h-auto w-full object-contain"
            />
          </div>
        </Link>

        <PublicHeaderMenu signedIn={Boolean(user)} />
      </nav>
    </header>
  );
}
