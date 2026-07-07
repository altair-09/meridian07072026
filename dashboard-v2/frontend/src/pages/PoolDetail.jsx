import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { IconArrowLeft, IconAlertTriangle } from "@tabler/icons-react";
import CandlestickChart, { computeRsi } from "../components/CandlestickChart";
import { poolBrowser, generateMockOhlcv } from "../mock/mockData";

const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"];
const DEPLOY_TABS = ["Create Position", "Limit Order", "Swap"];
const CHART_TABS = ["Positions", "Limit Orders", "History"];

// ── helpers ────────────────────────────────────────────────────────────────────
function money(n) {
  if (!n && n !== 0) return "—";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}
function fmtNum(n, decimals = 4) {
  if (!n && n !== 0) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: decimals });
}
function Row({ label, value, muted }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px dashed var(--hairline)" }}>
      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: muted ? "var(--text-muted)" : "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

// ── Drag-resize handle ─────────────────────────────────────────────────────────
function ResizeHandle({ onDrag }) {
  const dragging = useRef(false);
  const startX = useRef(0);

  const onMouseDown = (e) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;

    const move = (ev) => { if (dragging.current) onDrag(ev.clientX - startX.current); startX.current = ev.clientX; };
    const up = () => { dragging.current = false; window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return (
    <div
      onMouseDown={onMouseDown}
      title="Drag to resize"
      style={{
        width: 5, flexShrink: 0, cursor: "col-resize", background: "transparent",
        borderLeft: "1px solid var(--hairline)", position: "relative", zIndex: 10,
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-glow)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    />
  );
}

// ── Interactive liquidity distribution ────────────────────────────────────────
function LiquidityDist({ bins, pool }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  if (!bins?.length) return null;

  const midIdx = Math.floor(bins.length / 2);
  const maxVal = Math.max(...bins.map((b) => Math.max(b.base, b.quote)), 1);
  const priceRange = (pool.max_price ?? 1) - (pool.min_price ?? 0);
  const step = priceRange / bins.length;
  const hovBin = hoverIdx !== null ? bins[hoverIdx] : null;
  const hovPrice = hoverIdx !== null ? ((pool.min_price ?? 0) + hoverIdx * step).toFixed(6) : null;
  const hovIsBase = hoverIdx !== null && hoverIdx < midIdx;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: "#00d4ff" }}>● {pool.base}</span>
        <span style={{ fontSize: 11, color: "#a78bfa" }}>● {pool.quote}</span>
      </div>

      <div style={{ position: "relative" }}>
        {/* Tooltip */}
        {hovBin && (
          <div style={{
            position: "absolute", bottom: "calc(100% + 4px)",
            left: `${Math.min(Math.max((hoverIdx / bins.length) * 100, 5), 75)}%`,
            background: "var(--surface-card)", border: "1px solid var(--hairline-strong)",
            borderRadius: 6, padding: "5px 8px", fontSize: 11, lineHeight: 1.6,
            pointerEvents: "none", zIndex: 20, whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}>
            <div style={{ color: "var(--text-muted)" }}>Price: <strong style={{ color: "var(--text-primary)" }}>{hovPrice}</strong></div>
            <div style={{ color: hovIsBase ? "#00d4ff" : "#a78bfa" }}>
              {hovIsBase ? pool.base : pool.quote}: <strong>{fmtNum(hovIsBase ? hovBin.base : hovBin.quote, 2)}</strong>
            </div>
          </div>
        )}

        {/* Histogram bars */}
        <div
          style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 72, position: "relative", cursor: "crosshair" }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {bins.map((b, i) => {
            const isBase = i < midIdx;
            const val = isBase ? b.base : b.quote;
            const height = Math.max(3, (val / maxVal) * 100);
            const isHov = i === hoverIdx;
            return (
              <div
                key={i}
                onMouseEnter={() => setHoverIdx(i)}
                style={{
                  flex: 1, height: `${height}%`,
                  background: isBase ? "#00d4ff" : "#a78bfa",
                  borderRadius: "1px 1px 0 0",
                  opacity: isHov ? 1 : 0.75,
                  transition: "opacity 0.1s",
                }}
              />
            );
          })}
          {/* current price marker */}
          <div style={{ position: "absolute", left: "calc(50% - 1px)", top: 0, bottom: 0, width: 2, background: "#fff", borderRadius: 1, pointerEvents: "none" }} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, position: "relative" }}>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{pool.min_price}</span>
        <span style={{ fontSize: 10, color: "var(--text-muted)", position: "absolute", left: "50%", transform: "translateX(-50%)" }}>{pool.pool_price_sol}</span>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{pool.max_price}</span>
      </div>
    </div>
  );
}

// ── Strategy shape generator ───────────────────────────────────────────────────
// Returns array of 0..1 values representing relative liquidity height per bin
function strategyShape(strategy, n) {
  const arr = Array.from({ length: n });
  if (strategy === "Spot") {
    return arr.map(() => 1);
  }
  if (strategy === "Curve") {
    const mid = (n - 1) / 2;
    const sigma = n / 5;
    return arr.map((_, i) => Math.exp(-0.5 * ((i - mid) / sigma) ** 2));
  }
  if (strategy === "Bid Ask") {
    const sigma = n / 8;
    return arr.map((_, i) => {
      const left = Math.exp(-0.5 * ((i) / sigma) ** 2);
      const right = Math.exp(-0.5 * ((i - (n - 1)) / sigma) ** 2);
      return Math.max(left, right);
    });
  }
  return arr.map(() => 1);
}

// ── Interactive price range slider ─────────────────────────────────────────────
function PriceRangeSlider({ pool, bins, priceMin, priceMax, onChangeMin, onChangeMax, strategy }) {
  const trackRef = useRef(null);
  const [hovBarIdx, setHovBarIdx] = useState(null);

  const globalMin = pool.min_price ?? 0;
  const globalMax = pool.max_price ?? 1;
  const range = globalMax - globalMin;

  const minPct = Math.max(0, Math.min(100, ((priceMin - globalMin) / range) * 100));
  const maxPct = Math.max(0, Math.min(100, ((priceMax - globalMin) / range) * 100));

  const totalBins = bins?.length ?? 32;
  const selectedBins = Math.round(((priceMax - priceMin) / range) * totalBins);

  function pctToPrice(pct) {
    return +(globalMin + (pct / 100) * range).toFixed(6);
  }

  function startDrag(e, which) {
    e.preventDefault();
    const track = trackRef.current;
    if (!track) return;

    const move = (ev) => {
      const rect = track.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100));
      const price = pctToPrice(pct);
      if (which === "min") {
        if (price < priceMax - 0.000001) onChangeMin(price);
      } else {
        if (price > priceMin + 0.000001) onChangeMax(price);
      }
    };
    const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  const hovBinPrice = hovBarIdx !== null
    ? (globalMin + (hovBarIdx / totalBins) * range).toFixed(6)
    : null;
  const hovBin = hovBarIdx !== null && bins ? bins[hovBarIdx] : null;
  const hovIsBase = hovBarIdx !== null && hovBarIdx < Math.floor(totalBins / 2);

  return (
    <div>
      {/* Labels */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Price Range</span>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>SOL/{pool.base}</span>
        </div>
        <span style={{ fontSize: 11, color: "var(--warning)", fontWeight: 600 }}>{selectedBins} bins</span>
      </div>

      {/* Min/Max inputs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {[
          { label: "Min", val: priceMin, onChange: onChangeMin },
          { label: "Max", val: priceMax, onChange: onChangeMax },
        ].map(({ label, val, onChange }) => (
          <div key={label} style={{ flex: 1, background: "var(--surface-card-elevated)", borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>{label}</div>
            <input
              type="number"
              value={val}
              step={0.000001}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v)) onChange(v);
              }}
              style={{ width: "100%", background: "none", border: "none", fontSize: 13, fontWeight: 600, color: "var(--text-primary)", outline: "none" }}
            />
          </div>
        ))}
      </div>

      {/* Histogram + slider track */}
      <div style={{ position: "relative", userSelect: "none" }}>

        {/* Hover tooltip */}
        {hovBin && (
          <div style={{
            position: "absolute", bottom: "calc(100% + 4px)",
            left: `${Math.min(Math.max((hovBarIdx / totalBins) * 100, 5), 70)}%`,
            background: "var(--surface-card)", border: "1px solid var(--hairline-strong)",
            borderRadius: 6, padding: "5px 8px", fontSize: 11, lineHeight: 1.6,
            pointerEvents: "none", zIndex: 20, whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}>
            <div style={{ color: "var(--text-muted)" }}>Price: <strong style={{ color: "var(--text-primary)" }}>{hovBinPrice}</strong></div>
            <div style={{ color: hovIsBase ? "#00d4ff" : "#a78bfa" }}>
              {hovIsBase ? pool.base : pool.quote}: <strong>{fmtNum(hovIsBase ? hovBin.base : hovBin.quote, 2)}</strong>
            </div>
          </div>
        )}

        {/* Histogram bars */}
        <div
          ref={trackRef}
          style={{ height: 56, display: "flex", alignItems: "flex-end", gap: 1, cursor: "crosshair", position: "relative" }}
          onMouseLeave={() => setHovBarIdx(null)}
        >
          {(() => {
            const poolBins = bins ?? Array.from({ length: totalBins }).map((_, i) => ({ base: Math.abs(Math.sin(i / 2)) * 60 + 20, quote: Math.abs(Math.cos(i / 2)) * 50 + 10 }));
            const maxBinVal = Math.max(...poolBins.map((bb) => Math.max(bb.base, bb.quote)), 80);
            // Selected bin range indices
            const selStart = Math.round((minPct / 100) * totalBins);
            const selEnd = Math.round((maxPct / 100) * totalBins);
            const selCount = Math.max(1, selEnd - selStart);
            const shape = strategyShape(strategy, selCount);
            const maxShape = Math.max(...shape, 0.001);

            return poolBins.map((b, i) => {
              const bPct = (i / totalBins) * 100;
              const inRange = bPct >= minPct && bPct <= maxPct;
              const isBase = i < Math.floor(totalBins / 2);
              const val = isBase ? b.base : b.quote;
              // Background bar: pool's existing liquidity (muted when out of range)
              const poolH = Math.max(4, (val / maxBinVal) * 100);

              if (!inRange) {
                return (
                  <div
                    key={i}
                    onMouseEnter={() => setHovBarIdx(i)}
                    style={{ flex: 1, height: `${poolH}%`, borderRadius: "1px 1px 0 0", background: "var(--surface-strong)", opacity: hovBarIdx === i ? 0.6 : 0.3, transition: "opacity 0.1s", position: "relative" }}
                  />
                );
              }

              // In-range: show strategy shape overlay on top of pool bars
              const shapeIdx = i - selStart;
              const shapeH = (shape[shapeIdx] ?? 0) / maxShape; // 0..1
              // Blend: strategy shape as bright overlay, pool as dim base
              return (
                <div
                  key={i}
                  onMouseEnter={() => setHovBarIdx(i)}
                  style={{ flex: 1, position: "relative", height: `${Math.max(poolH, shapeH * 100)}%`, borderRadius: "1px 1px 0 0", overflow: "visible" }}
                >
                  {/* Pool base bar */}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${(poolH / Math.max(poolH, shapeH * 100)) * 100}%`, background: isBase ? "#00d4ff" : "#a78bfa", opacity: 0.3, borderRadius: "1px 1px 0 0" }} />
                  {/* Strategy shape bar */}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${(shapeH * 100 / Math.max(poolH, shapeH * 100)) * 100}%`, background: "#f97316", opacity: hovBarIdx === i ? 1 : 0.85, borderRadius: "1px 1px 0 0", transition: "opacity 0.1s" }} />
                </div>
              );
            });
          })()}

          {/* Selected range highlight overlay */}
          <div style={{
            position: "absolute", bottom: 0, top: 0,
            left: `${minPct}%`, width: `${maxPct - minPct}%`,
            background: "rgba(0,212,255,0.05)",
            borderLeft: "2px solid #f97316", borderRight: "2px solid #f97316",
            pointerEvents: "none",
          }} />
        </div>

        {/* Drag track with handles */}
        <div style={{ position: "relative", height: 18, marginTop: 2 }}>
          {/* Track line */}
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 3, background: "var(--surface-strong)", borderRadius: 2, transform: "translateY(-50%)" }} />
          {/* Selected range fill */}
          <div style={{ position: "absolute", top: "50%", left: `${minPct}%`, width: `${maxPct - minPct}%`, height: 3, background: "#f97316", borderRadius: 2, transform: "translateY(-50%)" }} />

          {/* Min handle */}
          <div
            onMouseDown={(e) => startDrag(e, "min")}
            style={{
              position: "absolute", top: "50%", left: `${minPct}%`,
              width: 16, height: 16, borderRadius: "50%",
              background: "#f97316", border: "2px solid #fff",
              transform: "translate(-50%, -50%)", cursor: "ew-resize",
              boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
              zIndex: 5,
            }}
          />
          {/* Max handle */}
          <div
            onMouseDown={(e) => startDrag(e, "max")}
            style={{
              position: "absolute", top: "50%", left: `${maxPct}%`,
              width: 16, height: 16, borderRadius: "50%",
              background: "#f97316", border: "2px solid #fff",
              transform: "translate(-50%, -50%)", cursor: "ew-resize",
              boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
              zIndex: 5,
            }}
          />
        </div>

        {/* Price labels */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
          <span>{globalMin}</span>
          <span>{globalMax}</span>
        </div>
      </div>
    </div>
  );
}

// ── Left panel ─────────────────────────────────────────────────────────────────
function LeftPanel({ pool, width }) {
  return (
    <div style={{ width, flexShrink: 0, borderRight: "none", padding: "16px 14px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{pool.name}</span>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--success)", boxShadow: "0 0 6px var(--success)", flexShrink: 0 }} />
          {pool.warningReasons?.length > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--warning)", background: "rgba(255,165,0,0.1)", borderRadius: 4, padding: "2px 6px" }}>
              <IconAlertTriangle size={12} /> {pool.warningReasons.length}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Fee: {pool.fee_pct}% · Bin Step: {pool.bin_step}</div>
      </div>

      {pool.warningReasons?.length > 0 && (
        <div style={{ background: "rgba(255,77,77,0.07)", border: "1px solid rgba(255,77,77,0.2)", borderRadius: 6, padding: "8px 10px" }}>
          {pool.warningReasons.map((w, i) => (
            <div key={i} style={{ fontSize: 11, color: "var(--error)", lineHeight: 1.6 }}>· {w}</div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 1 }}>Current Pool Price</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{pool.pool_price_sol} SOL/{pool.base}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 1 }}>Total Value Locked</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{money(pool.tvl)}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {[{ color: "#00d4ff", name: pool.base, val: fmtNum(pool.base_supply, 0) }, { color: "#a78bfa", name: pool.quote, val: fmtNum(pool.quote_supply, 2) }].map(({ color, name, val }) => (
          <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>{name}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{val}</span>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--surface-card-elevated)", borderRadius: 8, padding: "10px 12px" }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Liquidity Distribution</div>
        <LiquidityDist bins={pool.bins} pool={pool} />
      </div>

      <div>
        <Row label="24h Fees" value={`${money(pool.fee_window)} (0%)`} />
        <Row label="24h Fees/TVL" value={`${pool.fee_active_tvl_ratio?.toFixed(2)}% (0%)`} />
      </div>
      <div>
        <Row label="Bin Step" value={pool.bin_step} />
        <Row label="Base Fee" value={`${pool.fee_pct}%`} />
        <Row label="Dynamic Fee" value={`${pool.dynamic_fee_pct ?? "—"}%`} muted />
        <Row label="Total Trading Fee" value={`${pool.total_fee_pct ?? "—"}%`} />
        <Row label="Max Fee" value={`${pool.max_fee_pct ?? 10}%`} muted />
        <Row label="Protocol Fee" value={`${pool.protocol_fee_pct ?? "—"}%`} muted />
        <Row label="Fee Collection Token" value={pool.fee_collection_token ?? "Quote"} />
        <Row label="Limit Order Bonus" value={`${pool.limit_order_bonus_pct ?? "—"}%`} muted />
      </div>
      <div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 3 }}>Volume</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{money(pool.volume_window)}</div>
      </div>
      <div>
        <Row label="Organic Score" value={pool.organic_score ?? "—"} />
        <Row label="Holders" value={fmtNum(pool.holders, 0)} />
        <Row label="Swap Count" value={fmtNum(pool.swap_count, 0)} />
        <Row label="Unique Traders" value={fmtNum(pool.unique_traders, 0)} />
        <Row label="Unique LPs" value={fmtNum(pool.unique_lps, 0)} />
        <Row label="Volatility" value={`${pool.volatility?.toFixed(1)}%`} />
        <Row label="Token Age" value={pool.token_age_label} />
        <Row label="Market Cap" value={money(pool.mcap)} />
      </div>
    </div>
  );
}

// ── Middle panel ───────────────────────────────────────────────────────────────
function MiddlePanel({ pool, candles }) {
  const [tf, setTf] = useState("5m");
  const [chartTab, setChartTab] = useState("Positions");
  const [indicators, setIndicators] = useState({ bollinger: false, supertrend: true, fibo: false });
  const rsi = useMemo(() => computeRsi(candles), [candles]);

  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
      {/* Chart header */}
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--hairline)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6, flexShrink: 0 }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Price Chart</span>
          <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>
            {pool.base} ${pool.price?.toFixed(8)} · MCap: {money(pool.mcap)}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {Object.keys(indicators).map((k) => (
            <label key={k} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--text-muted)", cursor: "pointer" }}>
              <input type="checkbox" checked={indicators[k]} onChange={(e) => setIndicators((p) => ({ ...p, [k]: e.target.checked }))} />
              {k}
            </label>
          ))}
          <div style={{ display: "flex", background: "var(--surface-card-elevated)", borderRadius: 6, overflow: "hidden", border: "1px solid var(--hairline)" }}>
            {TIMEFRAMES.map((t) => (
              <button key={t} onClick={() => setTf(t)} style={{
                padding: "4px 8px", fontSize: 11, border: "none", cursor: "pointer",
                background: tf === t ? "var(--primary)" : "transparent",
                color: tf === t ? "#fff" : "var(--text-muted)",
              }}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart — no extra padding so it's flush */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <CandlestickChart candles={candles} indicators={indicators} />
      </div>

      <div style={{ padding: "4px 14px 6px", fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
        RSI(14): {rsi} · Volatility: {pool.volatility?.toFixed(1)}% · Min bin: {pool.min_price} · Max bin: {pool.max_price}
      </div>

      {/* Bottom tabs */}
      <div style={{ borderTop: "1px solid var(--hairline)", padding: "0 14px", display: "flex", alignItems: "center", gap: 20, flexShrink: 0 }}>
        {CHART_TABS.map((t) => (
          <button key={t} onClick={() => setChartTab(t)} style={{
            background: "none", border: "none", padding: "9px 0", fontSize: 13, cursor: "pointer",
            color: chartTab === t ? "var(--primary-glow)" : "var(--text-muted)",
            borderBottom: chartTab === t ? "2px solid var(--primary-glow)" : "2px solid transparent",
          }}>{t}</button>
        ))}
      </div>
      <div style={{ padding: "14px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, flexShrink: 0 }}>
        <div style={{ fontSize: 28, opacity: 0.25 }}>⊘</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>No Wallet Connected</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Connect your wallet to view your {chartTab.toLowerCase()}</div>
      </div>
    </div>
  );
}

// ── Right panel ────────────────────────────────────────────────────────────────
function RightPanel({ pool, width }) {
  const [tab, setTab] = useState("Create Position");
  const [strategy, setStrategy] = useState("Spot");
  const [autoFill, setAutoFill] = useState(true);
  const [amtBase, setAmtBase] = useState("");
  const [amtQuote, setAmtQuote] = useState("");
  const [priceMin, setPriceMin] = useState(pool.min_price ?? 0);
  const [priceMax, setPriceMax] = useState(pool.max_price ?? 1);
  const [excludeManage, setExcludeManage] = useState(true);
  const [limitPrice, setLimitPrice] = useState(pool.pool_price_sol ?? "");
  const [limitMode, setLimitMode] = useState("Single Price");

  return (
    <div style={{ width, flexShrink: 0, display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <div style={{ display: "flex", borderBottom: "1px solid var(--hairline)" }}>
        {DEPLOY_TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "11px 4px", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
            background: "none", color: tab === t ? "var(--primary-glow)" : "var(--text-muted)",
            borderBottom: tab === t ? "2px solid var(--primary-glow)" : "2px solid transparent",
          }}>{t}</button>
        ))}
      </div>

      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>

        {tab === "Create Position" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Amount</span>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)", cursor: "pointer" }}>
                <span>Auto-Fill</span>
                <div onClick={() => setAutoFill((v) => !v)} style={{ width: 32, height: 18, borderRadius: 9, background: autoFill ? "var(--primary-glow)" : "var(--surface-strong)", position: "relative", cursor: "pointer" }}>
                  <div style={{ position: "absolute", top: 2, left: autoFill ? 16 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
                </div>
              </label>
            </div>

            {[{ token: pool.base, val: amtBase, set: setAmtBase }, { token: pool.quote, val: amtQuote, set: setAmtQuote }].map(({ token, val, set }) => (
              <div key={token} style={{ background: "var(--surface-card-elevated)", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{token}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>0 | 50%</span>
                </div>
                <input type="number" placeholder="0.00" value={val} onChange={(e) => set(e.target.value)}
                  style={{ width: "100%", background: "none", border: "none", fontSize: 18, fontWeight: 600, color: "var(--text-primary)", outline: "none" }} />
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>$0.00</div>
              </div>
            ))}

            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 7 }}>Strategy</div>
              <div style={{ display: "flex", gap: 6 }}>
                {["Spot", "Curve", "Bid Ask"].map((s) => (
                  <button key={s} onClick={() => setStrategy(s)} style={{
                    flex: 1, height: 34, fontSize: 11, fontWeight: 500, borderRadius: 6, cursor: "pointer",
                    border: `1px solid ${strategy === s ? "var(--primary-glow)" : "var(--hairline-strong)"}`,
                    background: strategy === s ? "rgba(26,38,255,0.15)" : "var(--surface-card-elevated)",
                    color: strategy === s ? "var(--primary-glow)" : "var(--text-muted)",
                  }}>{s}</button>
                ))}
              </div>
            </div>

            {/* Interactive price range slider */}
            <PriceRangeSlider
              pool={pool}
              bins={pool.bins}
              priceMin={priceMin}
              priceMax={priceMax}
              onChangeMin={setPriceMin}
              onChangeMax={setPriceMax}
              strategy={strategy}
            />

            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={excludeManage} onChange={(e) => setExcludeManage(e.target.checked)} />
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Exclude dari auto-management</span>
            </label>

            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", fontWeight: 700 }}>Create Position</button>
          </>
        )}

        {tab === "Limit Order" && (
          <>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Allocate</div>
            <div style={{ background: "var(--surface-card-elevated)", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{pool.base}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>0 | 50%</span>
              </div>
              <input type="number" placeholder="0.00" style={{ width: "100%", background: "none", border: "none", fontSize: 18, fontWeight: 600, color: "var(--text-primary)", outline: "none" }} />
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>$0.00</div>
            </div>
            <div style={{ textAlign: "center", color: "var(--text-muted)" }}>⇅</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>To Buy</div>
            <div style={{ background: "var(--surface-card-elevated)", borderRadius: 8, padding: "10px 12px" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{pool.quote}</span>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>0</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>$0.00</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {["Single Price", "Price Range"].map((m) => (
                <button key={m} onClick={() => setLimitMode(m)} style={{
                  flex: 1, height: 34, fontSize: 11, borderRadius: 6, cursor: "pointer",
                  border: "1px solid var(--hairline-strong)",
                  background: limitMode === m ? "var(--surface-strong)" : "var(--surface-card-elevated)",
                  color: limitMode === m ? "var(--text-primary)" : "var(--text-muted)",
                  fontWeight: limitMode === m ? 600 : 400,
                }}>{m}</button>
              ))}
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Limit Order Price</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>SOL/{pool.base}</span>
              </div>
              <div style={{ background: "var(--surface-card-elevated)", borderRadius: 8, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <input type="number" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)}
                  style={{ background: "none", border: "none", fontSize: 15, fontWeight: 600, color: "var(--text-primary)", outline: "none", width: "60%" }} />
                <span style={{ fontSize: 12, color: "var(--success)" }}>+9.37%</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                Market Price: {pool.pool_price_sol} SOL/{pool.base}
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", fontWeight: 700, marginTop: "auto" }}>Create Limit Order</button>
          </>
        )}

        {tab === "Swap" && (
          <>
            <div style={{ background: "rgba(26,38,255,0.08)", border: "1px solid rgba(26,38,255,0.2)", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 12, color: "var(--primary-glow)", fontWeight: 600, marginBottom: 4 }}>
                ✦ Current Price on Jupiter: 1 {pool.base} ≈ {pool.pool_price_sol} SOL
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                This swap uses a single liquidity pool. For potentially better prices across multiple pools, check Jupiter.
              </div>
            </div>
            {[pool.base, pool.quote].map((token, idx) => (
              <div key={token} style={{ background: "var(--surface-card-elevated)", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{token}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>0 | 50%</span>
                </div>
                <input type="number" placeholder="0.00" disabled={idx === 1}
                  style={{ width: "100%", background: "none", border: "none", fontSize: 18, fontWeight: 600, color: idx === 1 ? "var(--text-muted)" : "var(--text-primary)", outline: "none" }} />
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>$0.00</div>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button style={{ background: "none", border: "1px solid var(--hairline-strong)", borderRadius: 6, width: 32, height: 32, cursor: "pointer", color: "var(--text-muted)", fontSize: 16 }}>⇅</button>
            </div>
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", fontWeight: 700 }}>Swap</button>
          </>
        )}
      </div>
    </div>
  );
}

// ── main ───────────────────────────────────────────────────────────────────────
const MIN_LEFT = 200;
const MAX_LEFT = 420;
const MIN_RIGHT = 260;
const MAX_RIGHT = 480;

export default function PoolDetail() {
  const { rank } = useParams();
  const navigate = useNavigate();
  const pool = poolBrowser.find((p) => String(p.rank) === rank);
  const candles = useMemo(() => generateMockOhlcv(80, pool?.price ?? 0.00042), [pool?.pool]);

  const [leftW, setLeftW] = useState(270);
  const [rightW, setRightW] = useState(320);

  if (!pool) {
    return (
      <div style={{ padding: 32 }}>
        <p className="t-body-sm text-muted">Pool tidak ditemukan.</p>
        <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => navigate("/trade")}>← Kembali</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>

      {/* Back bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", borderBottom: "1px solid var(--hairline)", flexShrink: 0 }}>
        <button onClick={() => navigate("/trade")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <IconArrowLeft size={16} stroke={1.75} /> Kembali ke Trade
        </button>
        <span style={{ color: "var(--hairline-strong)" }}>·</span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{pool.name}</span>
        <span className="t-caption text-muted">{pool.pool}</span>
      </div>

      {/* 3-column layout with resize handles */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
        <LeftPanel pool={pool} width={leftW} />

        <ResizeHandle onDrag={(dx) => setLeftW((w) => Math.max(MIN_LEFT, Math.min(MAX_LEFT, w + dx)))} />

        <MiddlePanel pool={pool} candles={candles} />

        <ResizeHandle onDrag={(dx) => setRightW((w) => Math.max(MIN_RIGHT, Math.min(MAX_RIGHT, w - dx)))} />

        <RightPanel pool={pool} width={rightW} />
      </div>
    </div>
  );
}
