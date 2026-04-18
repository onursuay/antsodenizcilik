import type { Metadata } from "next";
import { getFerrySchedule } from "@/lib/akgunler/schedule";

export const metadata: Metadata = {
  title: "Sefer Takvimi | Antso Denizcilik",
  description: "Anamur-Girne feribot sefer takvimi. Güncel sefer saatleri ve gemi bilgileri.",
};

export const revalidate = 3600;

export default async function SeferTakvimiPage() {
  let payload;
  try {
    payload = await getFerrySchedule();
  } catch {
    payload = null;
  }

  return (
    <div className="antso-page-space py-16">
      <div className="mx-auto max-w-4xl px-4">
        <h1 className="mb-2 text-3xl font-bold text-slate-800">Sefer Takvimi</h1>
        <p className="mb-8 text-slate-500">Anamur – Girne hattı güncel sefer programı</p>

        {!payload || payload.days.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-slate-500 shadow-sm">
            <p className="font-medium">Sefer takvimi şu anda alınamıyor.</p>
            <p className="mt-1 text-sm">Lütfen daha sonra tekrar deneyin.</p>
          </div>
        ) : (
          <>
            {payload.routes.length > 1 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {payload.routes.map((route) => (
                  <a
                    key={route.mod}
                    href={`/sefer-takvimi?rota=${route.slug}`}
                    className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 transition hover:border-brand-ocean/40 hover:text-brand-ocean"
                  >
                    {route.title}
                  </a>
                ))}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {payload.days.map((day) => (
                <div
                  key={day.date}
                  className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-bold text-slate-800">{day.date}</span>
                    <span className="rounded-full bg-blue-50 px-3 py-0.5 text-xs font-medium text-brand-ocean">
                      {day.weekday}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {day.trips.map((trip, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                        <span className="mt-0.5 rounded-lg bg-white px-2 py-1 text-sm font-bold text-brand-ocean shadow-sm ring-1 ring-slate-100">
                          {trip.time}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-500">{trip.direction}</p>
                          <p className="truncate text-sm text-slate-700">{trip.vessel}</p>
                        </div>
                      </div>
                    ))}
                    {day.trips.length === 0 && (
                      <p className="text-sm text-slate-400">Sefer yok</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-6 text-center text-xs text-slate-400">
              Kaynak:{" "}
              <a
                href={payload.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                akgunlerbilet.com
              </a>
              . Sefer saatleri değişebilir, güncel bilgi için bizi arayın.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
