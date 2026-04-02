"use client";

import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";

interface OpsRow {
  issue_type: string;
  open_count: number;
  oldest_open_at: string;
  newest_open_at: string;
}

export default function OpsQueuePage() {
  const router = useRouter();
  const { data, loading, error } = useApi<{ summary: OpsRow[] }>(
    "/api/ops/queue"
  );

  if (loading) return <p className="text-sm text-gray-500">Yukleniyor...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  const summary = data?.summary ?? [];

  if (summary.length === 0) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold">Operasyon Kuyrugu</h1>
        <p className="text-sm text-gray-500">Acik kayit bulunamadi.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Operasyon Kuyrugu</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {summary.map((row) => (
          <button
            key={row.issue_type}
            onClick={() => router.push(`/admin/ops?type=${row.issue_type}`)}
            className="text-left"
          >
            <StatCard
              label={row.issue_type}
              value={row.open_count}
              subtitle={`En eski: ${new Date(row.oldest_open_at).toLocaleString("tr-TR")}`}
              className="hover:border-blue-300 transition-colors"
            />
          </button>
        ))}
      </div>

      {/* Inline list if type is selected via query param */}
      <InlineList />
    </div>
  );
}

function InlineList() {
  // Read type from URL if present
  const type = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("type")
    : null;

  const { data, loading } = useApi<{ entries: Array<{ review_id: string; issue_type: string; description: string; created_at: string }> }>(
    type ? `/api/ops/queue/${type}` : null
  );

  const router = useRouter();

  if (!type || loading || !data) return null;

  return (
    <div className="mt-6">
      <h2 className="mb-2 text-lg font-semibold flex items-center gap-2">
        <StatusBadge status={type} /> Kayitlar
      </h2>
      <div className="space-y-2">
        {data.entries.map((e) => (
          <button
            key={e.review_id}
            onClick={() => router.push(`/admin/ops/${e.review_id}`)}
            className="w-full rounded border p-3 text-left text-sm hover:bg-gray-50"
          >
            <p className="font-medium">{e.description}</p>
            <p className="mt-1 text-xs text-gray-400">
              {new Date(e.created_at).toLocaleString("tr-TR")} · {e.review_id.slice(0, 8)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
