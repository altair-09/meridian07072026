import { useEffect, useRef } from "react";

/**
 * useServerEvents(callbacks)
 * Subscribes to /api/events SSE stream.
 * callbacks: { decision_log_changed, lessons_changed, state_changed } — each a function()
 * Reconnects automatically on error with 3s backoff.
 */
export function useServerEvents(callbacks) {
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  useEffect(() => {
    let es;
    let dead = false;
    let retryTimer;

    function connect() {
      if (dead) return;
      es = new EventSource("/api/events");

      es.addEventListener("decision_log_changed", () => cbRef.current?.decision_log_changed?.());
      es.addEventListener("lessons_changed",       () => cbRef.current?.lessons_changed?.());
      es.addEventListener("state_changed",         () => cbRef.current?.state_changed?.());
      es.addEventListener("chat_response",         (e) => cbRef.current?.chat_response?.(e));

      es.onerror = () => {
        es.close();
        if (!dead) retryTimer = setTimeout(connect, 3000);
      };
    }

    connect();
    return () => {
      dead = true;
      clearTimeout(retryTimer);
      es?.close();
    };
  }, []);
}
