function money(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function ratioPct(a, b) {
  if (!b || !Number.isFinite(a / b)) return "—";
  return `${((a / b) * 100).toFixed(2)}%`;
}

function fmtPrice(p) {
  if (p == null || !Number.isFinite(Number(p))) return "—";
  const n = Number(p);
  if (n === 0) return "0";
  if (n < 0.000001) return n.toExponential(3) + " SOL";
  if (n < 0.001) return n.toFixed(8) + " SOL";
  if (n < 1) return n.toFixed(6) + " SOL";
  return n.toFixed(4) + " SOL";
}

function fmtNum(n) {
  if (n == null) return "—";
  return Number(n).toLocaleString();
}

// timeframe string → minutes
function tfMinutes(tf) {
  if (!tf) return 720;
  const m = tf.match(/^(\d+)(m|h|d)$/i);
  if (!m) return 720;
  const v = Number(m[1]);
  if (m[2] === "m") return v;
  if (m[2] === "h") return v * 60;
  return v * 1440;
}

export const COLUMN_DEFS = [
  { key: "volume",          label: "Volume",           available: true,  default: true,  compute: (r) => money(r.volume_window) },
  { key: "fees",            label: "Fees",             available: true,  default: true,  compute: (r) => money(r.fee_window) },
  { key: "priceTrend",      label: "Price Trend",      available: true,  default: true,  sparkline: true },
  { key: "tokenAge",        label: "Token Age",        available: true,  default: true,  compute: (r) => r.token_age_label ?? (r.token_age_hours != null ? `${Math.floor(r.token_age_hours / 24)}d ${r.token_age_hours % 24}h` : "—") },
  { key: "marketCap",       label: "Market Cap",       available: true,  default: true,  compute: (r) => money(r.mcap) },
  { key: "poolPrice",       label: "Pool Price",       available: true,  default: true,  compute: (r) => fmtPrice(r.price) },
  { key: "tvl",             label: "TVL",              available: true,  default: true,  compute: (r) => money(r.tvl) },
  { key: "activeTvl",       label: "Active TVL",       available: true,  default: false, compute: (r) => money(r.active_tvl) },
  { key: "feesTvl",         label: "Fees/TVL",         available: true,  default: false, compute: (r) => ratioPct(r.fee_window, r.tvl) },
  { key: "feesActiveTvl",   label: "Fees/Active TVL",  available: true,  default: true,  compute: (r) => r.fee_active_tvl_ratio != null ? `${(r.fee_active_tvl_ratio * 100).toFixed(2)}%` : "—" },
  { key: "volumeActiveTvl", label: "Volume/Active TVL",available: true,  default: true,  compute: (r) => r.volume_active_tvl_ratio != null ? `${(r.volume_active_tvl_ratio * 100).toFixed(2)}%` : "—" },
  { key: "swaps",           label: "Swaps",            available: true,  default: true,  compute: (r) => fmtNum(r.swap_count) },
  { key: "traders",         label: "Traders",          available: true,  default: true,  compute: (r) => fmtNum(r.unique_traders) },
  { key: "totalLps",        label: "Total LPs",        available: true,  default: true,  compute: (r) => fmtNum(r.unique_lps) },
  { key: "holders",         label: "Holders",          available: true,  default: true,  compute: (r) => fmtNum(r.holders) },
  { key: "avgVolMin",       label: "Avg Vol/min",      available: true,  default: true,  compute: (r, tf) => money(r.volume_window / tfMinutes(tf)) },
  { key: "avgFeesMin",      label: "Avg Fees/min",     available: true,  default: true,  compute: (r, tf) => money(r.fee_window / tfMinutes(tf)) },
  { key: "volatility",      label: "Volatility",       available: true,  default: true,  compute: (r) => r.volatility != null ? r.volatility.toFixed(4) : "—" },
  { key: "openPositions",   label: "Open Positions",   available: true,  default: false, compute: (r) => fmtNum(r.open_positions) },
  { key: "inRangePositions",label: "In Range Positions",available: true, default: false, compute: (r) => r.active_positions != null ? `${r.active_positions} (${r.active_pct ?? "?"}%)` : "—" },
  { key: "poolAge",         label: "Pool Age",         available: false, reason: "Umur pool tidak di-expose oleh Meteora Pool Discovery API." },
  { key: "fdv",             label: "FDV",              available: false, reason: "Butuh total supply token." },
  { key: "netDeposit",      label: "Net Deposit",      available: false, reason: "Tidak ada field deposit/withdrawal di API pool." },
  { key: "top10Holders",    label: "Top 10 Holders",   available: false, reason: "Hard-filter saja, tidak di-expose di API." },
  { key: "devBalance",      label: "Dev Balance",      available: false, reason: "Tidak tersedia di Pool Discovery API." },
];

export const DEFAULT_COLUMN_ORDER = COLUMN_DEFS.map((c) => c.key);
export const DEFAULT_VISIBLE_COLUMNS = COLUMN_DEFS.filter((c) => c.default).map((c) => c.key);
