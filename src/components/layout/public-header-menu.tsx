import Link from "next/link";

const MENU_ITEMS = [
  { label: "Ana Sayfa", href: "/#ana-sayfa" },
  { label: "Sefer Takvimi", href: "/#sefer-takvimi" },
  { label: "Kurumsal", href: "/#kurumsal" },
  { label: "Sıkca Sorulan Sorular", href: "/#sss" },
  { label: "İletişim", href: "/#iletisim" },
  { label: "Bilet Al", href: "/#bilet-al", highlighted: true },
] as const satisfies ReadonlyArray<{
  label: string;
  href: string;
  highlighted?: boolean;
}>;

export function PublicHeaderMenu({ signedIn }: { signedIn: boolean }) {
  const menuItemClass =
    "inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-brand-ocean";
  const highlightedMenuItemClass =
    "antso-gradient-cta inline-flex items-center rounded-full px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-105";

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-4 xl:flex-nowrap">
      <div className="hidden min-w-0 flex-1 items-center justify-center gap-7 md:flex xl:justify-center">
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-6 rounded-full bg-white/72 px-6 py-3 shadow-[0_12px_32px_rgba(18,38,60,0.05)] ring-1 ring-white/90 backdrop-blur-xl">
          {MENU_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${
                ("highlighted" in item && item.highlighted)
                  ? highlightedMenuItemClass
                  : menuItemClass
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
        {signedIn ? (
          <>
            <Link
              href="/account/bookings"
              className="antso-gradient-cta rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
            >
              Hesabım
            </Link>
            <form action="/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-brand-ocean"
              >
                Çıkış
              </button>
            </form>
          </>
        ) : (
          <>
            <Link
              href="/auth/login"
              className="rounded-full border border-brand-ocean/20 bg-white px-5 py-2.5 text-sm font-semibold text-brand-ocean shadow-[0_10px_24px_rgba(18,38,60,0.04)] transition hover:border-brand-ocean/40 hover:bg-brand-mist/60"
            >
              Giriş Yap
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
