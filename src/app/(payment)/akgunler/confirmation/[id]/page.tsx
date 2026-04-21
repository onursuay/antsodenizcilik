import Link from "next/link";

interface Bilet {
  id: number;
  ticket_serial_number: string;
  sefer_id: number;
  passenger_type_title: string;
  para_birimi_usd_mi: boolean;
  trip_number: string;
  passenger: string;
  yolcu_tipi: string;
  departure_port: string;
  arrival_port: string;
  sefer_tarih: string;
  price_100: number;
  bilet_durumu: string;
}

async function getTickets(sepetId: string, cartToken: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = `${baseUrl}/api/akgunler/tickets?s_id=${sepetId}&cart_token=${encodeURIComponent(cartToken)}`;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

function formatPrice(price100: number) {
  return (price100 / 100).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function AkgunlerConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ct?: string; hata?: string }>;
}) {
  const { id } = await params;
  const { ct = "", hata } = await searchParams;

  // Explicit error redirect from payment-callback
  if (id === "error" || hata) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="rounded-[36px] border border-red-200 bg-white p-10 text-center shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18 18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="mt-6 text-2xl font-semibold text-slate-900">Ödeme tamamlanamadı</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {hata ?? "3D Secure doğrulaması başarısız oldu veya ödeme iptal edildi."}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full bg-brand-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0c1f34]"
            >
              Tekrar dene
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const data = await getTickets(id, ct);
  const biletler: Bilet[] = data?.biletler ?? [];

  if (!data || biletler.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="rounded-[36px] border border-slate-200 bg-white p-10 text-center shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M12 9v2m0 4h.01M4.93 19h14.14c1.38 0 2.24-1.5 1.55-2.7L13.55 4.7a1.8 1.8 0 0 0-3.1 0L3.38 16.3c-.69 1.2.17 2.7 1.55 2.7Z"
              />
            </svg>
          </div>
          <h1 className="mt-6 text-3xl font-semibold text-slate-900">Bilet detayları henüz görünmüyor</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Ödemeniz tamamlanmış olabilir. Lütfen birkaç dakika sonra tekrar kontrol edin veya
            hesabınızdaki rezervasyonlar alanından son durumu görüntüleyin.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/account/bookings"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Rezervasyonlarıma git
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full bg-brand-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0c1f34]"
            >
              Ana sayfaya dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const firstBilet = biletler[0];
  const totalAmount = biletler.reduce((sum, bilet) => sum + bilet.price_100, 0);

  return (
    <div className="pb-16">
      <section className="relative overflow-hidden bg-brand-ink text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(60,146,183,0.24),transparent_30%),radial-gradient(circle_at_right,rgba(209,162,77,0.14),transparent_24%)]" />
        <div className="relative mx-auto max-w-[86rem] px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs uppercase tracking-[0.24em] text-brand-seafoam">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Ödeme başarılı
              </div>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Biletleriniz hazır
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/70">
                Rezervasyonunuz başarıyla oluşturuldu. Aşağıda yolcu bazında bilet numaralarınızı ve
                sefer bilgilerinizi görüntüleyebilirsiniz.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <HeroStat title="Rota" value={`${firstBilet.departure_port} → ${firstBilet.arrival_port}`} />
                <HeroStat title="Toplam bilet" value={`${biletler.length}`} />
                <HeroStat title="Toplam tutar" value={`${formatPrice(totalAmount)} TL`} />
              </div>
            </div>
            <div className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_30px_90px_rgba(16,37,61,0.24)]">
              <p className="text-xs uppercase tracking-[0.24em] text-brand-seafoam">Sefer özeti</p>
              <div className="mt-5 space-y-3">
                <SummaryRow label="Kalkış" value={firstBilet.departure_port} />
                <SummaryRow label="Varış" value={firstBilet.arrival_port} />
                <SummaryRow label="Tarih / saat" value={firstBilet.sefer_tarih} />
                {firstBilet.trip_number && (
                  <SummaryRow label="Sefer no" value={firstBilet.trip_number} />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[86rem] -mt-8 px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <div className="space-y-6">
            {biletler.map((bilet, index) => (
              <article
                key={bilet.id}
                className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]"
              >
                <div className="border-b border-dashed border-slate-200 bg-slate-50 px-6 py-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-ink text-sm font-semibold text-white">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-slate-900">{bilet.passenger}</p>
                        <p className="mt-1 text-sm text-slate-500">{bilet.passenger_type_title}</p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        bilet.bilet_durumu === "Aktif"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {bilet.bilet_durumu}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InfoBox label="Kalkış" value={bilet.departure_port} />
                    <InfoBox label="Varış" value={bilet.arrival_port} />
                    <InfoBox label="Tarih / saat" value={bilet.sefer_tarih} />
                    <InfoBox label="Sefer no" value={bilet.trip_number || "-"} />
                  </div>
                  <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto]">
                    <div className="rounded-[24px] bg-slate-50 px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Bilet numarası</p>
                      <p className="mt-2 break-all font-mono text-sm font-semibold tracking-[0.18em] text-slate-900">
                        {bilet.ticket_serial_number}
                      </p>
                    </div>
                    <div className="rounded-[24px] bg-brand-mist px-5 py-4 text-right">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-brand-ocean/70">Ücret</p>
                      <p className="mt-2 text-xl font-semibold text-brand-ink">{formatPrice(bilet.price_100)} TL</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="space-y-6">
            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <p className="text-xs uppercase tracking-[0.24em] text-brand-ocean/60">Sonraki adımlar</p>
              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <ChecklistItem text="Bilet numaralarınızı ve yolcu isimlerini kontrol edin." />
                <ChecklistItem text="Seyahat günü için kimlik veya pasaportunuzu yanınıza alın." />
                <ChecklistItem text="Detaylara daha sonra erişmek için rezervasyonlarım ekranını kullanın." />
              </div>
            </div>
            <div className="rounded-[32px] bg-brand-ink p-6 text-white shadow-[0_30px_90px_rgba(16,37,61,0.24)]">
              <p className="text-xs uppercase tracking-[0.24em] text-brand-seafoam">Rezervasyon referansı</p>
              <p className="mt-3 break-all text-lg font-semibold">{id}</p>
              <p className="mt-3 text-sm leading-7 text-white/70">
                Bu referans ile rezervasyon ekranınızdan veya destek görüşmelerinde işleminizi daha hızlı
                takip edebilirsiniz.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                href="/account/bookings"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Rezervasyonlarım
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full bg-brand-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0c1f34]"
              >
                Yeni bilet ara
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function HeroStat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.05] px-5 py-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-white/42">{title}</p>
      <p className="mt-2 text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.05] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.2em] text-white/42">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] bg-slate-50 px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function ChecklistItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="m5 13 4 4L19 7" />
        </svg>
      </span>
      <span>{text}</span>
    </div>
  );
}
