// Shared API client — all fetch calls go through here so errors are handled
// consistently and there's one place to add auth headers when needed.

export async function apiFetch(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = (await res.json()).error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json();
}

// Convenience wrappers
export const api = {
  system:      ()        => apiFetch("/api/system"),
  positions:   ()        => apiFetch("/api/positions"),
  wallet:      ()        => apiFetch("/api/wallet"),
  decisions:   (limit)   => apiFetch(`/api/decisions?limit=${limit ?? 30}`),
  lessons:     (limit)   => apiFetch(`/api/lessons?limit=${limit ?? 50}`),
  lessonsPending: ()     => apiFetch("/api/lessons/pending"),
  performance: ()        => apiFetch("/api/performance"),
  pools:       (p = {})  => apiFetch(`/api/pools?category=${p.category ?? "trending"}&timeframe=${p.timeframe ?? "5m"}&limit=${p.limit ?? 30}`),
  sim:         ()        => apiFetch("/api/sim"),
  config:      ()        => apiFetch("/api/config"),
  tokenUsage:  (hours)   => apiFetch(`/api/token-usage?hours=${hours ?? 24}`),
};
