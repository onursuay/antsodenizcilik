"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";

const KURUMSAL_ITEMS = [
  { label: "Gizlilik Politikası", href: "/kurumsal/gizlilik-politikasi" },
  { label: "Aydınlatma Metni", href: "/kurumsal/aydinlatma-metni" },
  { label: "Çerez Politikası", href: "/kurumsal/cerez-politikasi" },
];

export function PublicHeaderMenu({ signedIn }: { signedIn: boolean }) {
  const [kurumsalOpen, setKurumsalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setKurumsalOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const menuItemClass =
    "inline-flex items-center text-[15.5px] font-medium text-slate-600 transition hover:text-brand-ocean";
  const highlightedMenuItemClass =
    "antso-gradient-cta inline-flex items-center rounded-full px-4 py-2.5 text-[15.5px] font-semibold text-white transition hover:brightness-105";

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-4 xl:flex-nowrap">
      <div className="hidden min-w-0 flex-1 items-center justify-center gap-7 md:flex xl:justify-center">
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-6 rounded-full bg-white/72 px-6 py-3 shadow-[0_12px_32px_rgba(18,38,60,0.05)] ring-1 ring-white/90 backdrop-blur-xl">
          <Link href="/" className={menuItemClass}>
            Ana Sayfa
          </Link>

          <Link href="/sefer-takvimi" className={menuItemClass}>
            Sefer Takvimi
          </Link>

          {/* Kurumsal dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setKurumsalOpen((v) => !v)}
              className={`${menuItemClass} gap-1`}
            >
              Kurumsal
              <svg
                className={`h-4 w-4 transition-transform ${kurumsalOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {kurumsalOpen && (
              <div className="absolute left-1/2 top-full z-50 mt-3 w-52 -translate-x-1/2 rounded-2xl border border-slate-100 bg-white py-2 shadow-xl ring-1 ring-black/5">
                {KURUMSAL_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setKurumsalOpen(false)}
                    className="block px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-brand-ocean"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href="/sss" className={menuItemClass}>
            S.S.S.
          </Link>

          <Link href="/iletisim" className={menuItemClass}>
            İletişim
          </Link>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
        <Link href="/#bilet-al" className={highlightedMenuItemClass}>
          Bilet Al
        </Link>
        {signedIn ? (
          <>
            <Link
              href="/account/bookings"
              className="antso-gradient-cta rounded-full px-5 py-2.5 text-[15.5px] font-semibold text-white transition hover:brightness-105"
            >
              Hesabım
            </Link>
            <form action="/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-[15.5px] font-medium text-slate-600 transition hover:border-slate-300 hover:text-brand-ocean"
              >
                Çıkış
              </button>
            </form>
          </>
        ) : (
          <Link
            href="/auth/login"
            className="rounded-full border border-brand-ocean/20 bg-white px-5 py-2.5 text-[15.5px] font-semibold text-brand-ocean shadow-[0_10px_24px_rgba(18,38,60,0.04)] transition hover:border-brand-ocean/40 hover:bg-brand-mist/60"
          >
            Giriş Yap
          </Link>
        )}
      </div>
    </div>
  );
}
