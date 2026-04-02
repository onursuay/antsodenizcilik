"use client";

interface SeferData {
  id: number;
  sefer_tarih: string;
  gemi: string;
  ucret: number;
  formatted_price: string;
  secili_mi: boolean;
  trip_number?: string;
  full_date?: string;
}

interface SailingListProps {
  seferler: SeferData[];
  onSelect: (seferId: number) => void;
  onBack: () => void;
}

export function SailingList({ seferler, onSelect, onBack }: SailingListProps) {
  if (seferler.length === 0) {
    return (
      <div>
        <div className="mb-4 rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
          Secilen tarih ve guzergah icin sefer bulunamadi. Lutfen baska bir tarih deneyin.
        </div>
        <button
          onClick={onBack}
          className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
        >
          ← Geri Don
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">Mevcut Seferler</h3>

      {seferler.map((sefer) => (
        <div
          key={sefer.id}
          className="flex items-center justify-between rounded-lg border p-4"
        >
          <div className="space-y-1">
            <div className="text-sm font-medium">{sefer.sefer_tarih}</div>
            {sefer.full_date && (
              <div className="text-xs text-gray-500">{sefer.full_date}</div>
            )}
            <div className="text-xs text-gray-500">Gemi: {sefer.gemi}</div>
            {sefer.trip_number && (
              <div className="text-xs text-gray-400">Sefer No: {sefer.trip_number}</div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-base font-semibold text-blue-700">
              {sefer.formatted_price}
            </span>
            <button
              onClick={() => onSelect(sefer.id)}
              className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              Sec
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={onBack}
        className="mt-2 rounded border px-4 py-2 text-sm hover:bg-gray-50"
      >
        ← Geri Don
      </button>
    </div>
  );
}
