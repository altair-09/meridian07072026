import { useMemo, useState } from "react";
import CandlestickChart, { computeRsi } from "../components/CandlestickChart";
import { generateMockOhlcv, feeBreakdown, poolCandidates } from "../mock/mockData";

const TABS = ["Create Position", "Limit Order", "Swap"];

export default function ManualTrading() {
  const [tab, setTab] = useState(TABS[0]);
  const [strategy, setStrategy] = useState("Bid Ask");
  const [autoFill, setAutoFill] = useState(true);
  const [excludeAutoManage, setExcludeAutoManage] = useState(true);
  const [indicators, setIndicators] = useState({ bollinger: true, supertrend: false, fibo: false });
  const [priceRange, setPriceRange] = useState([40, 60]);
  const processing = false; // set true here to preview the disabled state

  const candles = useMemo(() => generateMockOhlcv(60), []);
  const rsi = useMemo(() => computeRsi(candles), [candles]);
  const pool = poolCandidates[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <h1 className="t-display-sm">Manual trading</h1>

      <div style={{ display: "flex", gap: 8 }}>
        {TABS.map((t) => (
          <button
            key={t}
            className={tab === t ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="trading-grid" style={{ display: "grid", gridTemplateColumns: "260px 1fr 320px", gap: "var(--space-4)" }}>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="t-title-sm">{pool.name}</div>
          <div className="t-body-sm text-muted">Current price</div>
          <div className="t-code">$0.000412</div>
          <div className="t-body-sm text-muted">TVL</div>
          <div className="t-code">${pool.tvl.toLocaleString()}</div>
          <div className="t-body-sm text-muted">Token balance</div>
          <div className="t-code">1.42 SOL</div>
          <div className="t-body-sm text-muted" style={{ marginTop: 8 }}>Liquidity distribution</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 60 }}>
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${20 + Math.abs(Math.sin(i / 2)) * 40}%`,
                  background: i >= 10 && i <= 14 ? "var(--primary)" : "var(--surface-strong)",
                  borderRadius: 2,
                }}
              />
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span className="t-title-sm">Chart</span>
            <div style={{ display: "flex", gap: 12 }}>
              {Object.keys(indicators).map((key) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }} className="text-muted">
                  <input
                    type="checkbox"
                    checked={indicators[key]}
                    onChange={(e) => setIndicators((prev) => ({ ...prev, [key]: e.target.checked }))}
                  />
                  {key}
                </label>
              ))}
            </div>
          </div>
          <CandlestickChart candles={candles} indicators={indicators} />
          <div className="t-caption text-muted" style={{ marginTop: 8 }}>
            RSI(14): {rsi} &middot; Indikator dihitung independen dari bot — bisa berbeda dari logika internal bot.
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
            {Object.entries(feeBreakdown).map(([k, v]) => (
              <div key={k}>
                <div className="t-caption text-muted" style={{ textTransform: "capitalize" }}>{k}</div>
                <div className="t-code">{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          {tab === "Create Position" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="checkbox" checked={autoFill} onChange={(e) => setAutoFill(e.target.checked)} />
                <span className="t-body-sm">Auto-fill 50/50</span>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="t-caption text-muted">Amount X</span>
                <input className="input" type="number" placeholder="0.0" />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="t-caption text-muted">Amount Y</span>
                <input className="input" type="number" placeholder="0.0" />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="t-caption text-muted">Strategy</span>
                <select className="input" value={strategy} onChange={(e) => setStrategy(e.target.value)}>
                  <option>Spot</option>
                  <option>Curve</option>
                  <option>Bid Ask</option>
                </select>
              </label>
              <div>
                <span className="t-caption text-muted">Price range</span>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <input className="input" type="number" value={priceRange[0]} onChange={(e) => setPriceRange([+e.target.value, priceRange[1]])} />
                  <input className="input" type="number" value={priceRange[1]} onChange={(e) => setPriceRange([priceRange[0], +e.target.value])} />
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], +e.target.value])}
                  style={{ width: "100%", marginTop: 8 }}
                />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="checkbox" checked={excludeAutoManage} onChange={(e) => setExcludeAutoManage(e.target.checked)} />
                <span className="t-body-sm">Exclude dari auto-management</span>
              </label>
              <button className="btn btn-primary" disabled={processing} title={processing ? "Nonaktif saat bot target Processing" : ""}>Create position</button>
            </div>
          )}

          {tab === "Limit Order" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="t-caption text-muted">Allocate / To buy</span>
                <input className="input" type="number" placeholder="0.0" />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="t-caption text-muted">Mode</span>
                <select className="input">
                  <option>Single Price</option>
                  <option>Price Range</option>
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="t-caption text-muted">Limit price</span>
                <input className="input" type="number" placeholder="0.0" />
              </label>
              <button className="btn btn-primary" disabled={processing} title={processing ? "Nonaktif saat bot target Processing" : ""}>Place limit order</button>
            </div>
          )}

          {tab === "Swap" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="t-caption text-muted">From amount</span>
                <input className="input" type="number" placeholder="0.0" />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="t-caption text-muted">To amount (estimasi)</span>
                <input className="input" type="number" placeholder="0.0" disabled />
              </label>
              <p className="t-caption text-muted">Swap ini pakai 1 pool saja. Untuk harga terbaik lintas pool, cek Jupiter.</p>
              <button className="btn btn-primary" disabled={processing} title={processing ? "Nonaktif saat bot target Processing" : ""}>Swap</button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 1023px) {
          .trading-grid { grid-template-columns: 1fr 1fr !important; }
          .trading-grid > *:first-child { grid-column: 1 / -1; }
        }
        @media (max-width: 639px) {
          .trading-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
