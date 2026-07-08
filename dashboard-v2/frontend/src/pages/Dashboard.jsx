import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { IconChevronDown, IconPlus, IconRefresh, IconFileExport, IconPlayerPause, IconAlertTriangle, IconFlask } from "@tabler/icons-react";
import Sparkline from "../components/Sparkline";
import { useChatContext } from "../context/ChatContext";
import { useApi } from "../hooks/useApi";
import { useServerEvents } from "../hooks/useServerEvents";
import { api } from "../api";

const TIMEFRAMES = ["Last 24 hours", "Last 7 days", "Last 30 days"];
const TIMEFRAME_HOURS = { "Last 24 hours": 24, "Last 7 days": 168, "Last 30 days": 720 };

function fmtUsd(n) {
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function BotStatusDot({ status, dryRun }) {
  const color = dryRun ? "var(--text-muted-soft)" : status === "processing" ? "var(--warning)" : "var(--success)";
  return (
    <span style={{
      width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0,
      boxShadow: dryRun ? "none" : `0 0 6px ${color}`,
    }} />
  );
}

function StatCard({ label, value, valueColor, sub, trend }) {
  const hasTrend = trend && trend.some((v) => v !== 0);
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div className="t-caption text-muted">{label}</div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: valueColor || "var(--text-primary)", letterSpacing: "-0.5px", lineHeight: 1 }}>
          {value}
        </div>
        {hasTrend && <Sparkline points={trend} width={72} height={32} />}
      </div>
      {sub && <div className="t-caption text-muted">{sub}</div>}
    </div>
  );
}

function Dropdown({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function close(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen((v) => !v)} style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "var(--surface-card)", border: "1px solid var(--hairline-strong)",
        borderRadius: "var(--radius-control)", height: 36, padding: "0 12px",
        color: "var(--text-primary)", fontSize: 14, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap",
      }}>
        {value}
        <IconChevronDown size={14} stroke={2} style={{ color: "var(--text-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 30, minWidth: "100%",
          background: "var(--surface-card-elevated)", border: "1px solid var(--hairline-strong)",
          borderRadius: "var(--radius-control)", overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}>
          {options.map((o) => (
            <button key={o} onClick={() => { onChange(o); setOpen(false); }} style={{
              display: "block", width: "100%", textAlign: "left", padding: "9px 14px",
              background: o === value ? "rgba(26,38,255,0.12)" : "none", border: "none",
              color: o === value ? "var(--primary-glow)" : "var(--text-primary)", fontSize: 14, cursor: "pointer",
            }}>{o}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickActions() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const ref = useRef(null);
  useEffect(() => {
    function close(e) { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setConfirm(null); } }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function handleAction(key) {
    if (key === "refresh") { setOpen(false); window.location.reload(); return; }
    if (key === "export") {
      setOpen(false);
      fetch("/api/positions").then((r) => r.json()).then((d) => {
        const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), data: d }, null, 2)], { type: "application/json" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
        a.download = `meridian-export-${Date.now()}.json`; a.click();
      }).catch(() => {});
      return;
    }
    setConfirm(key);
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => { setOpen((v) => !v); setConfirm(null); }} style={{
        width: 36, height: 36, background: "var(--surface-card)", border: "1px solid var(--hairline-strong)",
        borderRadius: "var(--radius-control)", cursor: "pointer", display: "flex",
        alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 20, lineHeight: 1,
      }}>···</button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 30, width: 220,
          background: "var(--surface-card-elevated)", border: "1px solid var(--hairline-strong)",
          borderRadius: "var(--radius-control)", overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        }}>
          {!confirm ? (
            <>
              <MenuItem icon={<IconRefresh size={15} />} label="Refresh data" onClick={() => handleAction("refresh")} />
              <MenuItem icon={<IconFileExport size={15} />} label="Export JSON" onClick={() => handleAction("export")} />
              <div style={{ height: 1, background: "var(--hairline)", margin: "4px 0" }} />
              <MenuItem icon={<IconPlayerPause size={15} />} label="Pause all bots" danger onClick={() => handleAction("pause")} />
              <MenuItem icon={<IconAlertTriangle size={15} />} label="Emergency close all" danger onClick={() => handleAction("emergency")} />
            </>
          ) : (
            <div style={{ padding: 14 }}>
              <div className="t-body-sm" style={{ marginBottom: 10, color: "var(--error)" }}>
                {confirm === "pause" ? "Pause semua bot? Cron jobs akan berhenti sampai di-resume." : "Close SEMUA posisi terbuka sekarang? Ini tidak bisa dibatalkan."}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-secondary" style={{ flex: 1, height: 32, fontSize: 13 }} onClick={() => { setOpen(false); setConfirm(null); }}>Batal</button>
                <button style={{ flex: 1, height: 32, fontSize: 13, background: "var(--error)", color: "#fff", border: "none", borderRadius: "var(--radius-control)", cursor: "pointer", fontWeight: 600 }}
                  onClick={() => { alert("Fitur ini memerlukan koneksi ke Meridian bot yang sedang berjalan."); setOpen(false); setConfirm(null); }}>
                  Konfirmasi
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, danger, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 10,
      padding: "9px 14px", background: "none", border: "none",
      color: danger ? "var(--error)" : "var(--text-primary)", fontSize: 14, cursor: "pointer",
    }}>
      {icon}{label}
    </button>
  );
}

const RESULT_COLORS = { success: "var(--success)", error: "var(--error)", neutral: "var(--text-muted)" };

function deriveResultType(d) {
  if (d.type === "deploy") return "success";
  if (d.type === "close") return d.summary?.includes("loss") || d.summary?.includes("stop") ? "error" : "success";
  if (d.type === "no_deploy") return "neutral";
  return "neutral";
}

export default function Dashboard() {
  const [timeframe, setTimeframe] = useState("Last 24 hours");
  const { injectMessage } = useChatContext();

  const { data: systemData } = useApi(api.system, [], 30_000);
  const { data: walletData,    reload: reloadWallet    } = useApi(api.wallet, [], 30_000);
  const { data: perfData,      reload: reloadPerf      } = useApi(api.performance, [], 30_000);
  const { data: decisionsData, reload: reloadDecisions } = useApi(() => api.decisions(20), [], 30_000);
  const { data: pendingData,   reload: reloadLessons   } = useApi(api.lessonsPending, [], 30_000);
  const { data: simData } = useApi(api.sim);

  // SSE: instant push from backend when bot writes to JSON files
  useServerEvents({
    decision_log_changed: () => { reloadDecisions(); reloadWallet(); },
    lessons_changed:      () => { reloadLessons(); reloadPerf(); },
    state_changed:        () => { reloadWallet(); reloadPerf(); },
  });

  const hours = TIMEFRAME_HOURS[timeframe];
  const cutoff = Date.now() - hours * 3600_000;
  const perf = perfData?.performance ?? [];
  const perfInWindow = perf.filter((p) => p.closed_at ? new Date(p.closed_at).getTime() > cutoff : true);

  const totalClosed = perfInWindow.length;
  const wins = perfInWindow.filter((p) => p.pnl_pct > 0).length;
  const winRate = totalClosed > 0 ? ((wins / totalClosed) * 100).toFixed(1) : "—";
  const netPnl = perfInWindow.reduce((s, p) => s + (p.pnl_usd ?? 0), 0);
  const totalFees = perfInWindow.reduce((s, p) => s + (p.fees_earned_usd ?? 0), 0);

  const pnlTrend = perfData?.pnlTrend ?? [];
  const feeTrend = perfData?.feeTrend ?? [];

  const botStatus = systemData?.status ?? "running";
  const dryRun = systemData?.dry_run ?? false;
  const openPositions = systemData?.open_positions ?? 0;

  const bot = {
    id: "meridian",
    name: systemData?.agent_id ?? "Meridian Bot",
    status: botStatus,
    dryRun,
    allTimePnlUsd: perf.reduce((s, p) => s + (p.pnl_usd ?? 0), 0),
  };

  const totalValueUsd = walletData?.total_usd ?? 0;

  const decisions = decisionsData?.decisions ?? [];
  const activity = decisions.map((d) => ({
    time: d.ts ? new Date(d.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—",
    bot: "Meridian",
    pool: d.pool ? d.pool.slice(0, 8) + "…" : "—",
    event: d.summary ?? d.type,
    result: d.type === "deploy" ? `+${(d.metrics?.amount_sol ?? 0)} SOL` : d.type === "close" ? `${(d.metrics?.pnl_pct ?? 0).toFixed(1)}%` : d.type,
    resultType: deriveResultType(d),
    raw: d,
  }));

  const pendingLessons = pendingData?.pending ?? [];
  const simEnabled = simData?.config?.enabled ?? false;
  const pendingDryRun = (simData?.review ?? []).filter((l) => l.status === "pending").length;

  function handleActivityClick(a) {
    injectMessage(
      `Jelaskan event ini: "${a.event}" (pool ${a.pool}). Apa yang terjadi dan apakah ada tindakan lanjutan yang perlu diambil?`,
      "orchestrator",
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", padding: "var(--space-6)", overflowY: "auto", flex: 1 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 className="t-display-sm" style={{ flex: 1 }}>Dashboard</h1>
        <Dropdown value={timeframe} onChange={setTimeframe} options={TIMEFRAMES} />
        <QuickActions />
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-4)" }}>
        <StatCard label="Total wallet" value={fmtUsd(totalValueUsd)} sub={`${openPositions} posisi aktif`} />
        <StatCard
          label={`Net PnL (${timeframe.toLowerCase()})`}
          value={`${netPnl >= 0 ? "+" : ""}${fmtUsd(netPnl)}`}
          valueColor={netPnl >= 0 ? "var(--success)" : "var(--error)"}
          sub={netPnl >= 0 ? "Profit period ini" : "Loss period ini"}
          trend={pnlTrend}
        />
        <StatCard label={`Fees earned (${timeframe.toLowerCase()})`} value={fmtUsd(totalFees)} trend={feeTrend} />
        <StatCard
          label={`Win rate (${timeframe.toLowerCase()})`}
          value={winRate !== "—" ? `${winRate}%` : "—"}
          sub={totalClosed > 0 ? `${totalClosed} posisi ditutup` : "Belum ada trade"}
        />
      </div>

      {/* Bot + Lessons */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
        {/* Bot card */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="t-title-sm">Bot</span>
            <button className="btn btn-secondary" style={{ height: 32, fontSize: 13, gap: 4 }} disabled title="Single instance">
              <IconPlus size={14} stroke={2} /> Add bot
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "var(--surface-card-elevated)", borderRadius: "var(--radius-control)", padding: "10px 14px",
            }}>
              <BotStatusDot status={bot.status} dryRun={bot.dryRun} />
              <span className="t-body-sm" style={{ flex: 1, fontWeight: 500 }}>{bot.name}</span>
              {bot.dryRun
                ? <span className="t-caption" style={{ color: "var(--text-muted)" }}>dry run</span>
                : <span className="t-body-sm" style={{ fontWeight: 600, color: bot.allTimePnlUsd >= 0 ? "var(--success)" : "var(--error)" }}>
                    {bot.allTimePnlUsd >= 0 ? "+" : ""}${bot.allTimePnlUsd.toFixed(2)}
                  </span>
              }
            </div>
            {systemData && (
              <div className="t-caption text-muted" style={{ paddingLeft: 4 }}>
                {systemData.uptime_hours != null ? `Uptime: ${systemData.uptime_hours}h` : ""}
                {systemData.model ? ` · Model: ${systemData.model}` : ""}
                {walletData ? ` · ${(walletData.sol ?? 0).toFixed(3)} SOL` : ""}
              </div>
            )}
          </div>
          <Link to="/bot-manager" className="t-body-sm" style={{ color: "var(--text-muted)", textDecoration: "none", marginTop: "auto" }}>
            Kelola bot →
          </Link>
        </div>

        {/* Lessons pending */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="t-title-sm">Lessons pending</span>
            {pendingLessons.length > 0 && <span className="badge badge-warning">{pendingLessons.length}</span>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
            {pendingLessons.slice(0, 3).map((l, i) => (
              <div key={l.id ?? i} style={{ borderLeft: "3px solid var(--primary-glow)", paddingLeft: 12 }}>
                <div className="t-body-sm" style={{ fontWeight: 600 }}>{l.rule ?? l.title ?? "(no rule)"}</div>
                <div className="t-caption text-muted" style={{ marginTop: 3 }}>
                  {l.tags?.join(", ")}
                </div>
              </div>
            ))}
            {pendingLessons.length === 0 && <div className="t-body-sm text-muted">Tidak ada lesson pending.</div>}
          </div>
          <Link to="/insights" style={{ textDecoration: "none" }}>
            <button className="btn btn-secondary" style={{ width: "100%", justifyContent: "center" }}>Review queue ↗</button>
          </Link>
        </div>
      </div>

      {/* Paper Trading section (if sim enabled) */}
      {simEnabled && (
        <div className="card" style={{ border: "1px solid rgba(249,115,22,0.35)", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <IconFlask size={16} stroke={2} style={{ color: "#f97316", flexShrink: 0 }} />
            <span className="t-title-sm" style={{ color: "#f97316" }}>Paper Trading</span>
            <span className="t-caption text-muted">— simulasi, bukan transaksi real</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-3)" }}>
            <div style={{ background: "var(--surface-card-elevated)", borderRadius: "var(--radius-control)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="t-body-sm" style={{ fontWeight: 600 }}>Meridian Bot (Paper)</div>
              <div className="t-caption text-muted">Virtual balance: {simData?.config?.virtualBalanceSOL ?? "—"} SOL</div>
              <div style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 16 }}>
                {simData?.summary ? `${(simData.summary.totalNetPnLUSD ?? 0) >= 0 ? "+" : ""}$${(simData.summary.totalNetPnLUSD ?? 0).toFixed(2)}` : "—"}
              </div>
              <div className="t-caption text-muted">
                {simData?.summary ? `${simData.summary.winCount ?? 0}W / ${simData.summary.lossCount ?? 0}L` : "Belum ada data"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="t-caption text-muted" style={{ fontStyle: "italic" }}>
              PnL adalah simulasi — fee dan IL dihitung dari estimasi dashboard.
            </div>
            <Link to="/insights" style={{ textDecoration: "none" }}>
              <button className="btn btn-secondary" style={{ height: 30, fontSize: 13, gap: 6 }}>
                {pendingDryRun > 0 && (
                  <span style={{ minWidth: 16, height: 16, borderRadius: 8, background: "#f97316", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
                    {pendingDryRun}
                  </span>
                )}
                Review dry run lessons ↗
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span className="t-title-sm">Recent activity</span>
          <span className="t-caption text-muted">Klik baris untuk tanya bot</span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Time", "Bot", "Pool", "Event", "Result"].map((h) => (
                <th key={h} className="t-caption-upper text-muted"
                  style={{ textAlign: h === "Result" ? "right" : "left", padding: "0 0 10px", paddingRight: h !== "Result" ? 16 : 0 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activity.map((a, i) => (
              <tr key={i} onClick={() => handleActivityClick(a)}
                style={{ borderTop: "1px solid var(--hairline)", cursor: "pointer" }} className="data-row">
                <td className="t-code text-muted" style={{ padding: "11px 16px 11px 0" }}>{a.time}</td>
                <td className="t-body-sm" style={{ padding: "11px 16px 11px 0" }}>{a.bot}</td>
                <td className="t-code" style={{ padding: "11px 16px 11px 0", color: "var(--text-muted)" }}>{a.pool}</td>
                <td className="t-body-sm" style={{ padding: "11px 16px 11px 0" }}>{a.event}</td>
                <td className="t-body-sm" style={{ padding: "11px 0", textAlign: "right", fontWeight: 500, color: RESULT_COLORS[a.resultType] }}>
                  {a.result}
                </td>
              </tr>
            ))}
            {activity.length === 0 && (
              <tr><td colSpan={5} className="t-body-sm text-muted" style={{ padding: "16px 0" }}>
                Belum ada aktivitas.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
