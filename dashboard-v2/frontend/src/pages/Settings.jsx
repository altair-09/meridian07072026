import { useState, useEffect } from "react";
import BotSelector from "../components/BotSelector";
import InfoDot from "../components/InfoDot";
import { configHelp } from "../mock/configHelp";
import { api, apiFetch } from "../api";

// ── Default config matching user-config.example.json ──────────────────────────
const DEFAULT_CONFIG = {
  preset: "custom",
  rpcUrl: "https://pump.helius-rpc.com",
  llmBaseUrl: "",
  llmApiKey: "",
  llmModel: "minimax/minimax-m2.7",
  dryRun: true,

  deployAmountSol: 0.5,
  maxPositions: 3,
  minSolToOpen: 0.55,
  maxDeployAmount: 50,
  gasReserve: 0.2,
  positionSizePct: 0.35,

  strategy: "bid_ask",
  minBinsBelow: 35,
  maxBinsBelow: 69,
  defaultBinsBelow: 69,

  timeframe: "5m",
  category: "trending",
  excludeHighSupplyConcentration: true,
  minTvl: 10000,
  maxTvl: 150000,
  minVolume: 500,
  minOrganic: 60,
  minQuoteOrganic: 60,
  minHolders: 500,
  minMcap: 150000,
  maxMcap: 10000000,
  minBinStep: 80,
  maxBinStep: 125,
  minFeeActiveTvlRatio: 0.05,
  minTokenFeesSol: 30,
  useDiscordSignals: false,
  discordSignalMode: "merge",
  avoidPvpSymbols: true,
  blockPvpSymbols: false,
  maxBotHoldersPct: 30,
  maxTop10Pct: 60,
  allowedLaunchpads: [],
  blockedLaunchpads: [],
  minTokenAgeHours: null,
  maxTokenAgeHours: null,

  minClaimAmount: 5,
  autoSwapAfterClaim: false,
  outOfRangeBinsToClose: 10,
  outOfRangeWaitMinutes: 30,
  oorCooldownTriggerCount: 3,
  oorCooldownHours: 12,
  minVolumeToRebalance: 1000,
  stopLossPct: -50,
  takeProfitPct: 5,
  minFeePerTvl24h: 7,
  minAgeBeforeYieldCheck: 60,
  trailingTakeProfit: true,
  trailingTriggerPct: 3,
  trailingDropPct: 1.5,
  pnlSanityMaxDiffPct: 5,
  solMode: false,
  repeatDeployCooldownEnabled: true,
  repeatDeployCooldownTriggerCount: 3,
  repeatDeployCooldownHours: 12,

  managementIntervalMin: 10,
  screeningIntervalMin: 30,
  healthCheckIntervalMin: 60,

  temperature: 0.373,
  maxTokens: 4096,
  maxSteps: 20,
  managementModel: "minimax/minimax-m2.5",
  screeningModel: "minimax/minimax-m2.5",
  generalModel: "minimax/minimax-m2.7",

  darwinEnabled: true,
  darwinWindowDays: 60,
  darwinRecalcEvery: 5,
  darwinBoost: 1.05,
  darwinDecay: 0.95,
  darwinFloor: 0.3,
  darwinCeiling: 2.5,
  darwinMinSamples: 10,

  agentId: "",
  publicApiKey: "",
  agentMeridianApiUrl: "https://api.agentmeridian.xyz/api",
  lpAgentRelayEnabled: false,

  pnlSource: "rpc",
  pnlRpcUrl: "https://pump.helius-rpc.com",
  pnlPollIntervalSec: 3,
  pnlDepositCacheTtlSec: 300,

  gmgnFeeSource: "gmgn",
  gmgnApiKey: "",

  chartIndicatorsEnabled: false,
  chartIndicatorsEntryPreset: "supertrend_break",
  chartIndicatorsExitPreset: "supertrend_break",
  chartIndicatorsRsiLength: 2,
  chartIndicatorsIntervals: "5_MINUTE",
  chartIndicatorsCandles: 298,
  chartIndicatorsRsiOversold: 30,
  chartIndicatorsRsiOverbought: 80,
  chartIndicatorsRequireAllIntervals: false,

  telegramChatId: "",
  hiveMindUrl: "",
  hiveMindApiKey: "",
  hiveMindPullMode: "auto",
};

// ── Field components ────────────────────────────────────────────────────────────

const INPUT_STYLE = {
  height: 34, padding: "0 10px", flexShrink: 0,
  background: "#1e2130", border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 6, color: "#e8eaf0", fontSize: 13,
  outline: "none",
};

function Field({ label, helpKey, children, mono }) {
  const help = configHelp[helpKey ?? label] ?? "Tidak ada keterangan.";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)",
      minHeight: 44,
    }}>
      <label style={{
        flex: 1, fontSize: 13, color: "#c8ccd8",
        fontFamily: mono ? "var(--font-mono, monospace)" : "inherit",
      }}>{label}</label>
      <InfoDot text={help} />
      {children}
    </div>
  );
}

function TextInput({ value, onChange, width = 200, placeholder = "", type = "text", mono }) {
  return (
    <input
      type={type}
      value={value ?? ""}
      placeholder={placeholder || "—"}
      onChange={(e) => onChange(e.target.value)}
      style={{
        ...INPUT_STYLE, width,
        fontFamily: mono ? "var(--font-mono, monospace)" : "inherit",
      }}
    />
  );
}

function NumInput({ value, onChange, width = 100, min, max, step = 1 }) {
  return (
    <input
      type="number"
      value={value ?? ""}
      min={min} max={max} step={step}
      placeholder="null"
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      style={{ ...INPUT_STYLE, width }}
    />
  );
}

function Toggle({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, flexShrink: 0, cursor: "pointer",
        background: checked ? "#1a26ff" : "rgba(255,255,255,0.15)",
        position: "relative", transition: "background 0.2s",
        border: "1px solid rgba(255,255,255,0.2)",
      }}
    >
      <div style={{
        position: "absolute", top: 2, left: checked ? 22 : 2,
        width: 18, height: 18, borderRadius: "50%", background: "#fff",
        transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
      }} />
    </div>
  );
}

function SelectInput({ value, onChange, options, width = 130 }) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...INPUT_STYLE, width, paddingRight: 6 }}
    >
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

function SectionCard({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 10,
      overflow: "hidden",
      background: "#13151f",
      flexShrink: 0,
    }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "#1a1d2e", border: "none", cursor: "pointer",
          padding: "13px 18px",
          borderBottom: open ? "1px solid rgba(255,255,255,0.1)" : "none",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", letterSpacing: "0.03em" }}>{title}</span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && <div style={{ padding: "4px 18px 14px" }}>{children}</div>}
    </div>
  );
}

// ── Preset badge ────────────────────────────────────────────────────────────────

const INDICATOR_PRESETS = [
  ["supertrend_break", "supertrend_break"],
  ["rsi_reversal", "rsi_reversal"],
  ["bollinger_reversion", "bollinger_reversion"],
  ["rsi_plus_supertrend", "rsi_plus_supertrend"],
  ["supertrend_or_rsi", "supertrend_or_rsi"],
  ["bb_plus_rsi", "bb_plus_rsi"],
  ["fibo_reclaim", "fibo_reclaim"],
  ["fibo_reject", "fibo_reject"],
];

// ── Main component ──────────────────────────────────────────────────────────────

export default function Settings() {
  const [bot, setBot] = useState("bot-1");
  const [cfg, setCfg] = useState(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.config().then((data) => {
      if (data && typeof data === "object") {
        setCfg((prev) => ({ ...prev, ...data }));
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const set = (key) => (val) => {
    setCfg((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
    setSaveError(null);
  };

  async function handleSave() {
    setSaveError(null);
    try {
      await apiFetch("/api/config", {
        method: "POST",
        body: JSON.stringify(cfg),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setSaveError(e.message);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", padding: "var(--space-6)", overflowY: "auto", flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <h1 className="t-display-sm">Settings</h1>
        <BotSelector value={bot} onChange={setBot} includeAll={false} />
      </div>

      {/* ── General ── */}
      <SectionCard title="General">
        <Field label="preset" helpKey="preset">
          <SelectInput value={cfg.preset} onChange={set("preset")} options={[["custom","custom"],["degen","degen"],["moderate","moderate"],["safe","safe"]]} />
        </Field>
        <Field label="rpcUrl" helpKey="rpcUrl">
          <TextInput value={cfg.rpcUrl} onChange={set("rpcUrl")} width={260} mono />
        </Field>
        <Field label="dryRun" helpKey="dryRun">
          <Toggle checked={cfg.dryRun} onChange={set("dryRun")} />
        </Field>
        <Field label="llmBaseUrl" helpKey="llmBaseUrl">
          <TextInput value={cfg.llmBaseUrl} onChange={set("llmBaseUrl")} width={260} placeholder="(OpenRouter default)" mono />
        </Field>
        <Field label="llmApiKey" helpKey="llmApiKey">
          <TextInput value={cfg.llmApiKey} onChange={set("llmApiKey")} width={260} type="password" placeholder="sk-..." />
        </Field>
        <Field label="llmModel" helpKey="llmModel">
          <TextInput value={cfg.llmModel} onChange={set("llmModel")} width={220} mono />
        </Field>
        <div className="t-caption text-muted" style={{ paddingTop: 8 }}>
          WALLET_PRIVATE_KEY / secret keys — edit via SSH saja, tidak ada form di sini.
        </div>
      </SectionCard>

      {/* ── Position Sizing ── */}
      <SectionCard title="Position sizing & risk">
        <Field label="maxPositions" helpKey="maxPositions">
          <NumInput value={cfg.maxPositions} onChange={set("maxPositions")} width={80} min={1} max={20} />
        </Field>
        <Field label="deployAmountSol" helpKey="deployAmountSol">
          <NumInput value={cfg.deployAmountSol} onChange={set("deployAmountSol")} width={100} min={0} step={0.1} />
        </Field>
        <Field label="maxDeployAmount" helpKey="maxDeployAmount">
          <NumInput value={cfg.maxDeployAmount} onChange={set("maxDeployAmount")} width={100} min={0} step={1} />
        </Field>
        <Field label="gasReserve" helpKey="gasReserve">
          <NumInput value={cfg.gasReserve} onChange={set("gasReserve")} width={100} min={0} step={0.05} />
        </Field>
        <Field label="minSolToOpen" helpKey="minSolToOpen">
          <NumInput value={cfg.minSolToOpen} onChange={set("minSolToOpen")} width={100} min={0} step={0.05} />
        </Field>
        <Field label="positionSizePct" helpKey="positionSizePct">
          <NumInput value={cfg.positionSizePct} onChange={set("positionSizePct")} width={100} min={0} max={1} step={0.01} />
        </Field>
      </SectionCard>

      {/* ── Strategy & Range ── */}
      <SectionCard title="Strategy & range">
        <Field label="strategy" helpKey="strategy">
          <SelectInput value={cfg.strategy} onChange={set("strategy")} options={[["bid_ask","bid_ask"],["curve","curve"],["spot","spot"]]} />
        </Field>
        <Field label="minBinsBelow" helpKey="minBinsBelow">
          <NumInput value={cfg.minBinsBelow} onChange={set("minBinsBelow")} width={80} min={35} max={69} />
        </Field>
        <Field label="maxBinsBelow" helpKey="maxBinsBelow">
          <NumInput value={cfg.maxBinsBelow} onChange={set("maxBinsBelow")} width={80} min={35} max={69} />
        </Field>
        <Field label="defaultBinsBelow" helpKey="defaultBinsBelow">
          <NumInput value={cfg.defaultBinsBelow} onChange={set("defaultBinsBelow")} width={80} min={35} max={69} />
        </Field>
      </SectionCard>

      {/* ── Screening ── */}
      <SectionCard title="Screening">
        <Field label="timeframe" helpKey="timeframe">
          <SelectInput value={cfg.timeframe} onChange={set("timeframe")} options={[["5m","5m"],["30m","30m"],["1h","1h"],["2h","2h"],["4h","4h"],["12h","12h"],["24h","24h"]]} />
        </Field>
        <Field label="category" helpKey="category">
          <TextInput value={cfg.category} onChange={set("category")} width={130} />
        </Field>
        <Field label="excludeHighSupplyConcentration" helpKey="excludeHighSupplyConcentration">
          <Toggle checked={cfg.excludeHighSupplyConcentration} onChange={set("excludeHighSupplyConcentration")} />
        </Field>
        <Field label="minTvl" helpKey="minTvl">
          <NumInput value={cfg.minTvl} onChange={set("minTvl")} width={120} min={0} step={1000} />
        </Field>
        <Field label="maxTvl" helpKey="maxTvl">
          <NumInput value={cfg.maxTvl} onChange={set("maxTvl")} width={120} min={0} step={10000} />
        </Field>
        <Field label="minVolume" helpKey="minVolume">
          <NumInput value={cfg.minVolume} onChange={set("minVolume")} width={120} min={0} step={100} />
        </Field>
        <Field label="minOrganic" helpKey="minOrganic">
          <NumInput value={cfg.minOrganic} onChange={set("minOrganic")} width={80} min={0} max={100} />
        </Field>
        <Field label="minQuoteOrganic" helpKey="minQuoteOrganic">
          <NumInput value={cfg.minQuoteOrganic} onChange={set("minQuoteOrganic")} width={80} min={0} max={100} />
        </Field>
        <Field label="minHolders" helpKey="minHolders">
          <NumInput value={cfg.minHolders} onChange={set("minHolders")} width={100} min={0} step={50} />
        </Field>
        <Field label="minMcap" helpKey="minMcap">
          <NumInput value={cfg.minMcap} onChange={set("minMcap")} width={120} min={0} step={10000} />
        </Field>
        <Field label="maxMcap" helpKey="maxMcap">
          <NumInput value={cfg.maxMcap} onChange={set("maxMcap")} width={120} min={0} step={100000} />
        </Field>
        <Field label="minBinStep" helpKey="minBinStep">
          <NumInput value={cfg.minBinStep} onChange={set("minBinStep")} width={80} min={1} />
        </Field>
        <Field label="maxBinStep" helpKey="maxBinStep">
          <NumInput value={cfg.maxBinStep} onChange={set("maxBinStep")} width={80} min={1} />
        </Field>
        <Field label="minFeeActiveTvlRatio" helpKey="minFeeActiveTvlRatio">
          <NumInput value={cfg.minFeeActiveTvlRatio} onChange={set("minFeeActiveTvlRatio")} width={100} min={0} step={0.01} />
        </Field>
        <Field label="minTokenFeesSol" helpKey="minTokenFeesSol">
          <NumInput value={cfg.minTokenFeesSol} onChange={set("minTokenFeesSol")} width={100} min={0} step={1} />
        </Field>
        <Field label="maxBotHoldersPct" helpKey="maxBotHoldersPct">
          <NumInput value={cfg.maxBotHoldersPct} onChange={set("maxBotHoldersPct")} width={80} min={0} max={100} />
        </Field>
        <Field label="maxTop10Pct" helpKey="maxTop10Pct">
          <NumInput value={cfg.maxTop10Pct} onChange={set("maxTop10Pct")} width={80} min={0} max={100} />
        </Field>
        <Field label="avoidPvpSymbols" helpKey="avoidPvpSymbols">
          <Toggle checked={cfg.avoidPvpSymbols} onChange={set("avoidPvpSymbols")} />
        </Field>
        <Field label="blockPvpSymbols" helpKey="blockPvpSymbols">
          <Toggle checked={cfg.blockPvpSymbols} onChange={set("blockPvpSymbols")} />
        </Field>
        <Field label="useDiscordSignals" helpKey="useDiscordSignals">
          <Toggle checked={cfg.useDiscordSignals} onChange={set("useDiscordSignals")} />
        </Field>
        <Field label="discordSignalMode" helpKey="discordSignalMode">
          <SelectInput value={cfg.discordSignalMode} onChange={set("discordSignalMode")} options={[["merge","merge"],["only","only"]]} />
        </Field>
        <Field label="allowedLaunchpads" helpKey="allowedLaunchpads">
          <TextInput
            value={cfg.allowedLaunchpads.join(",")}
            onChange={(v) => set("allowedLaunchpads")(v ? v.split(",").map(s => s.trim()) : [])}
            width={200} placeholder="kosong = semua" mono
          />
        </Field>
        <Field label="blockedLaunchpads" helpKey="blockedLaunchpads">
          <TextInput
            value={cfg.blockedLaunchpads.join(",")}
            onChange={(v) => set("blockedLaunchpads")(v ? v.split(",").map(s => s.trim()) : [])}
            width={200} placeholder="pisah koma" mono
          />
        </Field>
        <Field label="minTokenAgeHours" helpKey="minTokenAgeHours">
          <NumInput value={cfg.minTokenAgeHours} onChange={set("minTokenAgeHours")} width={100} min={0} placeholder="null" />
        </Field>
        <Field label="maxTokenAgeHours" helpKey="maxTokenAgeHours">
          <NumInput value={cfg.maxTokenAgeHours} onChange={set("maxTokenAgeHours")} width={100} min={0} placeholder="null" />
        </Field>
      </SectionCard>

      {/* ── Management ── */}
      <SectionCard title="Management">
        <Field label="minClaimAmount" helpKey="minClaimAmount">
          <NumInput value={cfg.minClaimAmount} onChange={set("minClaimAmount")} width={100} min={0} step={0.5} />
        </Field>
        <Field label="autoSwapAfterClaim" helpKey="autoSwapAfterClaim">
          <Toggle checked={cfg.autoSwapAfterClaim} onChange={set("autoSwapAfterClaim")} />
        </Field>
        <Field label="outOfRangeBinsToClose" helpKey="outOfRangeBinsToClose">
          <NumInput value={cfg.outOfRangeBinsToClose} onChange={set("outOfRangeBinsToClose")} width={80} min={1} />
        </Field>
        <Field label="outOfRangeWaitMinutes" helpKey="outOfRangeWaitMinutes">
          <NumInput value={cfg.outOfRangeWaitMinutes} onChange={set("outOfRangeWaitMinutes")} width={80} min={1} />
        </Field>
        <Field label="oorCooldownTriggerCount" helpKey="oorCooldownTriggerCount">
          <NumInput value={cfg.oorCooldownTriggerCount} onChange={set("oorCooldownTriggerCount")} width={80} min={1} />
        </Field>
        <Field label="oorCooldownHours" helpKey="oorCooldownHours">
          <NumInput value={cfg.oorCooldownHours} onChange={set("oorCooldownHours")} width={80} min={0} />
        </Field>
        <Field label="minVolumeToRebalance" helpKey="minVolumeToRebalance">
          <NumInput value={cfg.minVolumeToRebalance} onChange={set("minVolumeToRebalance")} width={100} min={0} step={100} />
        </Field>
        <Field label="stopLossPct" helpKey="stopLossPct">
          <NumInput value={cfg.stopLossPct} onChange={set("stopLossPct")} width={100} max={0} step={1} />
        </Field>
        <Field label="takeProfitPct" helpKey="takeProfitPct">
          <NumInput value={cfg.takeProfitPct} onChange={set("takeProfitPct")} width={100} min={0} step={0.5} />
        </Field>
        <Field label="minFeePerTvl24h" helpKey="minFeePerTvl24h">
          <NumInput value={cfg.minFeePerTvl24h} onChange={set("minFeePerTvl24h")} width={100} min={0} step={0.5} />
        </Field>
        <Field label="minAgeBeforeYieldCheck" helpKey="minAgeBeforeYieldCheck">
          <NumInput value={cfg.minAgeBeforeYieldCheck} onChange={set("minAgeBeforeYieldCheck")} width={100} min={0} step={5} />
        </Field>
        <Field label="trailingTakeProfit" helpKey="trailingTakeProfit">
          <Toggle checked={cfg.trailingTakeProfit} onChange={set("trailingTakeProfit")} />
        </Field>
        <Field label="trailingTriggerPct" helpKey="trailingTriggerPct">
          <NumInput value={cfg.trailingTriggerPct} onChange={set("trailingTriggerPct")} width={100} min={0} step={0.5} />
        </Field>
        <Field label="trailingDropPct" helpKey="trailingDropPct">
          <NumInput value={cfg.trailingDropPct} onChange={set("trailingDropPct")} width={100} min={0} step={0.1} />
        </Field>
        <Field label="pnlSanityMaxDiffPct" helpKey="pnlSanityMaxDiffPct">
          <NumInput value={cfg.pnlSanityMaxDiffPct} onChange={set("pnlSanityMaxDiffPct")} width={100} min={0} step={1} />
        </Field>
        <Field label="solMode" helpKey="solMode">
          <Toggle checked={cfg.solMode} onChange={set("solMode")} />
        </Field>
        <Field label="repeatDeployCooldownEnabled" helpKey="repeatDeployCooldownEnabled">
          <Toggle checked={cfg.repeatDeployCooldownEnabled} onChange={set("repeatDeployCooldownEnabled")} />
        </Field>
        <Field label="repeatDeployCooldownTriggerCount" helpKey="repeatDeployCooldownTriggerCount">
          <NumInput value={cfg.repeatDeployCooldownTriggerCount} onChange={set("repeatDeployCooldownTriggerCount")} width={80} min={1} />
        </Field>
        <Field label="repeatDeployCooldownHours" helpKey="repeatDeployCooldownHours">
          <NumInput value={cfg.repeatDeployCooldownHours} onChange={set("repeatDeployCooldownHours")} width={80} min={0} />
        </Field>
      </SectionCard>

      {/* ── Schedule ── */}
      <SectionCard title="Schedule">
        <Field label="managementIntervalMin" helpKey="managementIntervalMin">
          <NumInput value={cfg.managementIntervalMin} onChange={set("managementIntervalMin")} width={80} min={1} />
        </Field>
        <Field label="screeningIntervalMin" helpKey="screeningIntervalMin">
          <NumInput value={cfg.screeningIntervalMin} onChange={set("screeningIntervalMin")} width={80} min={1} />
        </Field>
        <Field label="healthCheckIntervalMin" helpKey="healthCheckIntervalMin">
          <NumInput value={cfg.healthCheckIntervalMin} onChange={set("healthCheckIntervalMin")} width={80} min={1} />
        </Field>
      </SectionCard>

      {/* ── LLM & Models ── */}
      <SectionCard title="LLM & models">
        <Field label="managementModel" helpKey="managementModel">
          <TextInput value={cfg.managementModel} onChange={set("managementModel")} width={240} mono />
        </Field>
        <Field label="screeningModel" helpKey="screeningModel">
          <TextInput value={cfg.screeningModel} onChange={set("screeningModel")} width={240} mono />
        </Field>
        <Field label="generalModel" helpKey="generalModel">
          <TextInput value={cfg.generalModel} onChange={set("generalModel")} width={240} mono />
        </Field>
        <Field label="temperature" helpKey="temperature">
          <NumInput value={cfg.temperature} onChange={set("temperature")} width={90} min={0} max={2} step={0.01} />
        </Field>
        <Field label="maxTokens" helpKey="maxTokens">
          <NumInput value={cfg.maxTokens} onChange={set("maxTokens")} width={100} min={256} step={256} />
        </Field>
        <Field label="maxSteps" helpKey="maxSteps">
          <NumInput value={cfg.maxSteps} onChange={set("maxSteps")} width={80} min={1} max={50} />
        </Field>
      </SectionCard>

      {/* ── Darwin ── */}
      <SectionCard title="Darwin (signal weighting)">
        <Field label="darwinEnabled" helpKey="darwinEnabled">
          <Toggle checked={cfg.darwinEnabled} onChange={set("darwinEnabled")} />
        </Field>
        <Field label="darwinWindowDays" helpKey="darwinWindowDays">
          <NumInput value={cfg.darwinWindowDays} onChange={set("darwinWindowDays")} width={80} min={1} />
        </Field>
        <Field label="darwinRecalcEvery" helpKey="darwinRecalcEvery">
          <NumInput value={cfg.darwinRecalcEvery} onChange={set("darwinRecalcEvery")} width={80} min={1} />
        </Field>
        <Field label="darwinBoost" helpKey="darwinBoost">
          <NumInput value={cfg.darwinBoost} onChange={set("darwinBoost")} width={90} min={1} max={2} step={0.01} />
        </Field>
        <Field label="darwinDecay" helpKey="darwinDecay">
          <NumInput value={cfg.darwinDecay} onChange={set("darwinDecay")} width={90} min={0} max={1} step={0.01} />
        </Field>
        <Field label="darwinFloor" helpKey="darwinFloor">
          <NumInput value={cfg.darwinFloor} onChange={set("darwinFloor")} width={90} min={0} max={1} step={0.05} />
        </Field>
        <Field label="darwinCeiling" helpKey="darwinCeiling">
          <NumInput value={cfg.darwinCeiling} onChange={set("darwinCeiling")} width={90} min={1} max={5} step={0.1} />
        </Field>
        <Field label="darwinMinSamples" helpKey="darwinMinSamples">
          <NumInput value={cfg.darwinMinSamples} onChange={set("darwinMinSamples")} width={80} min={1} />
        </Field>
      </SectionCard>

      {/* ── Agent Meridian / API ── */}
      <SectionCard title="Agent Meridian & API" defaultOpen={false}>
        <Field label="agentId" helpKey="agentId">
          <TextInput value={cfg.agentId} onChange={set("agentId")} width={240} placeholder="(auto-generated)" mono />
        </Field>
        <Field label="publicApiKey" helpKey="publicApiKey">
          <TextInput value={cfg.publicApiKey} onChange={set("publicApiKey")} width={240} mono />
        </Field>
        <Field label="agentMeridianApiUrl" helpKey="agentMeridianApiUrl">
          <TextInput value={cfg.agentMeridianApiUrl} onChange={set("agentMeridianApiUrl")} width={260} mono />
        </Field>
        <Field label="lpAgentRelayEnabled" helpKey="lpAgentRelayEnabled">
          <Toggle checked={cfg.lpAgentRelayEnabled} onChange={set("lpAgentRelayEnabled")} />
        </Field>
      </SectionCard>

      {/* ── PnL Source ── */}
      <SectionCard title="PnL source" defaultOpen={false}>
        <Field label="pnlSource" helpKey="pnlSource">
          <SelectInput value={cfg.pnlSource} onChange={set("pnlSource")} options={[["rpc","rpc"],["gmgn","gmgn"]]} />
        </Field>
        <Field label="pnlRpcUrl" helpKey="pnlRpcUrl">
          <TextInput value={cfg.pnlRpcUrl} onChange={set("pnlRpcUrl")} width={260} mono />
        </Field>
        <Field label="pnlPollIntervalSec" helpKey="pnlPollIntervalSec">
          <NumInput value={cfg.pnlPollIntervalSec} onChange={set("pnlPollIntervalSec")} width={80} min={1} />
        </Field>
        <Field label="pnlDepositCacheTtlSec" helpKey="pnlDepositCacheTtlSec">
          <NumInput value={cfg.pnlDepositCacheTtlSec} onChange={set("pnlDepositCacheTtlSec")} width={80} min={0} step={60} />
        </Field>
        <Field label="gmgnFeeSource" helpKey="gmgnFeeSource">
          <SelectInput value={cfg.gmgnFeeSource} onChange={set("gmgnFeeSource")} options={[["gmgn","gmgn"],["meteora","meteora"]]} />
        </Field>
        <Field label="gmgnApiKey" helpKey="gmgnApiKey">
          <TextInput value={cfg.gmgnApiKey} onChange={set("gmgnApiKey")} width={220} type="password" placeholder="(opsional)" />
        </Field>
      </SectionCard>

      {/* ── Chart Indicators ── */}
      <SectionCard title="Chart indicators" defaultOpen={false}>
        <Field label="enabled" helpKey="chartIndicators.enabled">
          <Toggle checked={cfg.chartIndicatorsEnabled} onChange={set("chartIndicatorsEnabled")} />
        </Field>
        <Field label="entryPreset" helpKey="chartIndicators.entryPreset">
          <SelectInput value={cfg.chartIndicatorsEntryPreset} onChange={set("chartIndicatorsEntryPreset")} options={INDICATOR_PRESETS} width={200} />
        </Field>
        <Field label="exitPreset" helpKey="chartIndicators.exitPreset">
          <SelectInput value={cfg.chartIndicatorsExitPreset} onChange={set("chartIndicatorsExitPreset")} options={INDICATOR_PRESETS} width={200} />
        </Field>
        <Field label="rsiLength" helpKey="chartIndicators.rsiLength">
          <NumInput value={cfg.chartIndicatorsRsiLength} onChange={set("chartIndicatorsRsiLength")} width={80} min={1} />
        </Field>
        <Field label="intervals" helpKey="chartIndicators.intervals">
          <TextInput value={cfg.chartIndicatorsIntervals} onChange={set("chartIndicatorsIntervals")} width={180} placeholder="5_MINUTE,1_HOUR" mono />
        </Field>
        <Field label="candles" helpKey="chartIndicators.candles">
          <NumInput value={cfg.chartIndicatorsCandles} onChange={set("chartIndicatorsCandles")} width={80} min={50} step={50} />
        </Field>
        <Field label="rsiOversold" helpKey="chartIndicators.rsiOversold">
          <NumInput value={cfg.chartIndicatorsRsiOversold} onChange={set("chartIndicatorsRsiOversold")} width={80} min={0} max={50} />
        </Field>
        <Field label="rsiOverbought" helpKey="chartIndicators.rsiOverbought">
          <NumInput value={cfg.chartIndicatorsRsiOverbought} onChange={set("chartIndicatorsRsiOverbought")} width={80} min={50} max={100} />
        </Field>
        <Field label="requireAllIntervals" helpKey="chartIndicators.requireAllIntervals">
          <Toggle checked={cfg.chartIndicatorsRequireAllIntervals} onChange={set("chartIndicatorsRequireAllIntervals")} />
        </Field>
      </SectionCard>

      {/* ── HiveMind & Telegram ── */}
      <SectionCard title="HiveMind & Telegram" defaultOpen={false}>
        <Field label="hiveMindPullMode" helpKey="hiveMindPullMode">
          <SelectInput value={cfg.hiveMindPullMode} onChange={set("hiveMindPullMode")} options={[["auto","auto"],["manual","manual"]]} />
        </Field>
        <Field label="hiveMindUrl" helpKey="hiveMindUrl">
          <TextInput value={cfg.hiveMindUrl} onChange={set("hiveMindUrl")} width={260} placeholder="(default)" mono />
        </Field>
        <Field label="hiveMindApiKey" helpKey="hiveMindApiKey">
          <TextInput value={cfg.hiveMindApiKey} onChange={set("hiveMindApiKey")} width={220} type="password" placeholder="(bawaan tersedia)" />
        </Field>
        <div className="t-caption text-muted" style={{ paddingTop: 6 }}>
          HiveMind selalu push aktif — tidak ada toggle disable. Set pullMode ke manual untuk matikan pull otomatis.
        </div>
        <Field label="telegramChatId" helpKey="telegramChatId">
          <TextInput value={cfg.telegramChatId} onChange={set("telegramChatId")} width={180} placeholder="(auto dari bot)" mono />
        </Field>
      </SectionCard>

      {/* ── Save ── */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn btn-primary" style={{ minWidth: 100 }} onClick={handleSave} disabled={loading}>
          {loading ? "Memuat..." : saved ? "✓ Tersimpan" : "Simpan"}
        </button>
        <button className="btn btn-secondary">Restart bot</button>
        {saveError && <span className="t-caption" style={{ color: "var(--error)" }}>Gagal: {saveError}</span>}
        {!saveError && <span className="t-caption text-muted">Config tidak live-apply — restart PM2 wajib setelah save.</span>}
      </div>
    </div>
  );
}
