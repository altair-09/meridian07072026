import { useState, useEffect, useCallback } from "react";
import { IconX } from "@tabler/icons-react";

const DEFAULT_FILTERS = {
  // Token Details
  organicScoreMin: "", organicScoreMax: "",
  excludeHighSupplyConcentration: false,
  noHighSingleOwnership: false,
  mcapMin: "", mcapMax: "",
  tokenAgeMin: "", tokenAgeMax: "",
  holdersMin: "", holdersMax: "",
  top10PctMin: "", top10PctMax: "",
  // Pool Details
  poolAgeMin: "", poolAgeMax: "",
  volumeMin: "", volumeMax: "",
  feesMin: "", feesMax: "",
  feeTvlPctMin: "", feeTvlPctMax: "",
  tvlMin: "", tvlMax: "",
  baseFeePctMin: "", baseFeePctMax: "",
  // DLMM
  binStepMin: "", binStepMax: "",
  feeCollectionMode: null, // "quote" | "quote_base"
};

const PRESETS_KEY = "meridian.screener.filter_presets";
const ACTIVE_FILTERS_KEY = "meridian.screener.active_filters";

function loadPresets() {
  try {
    return JSON.parse(localStorage.getItem(PRESETS_KEY) || "[]");
  } catch { return []; }
}

function loadActiveFilters() {
  try {
    const saved = JSON.parse(localStorage.getItem(ACTIVE_FILTERS_KEY) || "null");
    return saved ? { ...DEFAULT_FILTERS, ...saved } : { ...DEFAULT_FILTERS };
  } catch { return { ...DEFAULT_FILTERS }; }
}

function countActive(f) {
  let n = 0;
  for (const [k, v] of Object.entries(f)) {
    if (v === true) n++;
    else if (v && v !== "") n++;
  }
  return n;
}

// ── sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.7px", textTransform: "uppercase", marginBottom: 10, marginTop: 2 }}>
      {children}
    </div>
  );
}

function GroupLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted-soft)", letterSpacing: "0.88px", textTransform: "uppercase", marginBottom: 8 }}>
      {children}
    </div>
  );
}

function RangeRow({ labelMin, labelMax, keyMin, keyMax, filters, onChange, prefix = "", suffix = "" }) {
  const activeMin = filters[keyMin] !== "";
  const activeMax = filters[keyMax] !== "";

  function field(key, placeholder, active) {
    return (
      <div style={{ position: "relative", flex: 1 }}>
        <input
          type="number"
          placeholder={placeholder}
          value={filters[key]}
          onChange={(e) => onChange({ [key]: e.target.value })}
          style={{
            width: "100%", background: "var(--surface-card-elevated)", color: "var(--text-primary)",
            border: `1px solid ${active ? "var(--primary-glow)" : "var(--hairline)"}`,
            borderRadius: "var(--radius-control)", height: 40, padding: "0 32px 0 12px",
            fontSize: 14, boxSizing: "border-box",
          }}
        />
        {active && (
          <button
            onClick={() => onChange({ [key]: "" })}
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0, display: "flex" }}
          >
            <IconX size={14} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {field(keyMin, `${prefix}${labelMin}${suffix}`, activeMin)}
      <span style={{ color: "var(--text-muted)", fontSize: 14, flexShrink: 0 }}>-</span>
      {field(keyMax, `${prefix}${labelMax}${suffix}`, activeMax)}
    </div>
  );
}

function CheckItem({ label, field, filters, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "4px 0" }}>
      <span
        style={{
          width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${filters[field] ? "var(--primary-glow)" : "var(--hairline-strong)"}`,
          background: filters[field] ? "var(--primary-glow)" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s",
        }}
        onClick={() => onChange({ [field]: !filters[field] })}
      >
        {filters[field] && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span style={{ fontSize: 14, color: filters[field] ? "var(--text-primary)" : "var(--text-muted)" }}>{label}</span>
    </label>
  );
}

function ModeButtons({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(value === opt.value ? null : opt.value)}
          style={{
            height: 36, padding: "0 14px", borderRadius: "var(--radius-control)", fontSize: 13, fontWeight: 500,
            border: `1px solid ${value === opt.value ? "var(--primary-glow)" : "var(--hairline-strong)"}`,
            background: value === opt.value ? "rgba(26,38,255,0.15)" : "var(--surface-card-elevated)",
            color: value === opt.value ? "var(--primary-glow)" : "var(--text-muted)",
            cursor: "pointer", transition: "all 0.15s",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--hairline)", margin: "16px 0" }} />;
}

// ── main component ─────────────────────────────────────────────────────────────

export default function FilterDrawer({ open, onClose, onApply }) {
  const [filters, setFilters] = useState(loadActiveFilters);
  const [presets, setPresets] = useState(loadPresets);
  const [activePreset, setActivePreset] = useState("Default");

  useEffect(() => {
    localStorage.setItem(ACTIVE_FILTERS_KEY, JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  }, [presets]);

  const patch = useCallback((partial) => setFilters((f) => ({ ...f, ...partial })), []);

  function clearAll() {
    setFilters({ ...DEFAULT_FILTERS });
    setActivePreset("Default");
  }

  function savePreset() {
    const name = window.prompt("Nama preset:");
    if (!name || !name.trim()) return;
    const updated = [...presets.filter((p) => p.name !== name.trim()), { name: name.trim(), filters: { ...filters } }];
    setPresets(updated);
  }

  function loadPreset(name) {
    if (name === "Default") { clearAll(); return; }
    const p = presets.find((x) => x.name === name);
    if (p) { setFilters({ ...DEFAULT_FILTERS, ...p.filters }); setActivePreset(name); }
  }

  function apply() {
    onApply?.(filters);
    onClose();
  }

  const activeCount = countActive(filters);

  if (!open) return null;

  return (
    <>
      {/* backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }}
      />

      {/* drawer */}
      <div
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: 360, zIndex: 50,
          background: "var(--surface-card)", borderLeft: "1px solid var(--hairline-strong)",
          display: "flex", flexDirection: "column", overflowY: "auto",
        }}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--hairline)", position: "sticky", top: 0, background: "var(--surface-card)", zIndex: 1 }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Filter by</span>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button onClick={clearAll} style={{ background: "none", border: "none", color: "var(--primary-glow)", fontSize: 14, fontWeight: 500, cursor: "pointer", padding: 0 }}>Clear all</button>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0, display: "flex" }}>
              <IconX size={20} />
            </button>
          </div>
        </div>

        {/* body */}
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>

          {/* Presets */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Presets</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{presets.length + 1}/5</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[{ name: "Default" }, ...presets].map((p) => (
                <button
                  key={p.name}
                  onClick={() => { loadPreset(p.name); setActivePreset(p.name); }}
                  style={{
                    height: 36, padding: "0 14px", borderRadius: "var(--radius-control)", fontSize: 13, fontWeight: 600,
                    border: `1.5px solid ${activePreset === p.name ? "var(--primary-glow)" : "var(--hairline-strong)"}`,
                    background: activePreset === p.name ? "rgba(26,38,255,0.15)" : "transparent",
                    color: activePreset === p.name ? "var(--primary-glow)" : "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  {p.name}
                </button>
              ))}
              {presets.length < 4 && (
                <button
                  onClick={savePreset}
                  style={{ width: 36, height: 36, borderRadius: "var(--radius-control)", border: "1.5px solid var(--hairline-strong)", background: "transparent", color: "var(--text-muted)", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  +
                </button>
              )}
            </div>
          </div>

          <Divider />

          {/* Token Details */}
          <div>
            <SectionLabel>Token Details</SectionLabel>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <GroupLabel>Token flags</GroupLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <CheckItem label="No High Supply Concentration" field="excludeHighSupplyConcentration" filters={filters} onChange={patch} />
                  <CheckItem label="No High Single Ownership" field="noHighSingleOwnership" filters={filters} onChange={patch} />
                </div>
              </div>

              <div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Jupiter Organic Score</div>
                <RangeRow labelMin="Min" labelMax="Max" keyMin="organicScoreMin" keyMax="organicScoreMax" filters={filters} onChange={patch} />
              </div>

              <div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Market Cap</div>
                <RangeRow labelMin="Min $" labelMax="Max $" keyMin="mcapMin" keyMax="mcapMax" filters={filters} onChange={patch} />
              </div>

              <div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Token Age (Hours)</div>
                <RangeRow labelMin="Min" labelMax="Max" keyMin="tokenAgeMin" keyMax="tokenAgeMax" filters={filters} onChange={patch} />
              </div>

              <div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Holders</div>
                <RangeRow labelMin="Min" labelMax="Max" keyMin="holdersMin" keyMax="holdersMax" filters={filters} onChange={patch} />
              </div>

              <div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Top 10 Holders</div>
                <RangeRow labelMin="Min %" labelMax="Max %" keyMin="top10PctMin" keyMax="top10PctMax" filters={filters} onChange={patch} />
              </div>
            </div>
          </div>

          <Divider />

          {/* Pool Details */}
          <div>
            <SectionLabel>Pool Details</SectionLabel>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Pool Age (Hours)</div>
                <RangeRow labelMin="Min" labelMax="Max" keyMin="poolAgeMin" keyMax="poolAgeMax" filters={filters} onChange={patch} />
              </div>

              <div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Volume</div>
                <RangeRow labelMin="Min $" labelMax="Max $" keyMin="volumeMin" keyMax="volumeMax" filters={filters} onChange={patch} />
              </div>

              <div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Fees</div>
                <RangeRow labelMin="Min $" labelMax="Max $" keyMin="feesMin" keyMax="feesMax" filters={filters} onChange={patch} />
              </div>

              <div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Fees / TVL %</div>
                <RangeRow labelMin="Min %" labelMax="Max %" keyMin="feeTvlPctMin" keyMax="feeTvlPctMax" filters={filters} onChange={patch} />
              </div>

              <div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>TVL</div>
                <RangeRow labelMin="Min $" labelMax="Max $" keyMin="tvlMin" keyMax="tvlMax" filters={filters} onChange={patch} />
              </div>

              <div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Base Fee</div>
                <RangeRow labelMin="Min %" labelMax="Max %" keyMin="baseFeePctMin" keyMax="baseFeePctMax" filters={filters} onChange={patch} />
              </div>
            </div>
          </div>

          <Divider />

          {/* DLMM */}
          <div>
            <SectionLabel>DLMM</SectionLabel>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Bin Step</div>
                <RangeRow labelMin="Min" labelMax="Max" keyMin="binStepMin" keyMax="binStepMax" filters={filters} onChange={patch} />
              </div>

              <div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Fee Collection Mode</div>
                <ModeButtons
                  value={filters.feeCollectionMode}
                  onChange={(v) => patch({ feeCollectionMode: v })}
                  options={[
                    { value: "quote", label: "Quote" },
                    { value: "quote_base", label: "Quote + Base" },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>

        {/* footer */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--hairline)", position: "sticky", bottom: 0, background: "var(--surface-card)" }}>
          <button
            onClick={apply}
            className="btn btn-primary"
            style={{ width: "100%", fontWeight: 600 }}
          >
            Terapkan{activeCount > 0 ? ` (${activeCount})` : ""}
          </button>
        </div>
      </div>
    </>
  );
}
