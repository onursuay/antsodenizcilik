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
    "inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold text-white/82 transition hover:bg-white/[0.06] hover:text-white";
  const highlightedMenuItemClass =
    "inline-flex items-center rounded-full bg-[linear-gradient(180deg,#6cc7dd_0%,#56b4cd_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(94,188,213,0.26)] transition hover:brightness-105";

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-4 xl:flex-nowrap">
      <div className="flex min-w-0 flex-1 justify-center xl:justify-center">
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-1.5 rounded-full border border-white/[0.08] bg-[linear-gradient(180deg,rgba(30,44,61,0.96),rgba(20,32,48,0.96))] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_36px_rgba(0,0,0,0.18)] backdrop-blur-xl">
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

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2.5">
        {signedIn ? (
          <>
            <Link
              href="/account/bookings"
              className="rounded-full bg-[linear-gradient(180deg,#6cc7dd_0%,#56b4cd_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(94,188,213,0.24)] transition hover:brightness-105"
            >
              Hesabım
            </Link>
            <form action="/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-full border border-white/[0.18] px-4 py-2.5 text-sm font-semibold text-white/78 transition hover:border-white/[0.28] hover:text-white"
              >
                Çıkış
              </button>
            </form>
          </>
        ) : (
          <>
            <Link
              href="/auth/login"
              className="rounded-full border border-brand-sky/35 px-5 py-2.5 text-sm font-semibold text-[#a7deee] shadow-[0_14px_30px_rgba(0,0,0,0.12)] transition hover:border-brand-sky/65 hover:bg-brand-sky/10 hover:text-white"
            >
              Giriş Yap
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
