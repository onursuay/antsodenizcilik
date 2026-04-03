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
    href: "https://www.facebook.com/antsodenizcilik",
    icon: <FacebookIcon className="h-4 w-4" />,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/antsodenizcilik",
    icon: <InstagramIcon className="h-4 w-4" />,
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

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7.5 3h9A4.5 4.5 0 0 1 21 7.5v9A4.5 4.5 0 0 1 16.5 21h-9A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3Zm0 1.8A2.7 2.7 0 0 0 4.8 7.5v9a2.7 2.7 0 0 0 2.7 2.7h9a2.7 2.7 0 0 0 2.7-2.7v-9a2.7 2.7 0 0 0-2.7-2.7h-9Zm9.6 1.35a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.8A3.2 3.2 0 1 0 12 15.2 3.2 3.2 0 0 0 12 8.8Z" />
    </svg>
  );
}
