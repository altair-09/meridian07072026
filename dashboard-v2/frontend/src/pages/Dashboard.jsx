import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { IconChevronDown, IconPlus, IconRefresh, IconFileExport, IconPlayerPause, IconAlertTriangle, IconFlask } from "@tabler/icons-react";
import { bots, walletsByBot, lessonApprovalQueue, recentActivity, dashboardStats, paperConfig, paperLedger, dryRunLessons } from "../mock/mockData";
import Sparkline from "../components/Sparkline";
import { useChatContext } from "../context/ChatContext";

const TIMEFRAMES = ["Last 24 hours", "Last 7 days", "Last 30 days"];

// ── helpers ────────────────────────────────────────────────────────────────────

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

// Generic dropdown used for scope & timeframe
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

// Quick actions — the "..." menu
function QuickActions() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(null); // "pause" | "emergency"
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
      const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), note: "mock export" }, null, 2)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = `meridian-export-${Date.now()}.json`; a.click();
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
                <button
                  style={{ flex: 1, height: 32, fontSize: 13, background: "var(--error)", color: "#fff", border: "none", borderRadius: "var(--radius-control)", cursor: "pointer", fontWeight: 600 }}
                  onClick={() => { alert("[mock] " + (confirm === "pause" ? "Semua bot di-pause." : "Emergency close dikirim.")); setOpen(false); setConfirm(null); }}
                >Konfirmasi</button>
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

// ── main ───────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [scope, setScope] = useState("All bots");
  const [timeframe, setTimeframe] = useState("Last 24 hours");
  const { injectMessage } = useChatContext();

  // Derive which bots are in scope
  const scopedBots = scope === "All bots" ? bots : bots.filter((b) => b.name === scope);
  const trendKey = scope === "All bots" ? "all" : (scopedBots[0]?.id ?? "all");

  // Stats come from the lookup table — both scope AND timeframe matter
  const stats = dashboardStats[trendKey]?.[timeframe] ?? dashboardStats.all["Last 24 hours"];

  // Total wallet value is always current (not period-dependent)
  const totalValue = scopedBots.reduce((s, b) => s + (walletsByBot[b.id]?.totalValueUsd ?? 0), 0);

  // Activity filtered by scope, most recent first
  const scopedActivity = scope === "All bots"
    ? recentActivity
    : recentActivity.filter((a) => a.botId === scopedBots[0]?.id);

  const pendingLessons = lessonApprovalQueue.filter((l) => l.status === "pending");

  function handleActivityClick(a) {
    const target = a.botId ?? "orchestrator";
    injectMessage(
      `Jelaskan event ini: "${a.event}" (pool ${a.pool}, pukul ${a.time}, ${a.bot}). Apa yang terjadi dan apakah ada tindakan lanjutan yang perlu diambil?`,
      target,
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", padding: "var(--space-6)", overflowY: "auto", flex: 1 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 className="t-display-sm" style={{ flex: 1 }}>Dashboard</h1>
        <Dropdown value={scope} onChange={setScope} options={["All bots", ...bots.map((b) => b.name)]} />
        <Dropdown value={timeframe} onChange={setTimeframe} options={TIMEFRAMES} />
        <QuickActions />
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-4)" }}>
        <StatCard label={`Total value (${scopedBots.length} bot)`} value={fmtUsd(totalValue)} />
        <StatCard
          label={`Net PnL (${timeframe.toLowerCase()})`}
          value={`${stats.netPnl >= 0 ? "+" : ""}${fmtUsd(stats.netPnl)}`}
          valueColor={stats.netPnl >= 0 ? "var(--success)" : "var(--error)"}
          sub={stats.netPnl >= 0 ? "Profit period ini" : "Loss period ini"}
          trend={stats.pnlTrend}
        />
        <StatCard
          label={`Fees earned (${timeframe.toLowerCase()})`}
          value={fmtUsd(stats.fees)}
          trend={stats.feeTrend}
        />
        <StatCard
          label={`Win rate (${timeframe.toLowerCase()})`}
          value={stats.trades > 0 ? `${stats.winRate}%` : "—"}
          sub={stats.trades > 0 ? `${stats.trades} posisi ditutup` : "Belum ada trade"}
        />
      </div>

      {/* ── Bots + Lessons ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>

        {/* Bots card */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="t-title-sm">Bots</span>
            <button className="btn btn-secondary" style={{ height: 32, fontSize: 13, gap: 4 }} disabled title="Slot penuh">
              <IconPlus size={14} stroke={2} /> Add bot
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {scopedBots.map((b) => {
              const pnl = b.allTimePnlUsd;
              return (
                <div key={b.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "var(--surface-card-elevated)", borderRadius: "var(--radius-control)", padding: "10px 14px",
                }}>
                  <BotStatusDot status={b.status} dryRun={b.dryRun} />
                  <span className="t-body-sm" style={{ flex: 1, fontWeight: 500 }}>{b.name}</span>
                  {b.dryRun
                    ? <span className="t-caption" style={{ color: "var(--text-muted)" }}>dry run</span>
                    : <span className="t-body-sm" style={{ fontWeight: 600, color: pnl >= 0 ? "var(--success)" : "var(--error)" }}>
                        {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                      </span>
                  }
                </div>
              );
            })}
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
            {pendingLessons.slice(0, 3).map((l) => (
              <div key={l.id} style={{ borderLeft: "3px solid var(--primary-glow)", paddingLeft: 12 }}>
                <div className="t-body-sm" style={{ fontWeight: 600 }}>{l.title}</div>
                <div className="t-caption text-muted" style={{ marginTop: 3 }}>
                  {l.context.split("—")[0].trim()}
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

      {/* ── Paper Trading section (visible if any bot has paper mode active) ── */}
      {(() => {
        const paperBots = bots.filter((b) => paperConfig[b.id]?.paperTradingEnabled);
        if (paperBots.length === 0) return null;
        const pendingDryRun = dryRunLessons.filter((l) => l.status === "pending").length;
        return (
          <div className="card" style={{ border: "1px solid rgba(249,115,22,0.35)", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <IconFlask size={16} stroke={2} style={{ color: "#f97316", flexShrink: 0 }} />
              <span className="t-title-sm" style={{ color: "#f97316" }}>Paper Trading</span>
              <span className="t-caption text-muted">— simulasi, bukan transaksi real</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-3)" }}>
              {paperBots.map((b) => {
                const pc = paperConfig[b.id];
                const ledger = paperLedger[b.id];
                const summary = ledger?.summary ?? {};
                const openTrades = ledger?.trades.filter((t) => t.isOpen) ?? [];
                const pnlColor = (summary.totalNetPnLUSD ?? 0) >= 0 ? "var(--success)" : "var(--error)";
                return (
                  <div key={b.id} style={{ background: "var(--surface-card-elevated)", borderRadius: "var(--radius-control)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                    <div className="t-body-sm" style={{ fontWeight: 600 }}>{b.name}</div>
                    <div className="t-caption text-muted">
                      Virtual balance: {pc.currentVirtualBalanceSOL ?? pc.virtualBalanceSOL} SOL
                    </div>
                    <div style={{ color: pnlColor, fontWeight: 600, fontSize: 16 }}>
                      {(summary.totalNetPnLUSD ?? 0) >= 0 ? "+" : ""}${(summary.totalNetPnLUSD ?? 0).toFixed(2)}
                    </div>
                    <div className="t-caption text-muted">
                      {summary.winCount ?? 0}W / {summary.lossCount ?? 0}L &middot; {openTrades.length} posisi aktif
                    </div>
                  </div>
                );
              })}
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
        );
      })()}

      {/* ── Recent activity ── */}
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
            {scopedActivity.map((a, i) => (
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
            {scopedActivity.length === 0 && (
              <tr><td colSpan={5} className="t-body-sm text-muted" style={{ padding: "16px 0" }}>
                Tidak ada aktivitas untuk {scope}.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
