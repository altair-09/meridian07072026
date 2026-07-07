import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconAdjustments, IconColumns3, IconX, IconStar } from "@tabler/icons-react";
import CandlestickChart, { computeRsi } from "../components/CandlestickChart";
import Sparkline from "../components/Sparkline";
import InfoDot from "../components/InfoDot";
import ColumnsPanel from "../components/ColumnsPanel";
import FilterDrawer from "../components/FilterDrawer";
import { poolBrowser, generateMockOhlcv, feeBreakdown } from "../mock/mockData";
import { COLUMN_DEFS, DEFAULT_COLUMN_ORDER, DEFAULT_VISIBLE_COLUMNS } from "../mock/poolColumns";

const TIMEFRAMES = ["5m", "30m", "1h", "2h", "4h", "12h", "24h"];
const CATEGORY_TABS = [
  { label: "All", apiValue: "all" },
  { label: "Favorites", apiValue: null },
  { label: "Top Performers", apiValue: "top" },
  { label: "Trending", apiValue: "trending" },
  { label: "New Tokens", apiValue: "new" },
];
const DEPLOY_TABS = ["Create Position", "Limit Order", "Swap"];

const FAVORITES_KEY = "meridian.trade.favorites";
const COLUMNS_KEY = "meridian.trade.columns";

function loadFavorites() {
  try { return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]")); }
  catch { return new Set(); }
}
function loadColumnPrefs() {
  try {
    const s = JSON.parse(localStorage.getItem(COLUMNS_KEY) || "null");
    if (!s) throw 0;
    return { order: s.order, visible: new Set(s.visible) };
  } catch { return { order: DEFAULT_COLUMN_ORDER, visible: new Set(DEFAULT_VISIBLE_COLUMNS) }; }
}

function money(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}
function pct(n) {
  if (!n) return null;
  return <span style={{ color: n > 0 ? "var(--success)" : "var(--error)", fontSize: 12, marginLeft: 4 }}>{n > 0 ? "+" : ""}{n}%</span>;
}

// ── Pool detail panel ─────────────────────────────────────────────────────────

function DeployForm({ pool }) {
  const [tab, setTab] = useState("Create Position");
  const [strategy, setStrategy] = useState("Bid Ask");
  const [autoFill, setAutoFill] = useState(true);
  const [excludeAutoManage, setExcludeAutoManage] = useState(true);
  const [amtX, setAmtX] = useState("");
  const [amtY, setAmtY] = useState("");
  const [priceRange, setPriceRange] = useState([40, 60]);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {DEPLOY_TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, height: 32, fontSize: 12, fontWeight: 500, borderRadius: "var(--radius-control)", cursor: "pointer",
            border: "1px solid var(--hairline-strong)",
            background: tab === t ? "var(--primary)" : "var(--surface-card-elevated)",
            color: tab === t ? "#fff" : "var(--text-muted)",
          }}>{t}</button>
        ))}
      </div>

      {tab === "Create Position" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={autoFill} onChange={(e) => setAutoFill(e.target.checked)} />
            <span style={{ fontSize: 13, color: "var(--text-body)" }}>Auto-fill 50/50</span>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="t-caption text-muted">Amount X ({pool?.name?.split("-")[0]})</span>
            <input className="input" style={{ height: 38 }} type="number" placeholder="0.0" value={amtX} onChange={(e) => setAmtX(e.target.value)} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="t-caption text-muted">Amount Y (SOL)</span>
            <input className="input" style={{ height: 38 }} type="number" placeholder="0.0" value={amtY} onChange={(e) => setAmtY(e.target.value)} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="t-caption text-muted">Strategy</span>
            <select className="input" style={{ height: 38 }} value={strategy} onChange={(e) => setStrategy(e.target.value)}>
              <option>Spot</option><option>Curve</option><option>Bid Ask</option>
            </select>
          </label>
          <div>
            <span className="t-caption text-muted">Price range</span>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <input className="input" style={{ height: 38 }} type="number" value={priceRange[0]} onChange={(e) => setPriceRange([+e.target.value, priceRange[1]])} />
              <input className="input" style={{ height: 38 }} type="number" value={priceRange[1]} onChange={(e) => setPriceRange([priceRange[0], +e.target.value])} />
            </div>
            <input type="range" min="0" max="100" value={priceRange[1]} onChange={(e) => setPriceRange([priceRange[0], +e.target.value])} style={{ width: "100%", marginTop: 8 }} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={excludeAutoManage} onChange={(e) => setExcludeAutoManage(e.target.checked)} />
            <span style={{ fontSize: 13, color: "var(--text-body)" }}>Exclude dari auto-management</span>
          </label>
          <button className="btn btn-primary" style={{ marginTop: 4 }}>Create position</button>
        </div>
      )}

      {tab === "Limit Order" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="t-caption text-muted">Allocate</span>
            <input className="input" style={{ height: 38 }} type="number" placeholder="0.0" />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="t-caption text-muted">Mode</span>
            <select className="input" style={{ height: 38 }}><option>Single Price</option><option>Price Range</option></select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="t-caption text-muted">Limit price</span>
            <input className="input" style={{ height: 38 }} type="number" placeholder="0.0" />
          </label>
          <button className="btn btn-primary" style={{ marginTop: 4 }}>Place limit order</button>
        </div>
      )}

      {tab === "Swap" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="t-caption text-muted">From amount</span>
            <input className="input" style={{ height: 38 }} type="number" placeholder="0.0" />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="t-caption text-muted">To amount (estimasi)</span>
            <input className="input" style={{ height: 38 }} type="number" placeholder="0.0" disabled />
          </label>
          <p className="t-caption text-muted">Swap via 1 pool. Untuk harga terbaik lintas pool, gunakan Jupiter.</p>
          <button className="btn btn-primary" style={{ marginTop: 4 }}>Swap</button>
        </div>
      )}
    </div>
  );
}

function PoolPanel({ pool, onClose }) {
  const [timeframe, setTimeframe] = useState("1h");
  const [indicators, setIndicators] = useState({ bollinger: true, supertrend: false, fibo: false });
  const candles = useMemo(() => generateMockOhlcv(60, pool?.price ?? 0.00042), [pool?.pool]);
  const rsi = useMemo(() => computeRsi(candles), [candles]);

  if (!pool) return null;

  return (
    <div style={{
      width: 380, flexShrink: 0, borderLeft: "1px solid var(--hairline)",
      display: "flex", flexDirection: "column", overflowY: "auto",
      background: "var(--canvas)",
    }}>
      {/* Panel header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px", borderBottom: "1px solid var(--hairline)",
        position: "sticky", top: 0, background: "var(--canvas)", zIndex: 1,
      }}>
        <div>
          <div className="t-title-sm">{pool.name}</div>
          <div className="t-caption text-muted" style={{ marginTop: 2 }}>
            Fee {pool.fee_pct}% · Bin step {pool.bin_step} · {pool.token_age_label}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}>
          <IconX size={18} stroke={1.75} />
        </button>
      </div>

      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Key stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { label: "TVL", value: money(pool.tvl) },
            { label: "Volume (window)", value: money(pool.volume_window) },
            { label: "Fee / TVL", value: `${pool.fee_active_tvl_ratio?.toFixed(2) ?? "—"}%` },
            { label: "Organic score", value: pool.organic_score ?? pool.organicScore ?? "—" },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: "var(--surface-card)", borderRadius: "var(--radius-control)", padding: "8px 10px" }}>
              <div className="t-caption text-muted">{label}</div>
              <div className="t-body-sm" style={{ fontWeight: 600, marginTop: 2 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Warnings */}
        {pool.warningReasons?.length > 0 && (
          <div style={{ background: "rgba(255,77,77,0.08)", border: "1px solid rgba(255,77,77,0.2)", borderRadius: "var(--radius-control)", padding: "8px 12px" }}>
            <div className="t-caption" style={{ color: "var(--error)", fontWeight: 600, marginBottom: 4 }}>Warnings</div>
            {pool.warningReasons.map((w, i) => (
              <div key={i} className="t-caption" style={{ color: "var(--error)", opacity: 0.85 }}>· {w}</div>
            ))}
          </div>
        )}

        {/* Chart */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="t-body-sm" style={{ fontWeight: 500 }}>Chart</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {Object.keys(indicators).map((key) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11 }} className="text-muted">
                  <input type="checkbox" checked={indicators[key]} onChange={(e) => setIndicators((p) => ({ ...p, [key]: e.target.checked }))} />
                  {key}
                </label>
              ))}
              <select
                className="input"
                style={{ height: 28, fontSize: 12, padding: "0 6px", width: 52 }}
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
              >
                {TIMEFRAMES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <CandlestickChart candles={candles} indicators={indicators} />
          <div className="t-caption text-muted" style={{ marginTop: 6 }}>
            RSI(14): {rsi} · Volatility: {pool.volatility?.toFixed(1) ?? "—"}%
          </div>
        </div>

        {/* Fee breakdown */}
        <div style={{ display: "flex", gap: 12 }}>
          {Object.entries(feeBreakdown).map(([k, v]) => (
            <div key={k}>
              <div className="t-caption text-muted" style={{ textTransform: "capitalize" }}>{k}</div>
              <div className="t-code" style={{ fontSize: 12 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Liquidity distribution */}
        <div>
          <div className="t-caption text-muted" style={{ marginBottom: 6 }}>Liquidity distribution</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 48 }}>
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} style={{
                flex: 1, height: `${20 + Math.abs(Math.sin(i / 2)) * 40}%`, borderRadius: 2,
                background: i >= 10 && i <= 14 ? "var(--primary-glow)" : "var(--surface-strong)",
              }} />
            ))}
          </div>
        </div>

        {/* Deploy form */}
        <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: 14 }}>
          <DeployForm pool={pool} />
        </div>
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function Trade() {
  const navigate = useNavigate();
  const [category, setCategory] = useState("Top Performers");
  const [selectedPool, setSelectedPool] = useState(null);
  const [favorites, setFavorites] = useState(loadFavorites);
  const [showFilters, setShowFilters] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [search, setSearch] = useState("");
  const [apeInAmount, setApeInAmount] = useState("0.1");
  const [timeframe, setTimeframe] = useState("12h");
  const [activeFilters, setActiveFilters] = useState({});
  const [{ order: columnOrder, visible: visibleColumns }, setColumnPrefs] = useState(loadColumnPrefs);

  const toggleFavorite = (pool) => setFavorites((prev) => {
    const next = new Set(prev);
    next.has(pool) ? next.delete(pool) : next.add(pool);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
    return next;
  });

  const baseRows = category === "Favorites" ? poolBrowser.filter((p) => favorites.has(p.pool)) : poolBrowser;

  const rows = baseRows.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeFilters.tvlMin && p.tvl < +activeFilters.tvlMin) return false;
    if (activeFilters.tvlMax && p.tvl > +activeFilters.tvlMax) return false;
    if (activeFilters.volumeMin && p.volume_window < +activeFilters.volumeMin) return false;
    if (activeFilters.feeTvlPctMin && p.fee_active_tvl_ratio < +activeFilters.feeTvlPctMin) return false;
    if (activeFilters.binStepMin && p.bin_step < +activeFilters.binStepMin) return false;
    if (activeFilters.binStepMax && p.bin_step > +activeFilters.binStepMax) return false;
    if (activeFilters.holdersMin && p.holders < +activeFilters.holdersMin) return false;
    if (activeFilters.mcapMin && p.mcap < +activeFilters.mcapMin) return false;
    if (activeFilters.mcapMax && p.mcap > +activeFilters.mcapMax) return false;
    return true;
  });

  const activeColumns = columnOrder
    .map((key) => COLUMN_DEFS.find((c) => c.key === key))
    .filter((c) => c && c.available && visibleColumns.has(c.key));

  const activeFilterCount = Object.values(activeFilters).filter((v) => v && v !== "" && v !== false && v !== null).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", flex: 1, overflowY: "auto", padding: "var(--space-6)" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="t-display-sm">Trade</h1>
          <p className="t-body-sm text-muted" style={{ marginTop: 4 }}>Temukan pool DLMM dan deploy posisi langsung dari sini</p>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {[
            { label: "TVL total", value: money(rows.reduce((s, p) => s + p.tvl, 0)) },
            { label: "Volume total", value: money(rows.reduce((s, p) => s + p.volume_window, 0)) },
            { label: "Fees total", value: money(rows.reduce((s, p) => s + p.fee_window, 0)) },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="t-caption text-muted">{label}</div>
              <div className="t-title-md">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Category tabs ── */}
      <div style={{ display: "flex", gap: 20, borderBottom: "1px solid var(--hairline)", overflowX: "auto" }}>
        {CATEGORY_TABS.map((c) => (
          <button key={c.label} onClick={() => setCategory(c.label)} className="t-body-sm" style={{
            background: "none", border: "none", padding: "10px 0", cursor: "pointer", whiteSpace: "nowrap",
            color: category === c.label ? "var(--primary-glow)" : "var(--text-muted)",
            borderBottom: category === c.label ? "2px solid var(--primary-glow)" : "2px solid transparent",
          }}>{c.label}</button>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          className="input" placeholder="Cari token..." style={{ flex: 1, minWidth: 160 }}
          value={search} onChange={(e) => setSearch(e.target.value)}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--surface-card)", border: "1px solid var(--hairline)", borderRadius: "var(--radius-control)", padding: "0 8px", height: 44 }}>
          <span className="t-body-sm" style={{ fontWeight: 500 }}>Ape In</span>
          <InfoDot text="Klik tombol 'Ape In' di baris pool untuk langsung deploy dengan jumlah SOL ini." />
          <input className="input" style={{ width: 64, height: 32, border: "none", padding: "0 6px" }} value={apeInAmount} onChange={(e) => setApeInAmount(e.target.value)} />
        </div>
        <select className="input" style={{ width: 90 }} value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
          {TIMEFRAMES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <div style={{ position: "relative" }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowFilters((v) => !v)}
            style={{ position: "relative" }}
            aria-label="Filter"
          >
            <IconAdjustments size={18} stroke={1.75} />
            {activeFilterCount > 0 && (
              <span style={{
                position: "absolute", top: -6, right: -6, width: 18, height: 18,
                background: "var(--primary-glow)", borderRadius: "50%",
                fontSize: 10, fontWeight: 700, color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{activeFilterCount}</span>
            )}
          </button>
        </div>
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

      {/* ── Main: table + slide-in panel ── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, gap: 0, border: "1px solid var(--hairline)", borderRadius: "var(--radius-card)", overflow: "hidden" }}>

        {/* Pool table */}
        <div style={{ flex: 1, minWidth: 0, overflowX: "auto", overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: selectedPool ? 480 : 900 }}>
            <thead style={{ position: "sticky", top: 0, background: "var(--surface-card)", zIndex: 1 }}>
              <tr className="t-caption-upper text-muted">
                <th style={{ textAlign: "left", padding: "12px 16px" }}>#</th>
                <th style={{ textAlign: "left", padding: "12px 16px" }}>Token</th>
                {!selectedPool && activeColumns.map((c) => (
                  <th key={c.key} style={{ textAlign: "left", padding: "12px 16px" }}>{c.label}</th>
                ))}
                {selectedPool && (
                  <>
                    <th style={{ textAlign: "left", padding: "12px 16px" }}>TVL</th>
                    <th style={{ textAlign: "left", padding: "12px 16px" }}>Fee/TVL</th>
                  </>
                )}
                <th style={{ padding: "12px 16px" }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const isSelected = selectedPool?.pool === p.pool;
                return (
                  <tr
                    key={p.pool}
                    onClick={() => navigate(`/trade/pool/${p.rank}`)}
                    style={{
                      borderTop: "1px solid var(--hairline)", cursor: "pointer",
                      background: "transparent",
                    }}
                    className="data-row"
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button onClick={(e) => { e.stopPropagation(); toggleFavorite(p.pool); }}
                          style={{ background: "none", border: "none", color: favorites.has(p.pool) ? "var(--warning)" : "var(--text-muted-soft)", cursor: "pointer", padding: 0 }}>
                          <IconStar size={16} stroke={1.75} fill={favorites.has(p.pool) ? "currentColor" : "none"} />
                        </button>
                        <span className="t-body-sm">#{p.rank}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div className="t-body-md" style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                        {p.name}
                        {p.warningReasons?.length > 0 && (
                          <span className="badge badge-warning">{p.warningReasons.length}</span>
                        )}
                      </div>
                      <div className="t-caption text-muted" style={{ marginTop: 2 }}>
                        Fee: {p.fee_pct}% · Bin: {p.bin_step}
                      </div>
                    </td>
                    {!selectedPool && activeColumns.map((c) => (
                      <td key={c.key} style={{ padding: "12px 16px" }}>
                        {c.sparkline ? <Sparkline points={p.priceTrend} /> : c.compute(p)}
                        {c.key === "volume" && pct(p.volumeChangePct)}
                        {c.key === "fees" && pct(p.feesChangePct)}
                      </td>
                    ))}
                    {selectedPool && (
                      <>
                        <td className="t-code" style={{ padding: "12px 16px" }}>{money(p.tvl)}</td>
                        <td className="t-code" style={{ padding: "12px 16px" }}>{p.fee_active_tvl_ratio?.toFixed(2)}%</td>
                      </>
                    )}
                    <td style={{ padding: "12px 16px" }} onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-primary" style={{ height: 32, fontSize: 13 }}>
                        Ape In
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="t-body-sm text-muted" style={{ padding: 24, textAlign: "center" }}>
                    {category === "Favorites" ? "Belum ada pool yang di-favorite." : "Tidak ada pool yang cocok dengan filter."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Slide-in panel */}
        {selectedPool && <PoolPanel pool={selectedPool} onClose={() => setSelectedPool(null)} />}
      </div>

      {/* Filter drawer */}
      <FilterDrawer
        open={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={(f) => setActiveFilters(f)}
      />
    </div>
  );
}
