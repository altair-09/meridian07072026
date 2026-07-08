import { useState, useEffect, useCallback, useRef } from "react";

/**
 * useApi(fetchFn, deps?, intervalMs?)
 * Runs fetchFn on mount (and when deps change). Returns { data, loading, error, reload }.
 * Pass intervalMs > 0 to enable background polling.
 * Polling pauses with exponential backoff on consecutive errors (max 5 min),
 * and resumes normal cadence on next success.
 */
export function useApi(fetchFn, deps = [], intervalMs = 0) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const firstFetch = useRef(true);
  const errorCount = useRef(0);
  const timerRef   = useRef(null);

  const load = useCallback(async () => {
    if (firstFetch.current) setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
      errorCount.current = 0;
    } catch (e) {
      setError(e.message);
      errorCount.current += 1;
    } finally {
      if (firstFetch.current) { setLoading(false); firstFetch.current = false; }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Scheduling loop with backoff
  useEffect(() => {
    if (!intervalMs) { firstFetch.current = true; load(); return; }

    firstFetch.current = true;
    errorCount.current = 0;

    let cancelled = false;

    async function tick() {
      if (cancelled) return;
      await load();
      if (cancelled) return;
      // Backoff: 2^errors * base, capped at 5 min
      const backoff = errorCount.current > 0
        ? Math.min(intervalMs * Math.pow(2, errorCount.current - 1), 5 * 60_000)
        : intervalMs;
      timerRef.current = setTimeout(tick, backoff);
    }

    tick();
    return () => { cancelled = true; clearTimeout(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, intervalMs]);

  return { data, loading, error, reload: load };
}
