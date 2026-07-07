import { useEffect, useState } from "react";
import { IconStar, IconAdjustments, IconColumns3 } from "@tabler/icons-react";
import Sparkline from "../components/Sparkline";
import InfoDot from "../components/InfoDot";
import ColumnsPanel from "../components/ColumnsPanel";
import FilterDrawer from "../components/FilterDrawer";
import { poolBrowser } from "../mock/mockData";
import { COLUMN_DEFS, DEFAULT_COLUMN_ORDER, DEFAULT_VISIBLE_COLUMNS } from "../mock/poolColumns";

const TIMEFRAMES = ["5m", "30m", "1h", "2h", "4h", "12h", "24h"];

// Meteora Pool Discovery API's `category` param only accepts these 5 values —
// confirmed directly against the live API (anything else 400s). "Favorites"
// is NOT an API category — it's a local filter over pools you've starred.
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
  try {
    return new Set(JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || "[]"));
  } catch {
    return new Set();
  }
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
  if (!n) return null;
  const positive = n > 0;
  return (
    <span className="t-caption" style={{ color: positive ? "var(--success)" : "var(--error)" }}>
      {positive ? "+" : ""}{n}%
    </span>
  );
}

function money(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
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

  useEffect(() => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...favorites]));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify({ order: columnOrder, visible: [...visibleColumns] }));
  }, [columnOrder, visibleColumns]);

  const toggleFavorite = (pool) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(pool) ? next.delete(pool) : next.add(pool);
      return next;
    });
  };

  // "Favorites" filters the already-fetched list locally. Every other tab
  // maps 1:1 to a real `category` value sent to the Pool Discovery API.
  const rows = category === "Favorites" ? poolBrowser.filter((p) => favorites.has(p.pool)) : poolBrowser;

  const totals = rows.reduce(
    (acc, p) => ({ tvl: acc.tvl + p.tvl, volume: acc.volume + p.volume_window, fees: acc.fees + p.fee_window }),
    { tvl: 0, volume: 0, fees: 0 },
  );

  const activeColumns = columnOrder
    .map((key) => COLUMN_DEFS.find((c) => c.key === key))
    .filter((c) => c && c.available && visibleColumns.has(c.key));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="t-display-sm">Screener</h1>
          <p className="t-body-sm text-muted" style={{ marginTop: 4 }}>Untuk Liquidity Provider — kandidat pool bot kamu (DLMM saja)</p>
        </div>
        <div style={{ display: "flex", gap: 32 }}>
          <div>
            <div className="t-caption text-muted">TVL (pool ditampilkan)</div>
            <div className="t-title-md">{money(totals.tvl)}</div>
          </div>
          <div>
            <div className="t-caption text-muted">Volume (pool ditampilkan)</div>
            <div className="t-title-md">{money(totals.volume)}</div>
          </div>
          <div>
            <div className="t-caption text-muted">Fees (pool ditampilkan)</div>
            <div className="t-title-md">{money(totals.fees)}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, borderBottom: "1px solid var(--hairline)", overflowX: "auto" }}>
        {CATEGORY_TABS.map((c) => (
          <button
            key={c.label}
            onClick={() => setCategory(c.label)}
            className="t-body-sm"
            style={{
              background: "none", border: "none", padding: "10px 0",
              color: category === c.label ? "var(--primary-glow)" : "var(--text-muted)",
              borderBottom: category === c.label ? "2px solid var(--primary-glow)" : "2px solid transparent",
              whiteSpace: "nowrap", cursor: "pointer",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input className="input" placeholder="Filter Token" style={{ flex: 1, minWidth: 180 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--surface-card)", border: "1px solid var(--hairline)", borderRadius: "var(--radius-control)", padding: "0 8px", height: 44 }}>
          <span className="t-body-sm" style={{ fontWeight: 500 }}>Ape In</span>
          <InfoDot text="Deploy cepat: klik tombol 'Ape In' di baris pool untuk langsung deploy_position dengan jumlah SOL ini, tanpa buka form lengkap." />
          <input
            className="input"
            style={{ width: 64, height: 32, border: "none", padding: "0 6px" }}
            value={apeInAmount}
            onChange={(e) => setApeInAmount(e.target.value)}
          />
        </div>
        <select className="input" style={{ width: 90 }} value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
          {TIMEFRAMES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="btn btn-secondary" onClick={() => setShowFilters((v) => !v)} aria-label="Filter lanjutan">
          <IconAdjustments size={18} stroke={1.75} />
        </button>
        <div style={{ position: "relative" }}>
          <button className="btn btn-secondary" onClick={() => setShowColumns((v) => !v)} aria-label="Columns">
            <IconColumns3 size={18} stroke={1.75} />
          </button>
          {showColumns && (
            <div style={{ position: "absolute", top: 48, right: 0, zIndex: 20 }}>
              <ColumnsPanel
                order={columnOrder}
                visible={visibleColumns}
                onChange={({ order, visible }) => setColumnPrefs({ order, visible })}
                onClose={() => setShowColumns(false)}
              />
            </div>
          )}
        </div>
      </div>

      <FilterDrawer
        open={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={(f) => setActiveFilters(f)}
      />

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead>
            <tr className="t-caption-upper text-muted">
              <th style={{ textAlign: "left", padding: "12px 16px" }}>#</th>
              <th style={{ textAlign: "left", padding: "12px 16px" }}>Token</th>
              {activeColumns.map((c) => (
                <th key={c.key} style={{ textAlign: "left", padding: "12px 16px" }}>{c.label}</th>
              ))}
              <th style={{ textAlign: "left", padding: "12px 16px" }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.pool} style={{ borderTop: "1px solid var(--hairline)" }}>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      onClick={() => toggleFavorite(p.pool)}
                      aria-label="Favorite"
                      style={{ background: "none", border: "none", color: favorites.has(p.pool) ? "var(--warning)" : "var(--text-muted-soft)", cursor: "pointer", padding: 0 }}
                    >
                      <IconStar size={16} stroke={1.75} fill={favorites.has(p.pool) ? "currentColor" : "none"} />
                    </button>
                    <span className="t-body-sm">#{p.rank}</span>
                  </div>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <div className="t-body-md" style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                    {p.name}
                    {p.warningReasons.length > 0 && <span className="badge badge-warning">{p.warningReasons.length}</span>}
                    {p.warningReasons.length > 0 && <InfoDot text={p.warningReasons.join(" · ")} />}
                  </div>
                  <div className="t-caption text-muted" style={{ marginTop: 2 }}>
                    Fee: {p.fee_pct}% · Bin Step: {p.bin_step}
                  </div>
                </td>
                {activeColumns.map((c) => (
                  <td key={c.key} style={{ padding: "12px 16px" }}>
                    {c.sparkline ? <Sparkline points={p.priceTrend} /> : c.compute(p)}
                    {c.key === "volume" && pct(p.volumeChangePct)}
                    {c.key === "fees" && pct(p.feesChangePct)}
                    {c.key === "marketCap" && pct(p.marketCapChangePct)}
                    {c.key === "poolPrice" && pct(p.poolPriceChangePct)}
                  </td>
                ))}
                <td style={{ padding: "12px 16px" }}>
                  <button className="btn btn-primary" style={{ height: 32, fontSize: 13 }}>Ape In</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={activeColumns.length + 3} className="t-body-sm text-muted" style={{ padding: 24, textAlign: "center" }}>
                  {category === "Favorites" ? "Belum ada pool yang di-favorite. Klik ikon bintang di baris manapun." : "Tidak ada pool untuk ditampilkan."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
