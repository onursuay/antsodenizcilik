import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "İletişim | Antso Denizcilik",
  description: "Antso Denizcilik iletişim bilgileri. Anamur-Girne feribot bileti için bize ulaşın.",
};

export default function IletisimPage() {
  return (
    <div className="antso-page-space py-16">
      <div className="mx-auto max-w-3xl px-4">
        <h1 className="mb-2 text-3xl font-bold text-slate-800">İletişim</h1>
        <p className="mb-10 text-slate-500">Sorularınız için bize ulaşabilirsiniz.</p>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
              <svg className="h-5 w-5 text-brand-ocean" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="mb-1 font-semibold text-slate-700">E-posta</h2>
            <a href="mailto:info@antsodenizcilik.com" className="text-brand-ocean hover:underline">
              info@antsodenizcilik.com
            </a>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
              <svg className="h-5 w-5 text-brand-ocean" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <h2 className="mb-1 font-semibold text-slate-700">Telefon</h2>
            <a href="tel:+905302574855" className="text-brand-ocean hover:underline">
              +90 530 257 48 55
            </a>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:col-span-2">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
              <svg className="h-5 w-5 text-brand-ocean" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="mb-1 font-semibold text-slate-700">Adres</h2>
            <p className="text-slate-600">İskele Mahallesi, Anamur / Mersin</p>
          </div>
        </div>
      </div>
    </div>
  );
}
