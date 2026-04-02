import Link from "next/link";

interface Bilet {
  id: number;
  ticket_serial_number: string;
  passenger: string;
  passenger_type_title: string;
  departure_port: string;
  arrival_port: string;
  sefer_tarih: string;
  trip_number: string;
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

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getTickets(id);
  const biletler: Bilet[] = data?.biletler ?? [];

  if (!data || biletler.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 text-center">
        <div className="mb-4 text-4xl">⚠️</div>
        <h1 className="mb-2 text-xl font-semibold">Bilet Bulunamadi</h1>
        <p className="mb-6 text-sm text-gray-500">
          Odeme isleminiz tamamlanmis olabilir. Lutfen e-postanizi kontrol edin.
        </p>
        <Link
          href="/"
          className="rounded bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Ana Sayfaya Don
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 rounded-lg bg-green-50 px-5 py-4 text-center">
        <div className="mb-2 text-3xl">✓</div>
        <h1 className="text-lg font-semibold text-green-800">Odeme Basarili!</h1>
        <p className="text-sm text-green-600">Biletleriniz asagida goruntulenmektedir.</p>
      </div>

      <div className="space-y-4">
        {biletler.map((bilet) => (
          <div key={bilet.id} className="rounded-lg border p-5">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <div className="text-base font-semibold">{bilet.passenger}</div>
                <div className="text-xs text-gray-500">{bilet.passenger_type_title}</div>
              </div>
              <span
                className={`rounded px-2 py-1 text-xs font-medium ${
                  bilet.bilet_durumu === "Aktif"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {bilet.bilet_durumu}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-gray-400">Kalkis</span>
                <div className="font-medium">{bilet.departure_port}</div>
              </div>
              <div>
                <span className="text-xs text-gray-400">Varis</span>
                <div className="font-medium">{bilet.arrival_port}</div>
              </div>
              <div>
                <span className="text-xs text-gray-400">Tarih</span>
                <div className="font-medium">{bilet.sefer_tarih}</div>
              </div>
              <div>
                <span className="text-xs text-gray-400">Sefer No</span>
                <div className="font-medium">{bilet.trip_number}</div>
              </div>
            </div>

            <div className="mt-3 border-t pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-400">Bilet No</span>
                  <div className="font-mono text-sm font-semibold tracking-wider">
                    {bilet.ticket_serial_number}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400">Ucret</span>
                  <div className="font-semibold text-blue-700">
                    {(bilet.price_100 / 100).toFixed(2)} TL
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/"
          className="rounded border px-5 py-2.5 text-sm hover:bg-gray-50"
        >
          Ana Sayfaya Don
        </Link>
      </div>
    </div>
  );
}
