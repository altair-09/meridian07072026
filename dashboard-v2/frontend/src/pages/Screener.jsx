import { useEffect, useState, useCallback } from "react";
import { IconStar, IconAdjustments, IconColumns3, IconRefresh } from "@tabler/icons-react";
import Sparkline from "../components/Sparkline";
import InfoDot from "../components/InfoDot";
import ColumnsPanel from "../components/ColumnsPanel";
import FilterDrawer from "../components/FilterDrawer";
import { api } from "../api";
import { COLUMN_DEFS, DEFAULT_COLUMN_ORDER, DEFAULT_VISIBLE_COLUMNS } from "../mock/poolColumns";

const TIMEFRAMES = ["5m", "30m", "1h", "2h", "4h", "12h", "24h"];

const CATEGORY_TABS = [
  { label: "All", apiValue: "all" },
  { label: "Favorites", apiValue: null },
  { label: "Top Performers", apiValue: "top" },
  { label: "Trending", apiValue: "trending" },
  { label: "New Tokens", apiValue: "new" },
  { label: "RWA", apiValue: "rwa" },
];

const FAVORITES_STORAGE_KEY = "meridian.screener.favorites";
const COLUMNS_STORAGE_KEY = "meridian.screener.columns";

function loadFavorites() {
  try { return new Set(JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || "[]")); }
  catch { return new Set(); }
}

function loadColumnPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(COLUMNS_STORAGE_KEY) || "null");
    if (!saved) throw new Error("no saved prefs");
    return { order: saved.order, visible: new Set(saved.visible) };
  } catch {
    return { order: DEFAULT_COLUMN_ORDER, visible: new Set(DEFAULT_VISIBLE_COLUMNS) };
  }
}

function pct(n) {
  if (n == null) return null;
  const positive = n > 0;
  return <span className="t-caption" style={{ color: positive ? "var(--success)" : "var(--error)" }}>{positive ? "+" : ""}{n}%</span>;
}

function money(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export default function Screener() {
  const [category, setCategory] = useState("Top Performers");
  const [favorites, setFavorites] = useState(loadFavorites);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});
  const [showColumns, setShowColumns] = useState(false);
  const [apeInAmount, setApeInAmount] = useState("0.1");
  const [timeframe, setTimeframe] = useState("12h");
  const [{ order: columnOrder, visible: visibleColumns }, setColumnPrefs] = useState(loadColumnPrefs);
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apeStatus, setApeStatus] = useState("");

  useEffect(() => { localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...favorites])); }, [favorites]);
  useEffect(() => { localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify({ order: columnOrder, visible: [...visibleColumns] })); }, [columnOrder, visibleColumns]);

  const loadPools = useCallback(async () => {
    if (category === "Favorites") return;
    setLoading(true);
    setError(null);
    try {
      const apiCategory = CATEGORY_TABS.find((c) => c.label === category)?.apiValue ?? "trending";
      const data = await api.pools({ category: apiCategory, timeframe, limit: 50 });
      setPools(data.pools || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [category, timeframe]);

  useEffect(() => { loadPools(); }, [loadPools]);

  const toggleFavorite = (pool) => {
    setFavorites((prev) => { const next = new Set(prev); next.has(pool) ? next.delete(pool) : next.add(pool); return next; });
  };

  const rows = category === "Favorites" ? pools.filter((p) => favorites.has(p.pool)) : pools;

  const totals = rows.reduce(
    (acc, p) => ({ tvl: acc.tvl + (p.tvl ?? 0), volume: acc.volume + (p.volume_window ?? 0), fees: acc.fees + (p.fee_window ?? 0) }),
    { tvl: 0, volume: 0, fees: 0 },
  );

  const activeColumns = columnOrder
    .map((key) => COLUMN_DEFS.find((c) => c.key === key))
    .filter((c) => c && c.available && visibleColumns.has(c.key));

  async function handleApeIn(pool) {
    const amount = Number(apeInAmount);
    if (!Number.isFinite(amount) || amount <= 0) { setApeStatus("Jumlah SOL tidak valid."); return; }
    if (!confirm(`Deploy ${amount} SOL ke ${pool.name}?`)) return;
    setApeStatus("Mengirim...");
    try {
      const res = await fetch("/api/screening/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pool_address: pool.pool, pool_name: pool.name, amount_sol: amount, bin_step: pool.bin_step, fee_tvl_ratio: pool.fee_active_tvl_ratio }),
      });
      const result = await res.json();
      if (result.blocked) setApeStatus(`Ditolak: ${result.reason}`);
      else if (result.error) setApeStatus(`Gagal: ${result.error}`);
      else if (result.dry_run) setApeStatus(`Dry run: ${result.message}`);
      else setApeStatus(`Berhasil deploy ke ${pool.name}`);
    } catch (e) {
      setApeStatus(`Gagal: ${e.message}`);
    }
    setTimeout(() => setApeStatus(""), 6000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="t-display-sm">Screener</h1>
          <p className="t-body-sm text-muted" style={{ marginTop: 4 }}>Kandidat pool bot kamu (DLMM saja) — data real dari Meteora Pool Discovery API</p>
        </div>
        <div style={{ display: "flex", gap: 32 }}>
          <div><div className="t-caption text-muted">TVL total</div><div className="t-title-md">{money(totals.tvl)}</div></div>
          <div><div className="t-caption text-muted">Volume total</div><div className="t-title-md">{money(totals.volume)}</div></div>
          <div><div className="t-caption text-muted">Fees total</div><div className="t-title-md">{money(totals.fees)}</div></div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, borderBottom: "1px solid var(--hairline)", overflowX: "auto" }}>
        {CATEGORY_TABS.map((c) => (
          <button key={c.label} onClick={() => setCategory(c.label)} className="t-body-sm" style={{
            background: "none", border: "none", padding: "10px 0",
            color: category === c.label ? "var(--primary-glow)" : "var(--text-muted)",
            borderBottom: category === c.label ? "2px solid var(--primary-glow)" : "2px solid transparent",
            whiteSpace: "nowrap", cursor: "pointer",
          }}>{c.label}</button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input className="input" placeholder="Filter Token" style={{ flex: 1, minWidth: 180 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--surface-card)", border: "1px solid var(--hairline)", borderRadius: "var(--radius-control)", padding: "0 8px", height: 44 }}>
          <span className="t-body-sm" style={{ fontWeight: 500 }}>Ape In</span>
          <InfoDot text="Deploy cepat: klik Ape In di baris pool untuk langsung deploy dengan jumlah SOL ini." />
          <input className="input" style={{ width: 64, height: 32, border: "none", padding: "0 6px" }} value={apeInAmount} onChange={(e) => setApeInAmount(e.target.value)} />
        </div>
        <select className="input" style={{ width: 90 }} value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
          {TIMEFRAMES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="btn btn-secondary" onClick={loadPools} title="Refresh" disabled={loading}>
          <IconRefresh size={18} stroke={1.75} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
        </button>
        <button className="btn btn-secondary" onClick={() => setShowFilters((v) => !v)}>
          <IconAdjustments size={18} stroke={1.75} />
        </button>
        <div style={{ position: "relative" }}>
          <button className="btn btn-secondary" onClick={() => setShowColumns((v) => !v)}>
            <IconColumns3 size={18} stroke={1.75} />
          </button>
          {showColumns && (
            <div style={{ position: "absolute", top: 48, right: 0, zIndex: 20 }}>
              <ColumnsPanel order={columnOrder} visible={visibleColumns}
                onChange={({ order, visible }) => setColumnPrefs({ order, visible })}
                onClose={() => setShowColumns(false)} />
            </div>
          )}
        </div>
      </div>

      {apeStatus && <p className="t-body-sm" style={{ color: apeStatus.startsWith("Berhasil") ? "var(--success)" : "var(--error)" }}>{apeStatus}</p>}

      <FilterDrawer open={showFilters} onClose={() => setShowFilters(false)} onApply={(f) => setActiveFilters(f)} />

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        {error && <p className="t-body-sm" style={{ color: "var(--error)", padding: 16 }}>Error: {error}</p>}
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead>
            <tr className="t-caption-upper text-muted">
              <th style={{ textAlign: "left", padding: "12px 16px" }}>#</th>
              <th style={{ textAlign: "left", padding: "12px 16px" }}>Token</th>
              {activeColumns.map((c) => <th key={c.key} style={{ textAlign: "left", padding: "12px 16px" }}>{c.label}</th>)}
              <th style={{ textAlign: "left", padding: "12px 16px" }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={activeColumns.length + 3} className="t-body-sm text-muted" style={{ padding: 24, textAlign: "center" }}>Memuat pool dari Meteora API...</td></tr>
            ) : rows.map((p) => (
              <tr key={p.pool} style={{ borderTop: "1px solid var(--hairline)" }}>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button onClick={() => toggleFavorite(p.pool)} aria-label="Favorite"
                      style={{ background: "none", border: "none", color: favorites.has(p.pool) ? "var(--warning)" : "var(--text-muted-soft)", cursor: "pointer", padding: 0 }}>
                      <IconStar size={16} stroke={1.75} fill={favorites.has(p.pool) ? "currentColor" : "none"} />
                    </button>
                    <span className="t-body-sm">#{p.rank}</span>
                  </div>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <div className="t-body-md" style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                    {p.name}
                    {p.warningReasons?.length > 0 && <span className="badge badge-warning">{p.warningReasons.length}</span>}
                    {p.warningReasons?.length > 0 && <InfoDot text={p.warningReasons.join(" · ")} />}
                  </div>
                  <div className="t-caption text-muted" style={{ marginTop: 2 }}>
                    {p.fee_pct != null ? `Fee: ${p.fee_pct}% · ` : ""}Bin Step: {p.bin_step ?? "—"}
                  </div>
                </td>
                {activeColumns.map((c) => (
                  <td key={c.key} style={{ padding: "12px 16px" }}>
                    {c.sparkline ? <Sparkline points={p.priceTrend ?? []} /> : c.compute(p, timeframe)}
                    {c.key === "volume" && pct(p.volume_change_pct)}
                    {c.key === "fees" && pct(p.fee_change_pct)}
                    {c.key === "marketCap" && null}
                    {c.key === "poolPrice" && pct(p.price_change_pct)}
                  </td>
                ))}
                <td style={{ padding: "12px 16px" }}>
                  <button className="btn btn-primary" style={{ height: 32, fontSize: 13 }} onClick={() => handleApeIn(p)}>Ape In</button>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={activeColumns.length + 3} className="t-body-sm text-muted" style={{ padding: 24, textAlign: "center" }}>
                {category === "Favorites" ? "Belum ada pool yang di-favorite." : "Tidak ada pool."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
