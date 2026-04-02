"use client";

import { useState, useEffect, useCallback } from "react";

interface UseApiResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
}

export function useApi<T>(url: string | null): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [trigger, setTrigger] = useState(0);

  const refetch = useCallback(() => setTrigger((t) => t + 1), []);

  useEffect(() => {
    if (!url) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(url)
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error ?? `HTTP ${res.status}`);
          setData(null);
        } else {
          setData(json as T);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Fetch failed");
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url, trigger]);

  return { data, error, loading, refetch };
}

interface UseMutationResult<TRes> {
  trigger: (body?: unknown) => Promise<TRes | null>;
  data: TRes | null;
  error: string | null;
  loading: boolean;
}

export function useMutation<TRes>(
  url: string,
  method: "POST" | "PATCH" | "DELETE" = "POST"
): UseMutationResult<TRes> {
  const [data, setData] = useState<TRes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const triggerFn = useCallback(
    async (body?: unknown): Promise<TRes | null> => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(url, {
          method,
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });

        const json = await res.json();

        if (!res.ok) {
          const msg = json.error ?? `HTTP ${res.status}`;
          setError(msg);
          setData(null);
          throw new Error(msg);
        }

        setData(json as TRes);
        return json as TRes;
      } catch (err) {
        if (!error) {
          const msg = err instanceof Error ? err.message : "Request failed";
          setError(msg);
        }
        setData(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [url, method, error]
  );

  return { trigger: triggerFn, data, error, loading };
}
