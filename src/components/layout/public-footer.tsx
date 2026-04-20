import Link from "next/link";
import Image from "next/image";

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
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/antso-denizcilik-a61704301/",
    icon: <LinkedInIcon className="h-4 w-4" />,
  },
  {
    label: "YouTube",
    href: "http://youtube.com/channel/UCwNH07NFAMxKkPWWyJ78fYA",
    icon: <YouTubeIcon className="h-4 w-4" />,
  },
] as const;

export function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="antso-footer-shell border-t border-slate-950/10 bg-[linear-gradient(180deg,#1e2936_0%,#131c27_100%)] text-white">
      <div className="antso-footer-inner">
        <div className="grid antso-box-gap border-b border-white/8 pb-8 lg:grid-cols-[1.2fr_0.9fr_0.95fr_1fr]">
          <section className="max-w-sm">
            <Image
              src="/antso-footer-logo.png"
              alt="Antso Denizcilik"
              width={500}
              height={256}
              className="h-auto w-[160px] sm:w-[190px]"
            />

            <div className="mt-6 flex flex-wrap antso-box-gap">
              {SOCIAL_LINKS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={item.label}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] text-white/82 transition hover:border-brand-sky/40 hover:bg-brand-sky/10 hover:text-white"
                >
                  {item.icon}
                </a>
              ))}
            </div>

            <p className="mt-6 text-sm text-white/48">Feribot taşımacılığının güvenli adresi.</p>
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

          <section>
            <p className="text-xs uppercase tracking-[0.24em] text-brand-seafoam">İletişim</p>
            <div className="mt-5 antso-box-stack">
              <ContactItem label="E-posta" value="info@antsodenizcilik.com" href="mailto:info@antsodenizcilik.com" />
              <ContactItem label="Telefon" value="+90 530 257 48 55" href="tel:+905302574855" />
            </div>

            <div className="mt-6">
              <p className="text-xs uppercase tracking-[0.22em] text-white/44">Çalışma Saatleri</p>
              <p className="mt-3 text-sm text-white">Her gün 07:00 – 22:00</p>
              <p className="mt-1 text-sm text-white/62">Pazartesi - Pazar ve özel günler dahil</p>
            </div>
          </section>
        </div>

        <p className="mt-6 text-center text-sm text-white/48">
          Tüm Hakları Saklıdır © {year}, ANTSO Denizcilik
        </p>
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
    <section>
      <p className="text-xs uppercase tracking-[0.24em] text-brand-seafoam">{title}</p>
      <div className="mt-5 flex flex-col antso-box-gap">{children}</div>
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
      <a href={href} className="mt-1 block text-sm text-white transition hover:text-brand-seafoam">
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

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3A2.03 2.03 0 0 0 3.2 5.03c0 1.12.9 2.03 2.01 2.03h.03a2.03 2.03 0 1 0 0-4.06ZM20.8 12.63c0-3.45-1.84-5.05-4.3-5.05-1.98 0-2.86 1.1-3.35 1.86V8.5H9.77c.04.63 0 11.5 0 11.5h3.38v-6.42c0-.34.03-.68.13-.92.27-.68.9-1.39 1.95-1.39 1.38 0 1.93 1.05 1.93 2.6V20h3.39v-7.37Z" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.8 8.2a2.9 2.9 0 0 0-2.04-2.05C17.95 5.7 12 5.7 12 5.7s-5.95 0-7.76.45A2.9 2.9 0 0 0 2.2 8.2 30.5 30.5 0 0 0 1.75 12c0 1.28.15 2.55.45 3.8a2.9 2.9 0 0 0 2.04 2.05c1.81.45 7.76.45 7.76.45s5.95 0 7.76-.45a2.9 2.9 0 0 0 2.04-2.05c.3-1.25.45-2.52.45-3.8s-.15-2.55-.45-3.8ZM10 15.22V8.78L15.5 12 10 15.22Z" />
    </svg>
  );
}
