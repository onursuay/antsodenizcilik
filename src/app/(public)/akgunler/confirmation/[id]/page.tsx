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

async function getTickets(sepetId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/akgunler/tickets?s_id=${sepetId}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function AkgunlerConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getTickets(id);
  const biletler: Bilet[] = data?.biletler ?? [];

  if (!data || biletler.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <svg className="h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="mb-2 text-xl font-bold text-slate-900">Bilet Bulunamadı</h1>
        <p className="mb-8 text-sm text-slate-500">
          Ödemeniz tamamlanmış olabilir. Lütfen e-postanızı kontrol edin veya hesabınıza giriş
          yapın.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
        >
          Ana Sayfaya Dön
        </Link>
      </div>
    );
  }

  const firstBilet = biletler[0];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        {/* Success header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Ödeme Başarılı</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Biletleriniz oluşturuldu. Aşağıda tüm bilet detaylarınızı görebilirsiniz.
          </p>
        </div>

        {/* Route summary */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Kalkış</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{firstBilet.departure_port}</p>
            </div>
            <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Varış</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{firstBilet.arrival_port}</p>
            </div>
          </div>
          <div className="mt-3 flex justify-center gap-4 border-t border-slate-100 pt-3">
            <span className="text-sm text-slate-600">
              <span className="font-medium">{firstBilet.sefer_tarih}</span>
            </span>
            {firstBilet.trip_number && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-sm text-slate-500">Sefer: {firstBilet.trip_number}</span>
              </>
            )}
          </div>
        </div>

        {/* Tickets */}
        <div className="space-y-4">
          {biletler.map((bilet) => (
            <div
              key={bilet.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              {/* Ticket header */}
              <div className="flex items-center justify-between border-b border-dashed border-slate-200 bg-slate-50 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600">
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{bilet.passenger}</p>
                    <p className="text-xs text-slate-400">{bilet.passenger_type_title}</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    bilet.bilet_durumu === "Aktif"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {bilet.bilet_durumu}
                </span>
              </div>

              {/* Ticket body */}
              <div className="px-6 py-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Kalkış
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">{bilet.departure_port}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Varış
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">{bilet.arrival_port}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Tarih
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">{bilet.sefer_tarih}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Sefer No
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">{bilet.trip_number}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Bilet No
                    </p>
                    <p className="mt-0.5 font-mono text-sm font-bold tracking-wider text-slate-900">
                      {bilet.ticket_serial_number}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Ücret
                    </p>
                    <p className="mt-0.5 text-base font-bold text-blue-700">
                      {(bilet.price_100 / 100).toFixed(2)} TL
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/account/bookings"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Rezervasyonlarım
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
          >
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    </div>
  );
}
