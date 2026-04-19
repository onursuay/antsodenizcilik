"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

const KURUMSAL_ITEMS = [
  { label: "Gizlilik Politikası", href: "/kurumsal/gizlilik-politikasi" },
  { label: "Aydınlatma Metni", href: "/kurumsal/aydinlatma-metni" },
  { label: "Çerez Politikası", href: "/kurumsal/cerez-politikasi" },
];

const NAV_LINKS = [
  { label: "Ana Sayfa", href: "/" },
  { label: "Sefer Takvimi", href: "/sefer-takvimi" },
  { label: "S.S.S.", href: "/sss" },
  { label: "İletişim", href: "/iletisim" },
];

export function PublicHeaderMenu({ signedIn }: { signedIn: boolean }) {
  const [kurumsalOpen, setKurumsalOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setKurumsalOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setKurumsalOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const menuItemClass =
    "inline-flex items-center text-[15.5px] font-medium text-slate-600 transition hover:text-brand-ocean";
  const highlightedMenuItemClass =
    "antso-gradient-cta inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[15.5px] font-semibold text-white transition hover:brightness-105";

  const ticketIcon = (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 000-4V8z" />
      <path d="M9 6v12" strokeDasharray="2 2" />
    </svg>
  );

  const accountIcon = (
    <svg className="h-[16px] w-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );

  return (
    <>
      {/* Desktop menu */}
      <div className="hidden min-w-0 flex-1 items-center justify-center gap-4 lg:flex">
        <div className="flex min-w-0 items-center gap-8 rounded-full bg-white/72 px-8 py-3 shadow-[0_12px_32px_rgba(18,38,60,0.05)] ring-1 ring-white/90 backdrop-blur-xl xl:gap-10 xl:px-10">
          <Link href="/" className={menuItemClass}>
            Ana Sayfa
          </Link>

          <Link href="/sefer-takvimi" className={menuItemClass}>
            Sefer Takvimi
          </Link>

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

      {/* Desktop right actions */}
      <div className="hidden shrink-0 items-center gap-3 lg:flex">
        <Link href="/#bilet-al" className={highlightedMenuItemClass}>
          {ticketIcon}
          Bilet Al
        </Link>
        {signedIn ? (
          <>
            <Link
              href="/account/bookings"
              className="antso-gradient-cta inline-flex items-center gap-1.5 rounded-full px-3.5 py-2.5 text-[15.5px] font-semibold text-white transition hover:brightness-105"
            >
              {accountIcon}
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

      {/* Mobile right-side actions */}
      <div className="flex items-center gap-2 lg:hidden">
        <Link
          href="/#bilet-al"
          onClick={() => setMobileOpen(false)}
          className="antso-gradient-cta inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
        >
          {ticketIcon}
          Bilet Al
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Menüyü aç"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/20"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile overlay menu (portaled to body so backdrop-blur on header
          doesn't trap the fixed drawer inside an ancestor) */}
      {mounted && createPortal(
      <div
        className={`fixed inset-0 z-[100] lg:hidden ${mobileOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!mobileOpen}
      >
        <div
          className={`absolute inset-0 bg-[#0b1e2e]/70 backdrop-blur-sm transition-opacity duration-300 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={`absolute right-0 top-0 flex h-full w-[86%] max-w-sm flex-col overflow-y-auto rounded-l-[28px] bg-white shadow-[0_0_60px_rgba(4,12,25,0.45)] transition-transform duration-300 ease-out ${
            mobileOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <span className="font-headline text-lg font-bold tracking-tight text-[#0f2d4c]">
                Menü
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Menüyü kapat"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 space-y-1 p-4">
              {NAV_LINKS.slice(0, 2).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-xl px-4 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-brand-ocean"
                >
                  {link.label}
                </Link>
              ))}

              <div className="rounded-xl px-4 py-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Kurumsal
                </p>
                <div className="space-y-1">
                  {KURUMSAL_ITEMS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-lg px-2 py-2 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-brand-ocean"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              {NAV_LINKS.slice(2).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-xl px-4 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-brand-ocean"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="space-y-2 border-t border-slate-100 p-4">
              {signedIn ? (
                <>
                  <Link
                    href="/account/bookings"
                    onClick={() => setMobileOpen(false)}
                    className="antso-gradient-cta block rounded-full px-5 py-3 text-center text-sm font-semibold text-white"
                  >
                    Hesabım
                  </Link>
                  <form action="/auth/logout" method="post">
                    <button
                      type="submit"
                      className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600"
                    >
                      Çıkış
                    </button>
                  </form>
                </>
              ) : (
                <Link
                  href="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-full border border-brand-ocean/20 bg-white px-5 py-3 text-center text-sm font-semibold text-brand-ocean"
                >
                  Giriş Yap
                </Link>
              )}
            </div>
        </div>
      </div>,
      document.body
      )}
    </>
  );
}
