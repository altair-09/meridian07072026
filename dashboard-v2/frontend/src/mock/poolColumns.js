// Column catalogue for the Screener table's "Columns" customizer — mirrors
// Meteora's own column picker. Each entry states whether the field is
// actually available from tools/screening.js's condensePool() (verified by
// reading the function directly, not assumed) — unavailable ones are shown
// disabled with a reason, never silently faked.
//
// `compute(row)` reads from the row shape produced by mockData.poolBrowser,
// which mirrors condensePool()'s real field names.

export const COLUMN_DEFS = [
  { key: "volume", label: "Volume", available: true, default: true, compute: (r) => money(r.volume_window) },
  { key: "fees", label: "Fees", available: true, default: true, compute: (r) => money(r.fee_window) },
  { key: "priceTrend", label: "Price Trend", available: true, default: true, sparkline: true },
  { key: "tokenAge", label: "Token Age", available: true, default: true, compute: (r) => r.token_age_label },
  { key: "poolAge", label: "Pool Age", available: false, reason: "condensePool() tidak punya field umur pool, cuma umur token (token_age_hours)." },
  { key: "marketCap", label: "Market Cap", available: true, default: true, compute: (r) => money(r.mcap) },
  { key: "poolPrice", label: "Pool Price", available: true, default: true, compute: (r) => `${r.price} SOL` },
  { key: "fdv", label: "FDV", available: false, reason: "Butuh total supply token, tidak dihitung di condensePool()." },
  { key: "tvl", label: "TVL", available: true, default: true, compute: (r) => money(r.tvl) },
  { key: "activeTvl", label: "Active TVL", available: true, default: false, compute: (r) => money(r.active_tvl) },
  { key: "feesTvl", label: "Fees/TVL", available: true, default: false, compute: (r) => ratioPct(r.fee_window, r.tvl) },
  { key: "feesActiveTvl", label: "Fees/Active TVL", available: true, default: true, compute: (r) => `${r.fee_active_tvl_ratio}%` },
  { key: "volumeTvl", label: "Volume/TVL", available: true, default: false, compute: (r) => ratioPct(r.volume_window, r.tvl) },
  { key: "volumeActiveTvl", label: "Volume/Active TVL", available: true, default: true, compute: (r) => `${r.volume_active_tvl_ratio}%` },
  { key: "swaps", label: "Swaps", available: true, default: true, compute: (r) => r.swap_count.toLocaleString() },
  { key: "traders", label: "Traders", available: true, default: true, compute: (r) => r.unique_traders.toLocaleString() },
  { key: "totalLps", label: "Total LPs", available: true, default: true, compute: (r) => r.unique_lps },
  { key: "uniquePastLps", label: "Unique Past LPs", available: false, reason: "condensePool() cuma expose unique_lps (LP aktif saat ini), tidak melacak histori LP lama." },
  { key: "netDeposit", label: "Net Deposit", available: false, reason: "Tidak ada field deposit/withdrawal di condensePool() — itu ada di state.js per-posisi bot, bukan per-pool." },
  { key: "holders", label: "Holders", available: true, default: true, compute: (r) => r.holders.toLocaleString() },
  { key: "avgVolMin", label: "Avg Vol/min", available: true, default: true, compute: (r) => money(r.volume_window / r.timeframeMinutes) },
  { key: "avgFeesMin", label: "Avg Fees/min", available: true, default: true, compute: (r) => money(r.fee_window / r.timeframeMinutes) },
  { key: "avgSwapsMin", label: "Avg Swaps/min", available: true, default: false, compute: (r) => (r.swap_count / r.timeframeMinutes).toFixed(2) },
  { key: "volatility", label: "Volatility", available: true, default: true, compute: (r) => r.volatility },
  { key: "openPositions", label: "Open Positions", available: true, default: false, compute: (r) => r.open_positions },
  { key: "inRangePositions", label: "In Range Positions", available: true, default: false, compute: (r) => `${r.active_positions} (${r.active_pct}%)` },
  { key: "positionsCreated", label: "Positions Created", available: true, default: false, compute: (r) => r.positions_created },
  { key: "minMaxPrice", label: "Min/Max Price", available: true, default: false, compute: (r) => `${r.min_price} / ${r.max_price}` },
  { key: "top10Holders", label: "Top 10 Holders", available: false, reason: "Dicek sebagai hard-filter (maxTop10Pct) sebelum LLM, tapi angkanya tidak ikut di-expose di condensePool() output." },
  { key: "devBalance", label: "Dev Balance", available: false, reason: "condensePool() cuma simpan address dev (untuk dev-blocklist), bukan saldo wallet dev." },
];

function money(n) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function ratioPct(a, b) {
  if (!b) return "—";
  return `${((a / b) * 100).toFixed(2)}%`;
}

export const DEFAULT_COLUMN_ORDER = COLUMN_DEFS.map((c) => c.key);
export const DEFAULT_VISIBLE_COLUMNS = COLUMN_DEFS.filter((c) => c.default).map((c) => c.key);
