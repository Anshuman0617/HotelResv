"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";

type Result<T> = {
  key: string;
  path: string;
  data: T | null;
  error: Error | null;
};

/**
 * Loads `path` from the backend and reloads whenever it changes.
 *
 * Pass `null` to skip the request. While a new request is in flight the
 * previous data for the same path is kept, so a reload does not blank the page.
 */
export function useApiData<T>(path: string | null) {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const key = path === null ? null : `${version}:${path}`;

  useEffect(() => {
    if (key === null || path === null) return;
    let cancelled = false;
    apiFetch<T>(path).then(
      (data) => {
        if (!cancelled) setResult({ key, path, data, error: null });
      },
      (error: unknown) => {
        if (!cancelled) {
          setResult({
            key,
            path,
            data: null,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key, path]);

  const current = result && result.key === key ? result : null;
  const stale = result && result.path === path ? result : null;
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return {
    data: (current ?? stale)?.data ?? null,
    error: current?.error ?? null,
    loading: key !== null && current === null,
    reload,
  };
}

/** A message for an API failure that tells the manager what to do next. */
export function describeApiError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Your session has expired. Sign in again.";
    if (error.status === 403) return "You don't have permission to do this for this hotel.";
    return error.message;
  }
  if (error instanceof TypeError) {
    return "Couldn't reach the server. Check that the backend is running.";
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}
