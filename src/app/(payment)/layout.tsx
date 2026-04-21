import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  robots: "noindex, nofollow",
  title: "Güvenli Ödeme | Antso Denizcilik",
};

export default function PaymentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200/60 bg-white px-6 py-4 shadow-[0_2px_8px_rgba(18,38,60,0.04)]">
        <div className="mx-auto flex max-w-[86rem] items-center justify-between">
          <Link href="/" aria-label="Ana sayfaya dön">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/antso-logo.png" alt="Antso Denizcilik" className="h-8 w-auto" />
          </Link>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-ocean/60">
            Güvenli Ödeme
          </span>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
