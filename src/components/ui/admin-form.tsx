"use client";

import type { ReactNode, FormEvent } from "react";
import { useState } from "react";

interface AdminFormProps {
  onSubmit: () => Promise<void>;
  children: ReactNode;
  submitLabel?: string;
  loading?: boolean;
  error?: string | null;
}

export function AdminForm({
  onSubmit,
  children,
  submitLabel = "Kaydet",
  loading: externalLoading,
  error: externalError,
}: AdminFormProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  const loading = externalLoading ?? internalLoading;
  const error = externalError ?? internalError;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setInternalError(null);
    setInternalLoading(true);
    try {
      await onSubmit();
    } catch (err) {
      setInternalError(
        err instanceof Error ? err.message : "Bir hata olustu"
      );
    } finally {
      setInternalLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
      {children}
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Kaydediliyor..." : submitLabel}
      </button>
    </form>
  );
}
