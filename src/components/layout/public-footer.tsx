import Link from "next/link";
import { BrandLogo } from "@/components/ui/brand-logo";

const QUICK_LINKS = [
  { label: "Ana Sayfa", href: "/#ana-sayfa" },
  { label: "Sefer Takvimi", href: "/#sefer-takvimi" },
  { label: "Kurumsal", href: "/#kurumsal" },
  { label: "Sıkca Sorulan Sorular", href: "/#sss" },
  { label: "İletişim", href: "/#iletisim" },
] as const;

const BOOKING_LINKS = [
  { label: "Bilet Al", href: "/#bilet-al" },
  { label: "Rezervasyonlarım", href: "/account/bookings" },
  { label: "Giriş Yap", href: "/auth/login" },
  { label: "Hesap Oluştur", href: "/auth/register" },
  { label: "Akgünler Seferleri", href: "https://www.akgunlerbilet.com/" },
] as const;

const SOCIAL_LINKS = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/antsodenizcilik/",
    icon: <FacebookIcon className="h-4 w-4" />,
  },
  {
    label: "X",
    href: "https://twitter.com/antsodeniz",
    icon: <XIcon className="h-4 w-4" />,
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@antsodenizcilik",
    icon: <YouTubeIcon className="h-4 w-4" />,
  },
] as const;

export function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-white/8 bg-[linear-gradient(180deg,#12263c_0%,#0f2032_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:py-14">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr_0.9fr_0.95fr]">
          <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="rounded-[18px] bg-[linear-gradient(180deg,#ffffff_0%,#f3f8fa_100%)] px-3 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.12)] inline-flex">
              <BrandLogo className="w-[92px] sm:w-[108px]" imageClassName="h-auto w-full object-contain" />
            </div>

            <p className="mt-5 max-w-sm text-sm leading-7 text-white/68">
              Anamur ile Girne arasında hızlı, düzenli ve güvenli feribot rezervasyonu için
              tasarlanan kurumsal biletleme deneyimi.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {SOCIAL_LINKS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={item.label}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] text-white/82 transition hover:border-brand-sky/50 hover:bg-brand-sky/12 hover:text-white"
                >
                  {item.icon}
                </a>
              ))}
            </div>
          </section>

          <FooterColumn title="Hızlı Bağlantılar">
            {QUICK_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-white/68 transition hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </FooterColumn>

          <FooterColumn title="Bilet İşlemleri">
            {BOOKING_LINKS.map((item) =>
              item.href.startsWith("http") ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-white/68 transition hover:text-white"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-white/68 transition hover:text-white"
                >
                  {item.label}
                </Link>
              )
            )}
          </FooterColumn>

          <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <p className="text-xs uppercase tracking-[0.24em] text-brand-seafoam">İletişim</p>
            <div className="mt-5 space-y-4">
              <ContactItem label="E-posta" value="info@antsodenizcilik.com" href="mailto:info@antsodenizcilik.com" />
              <ContactItem label="Telefon" value="+90 530 257 48 55" href="tel:+905302574855" />
            </div>

            <div className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-white/44">Çalışma Saatleri</p>
              <p className="mt-3 text-sm font-semibold text-white">Her gün 07:00 – 22:00</p>
              <p className="mt-1 text-sm text-white/62">Pazartesi - Pazar ve özel günler dahil</p>
            </div>
          </section>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-white/8 pt-6 text-sm text-white/52 md:flex-row md:items-center md:justify-between">
          <p>Feribot taşımacılığının güvenli adresi.</p>
          <p>Tüm Hakları Saklıdır © {year}, ANTSO Denizcilik</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <p className="text-xs uppercase tracking-[0.24em] text-brand-seafoam">{title}</p>
      <div className="mt-5 flex flex-col gap-3">{children}</div>
    </section>
  );
}

function ContactItem({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.22em] text-white/44">{label}</p>
      <a href={href} className="mt-1 block text-sm font-semibold text-white transition hover:text-brand-seafoam">
        {value}
      </a>
    </div>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5 21v-7h2.3l.5-3h-2.8V9.3c0-.9.4-1.8 1.9-1.8H16V5a8.5 8.5 0 0 0-1.6-.1c-3.3 0-4.9 2-4.9 4.8V11H7v3h2.5v7h4Z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.9 3H21l-4.6 5.2L21.8 21h-4.9l-3.8-5-4.4 5H6.6l4.9-5.6L2.4 3h5l3.4 4.6L14.7 3Zm-1.7 15.2h1.4L6.6 5.7H5.1l12.1 12.5Z" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.6 8.2a2.9 2.9 0 0 0-2-2.1C17.8 5.6 12 5.6 12 5.6s-5.8 0-7.6.5a2.9 2.9 0 0 0-2 2.1C2 10 2 12 2 12s0 2 .4 3.8a2.9 2.9 0 0 0 2 2.1c1.8.5 7.6.5 7.6.5s5.8 0 7.6-.5a2.9 2.9 0 0 0 2-2.1c.4-1.8.4-3.8.4-3.8s0-2-.4-3.8ZM10 15.1V8.9l5.2 3.1-5.2 3.1Z" />
    </svg>
  );
}
