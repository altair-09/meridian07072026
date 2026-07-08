import { useState } from "react";
import { Link } from "react-router-dom";
import { IconFlask } from "@tabler/icons-react";
import StatusBadge from "../components/StatusBadge";
import { useApi } from "../hooks/useApi";
import { api, apiFetch } from "../api";

function InfoBox({ children, variant = "info" }) {
  const colors = {
    info: { bg: "rgba(26,38,255,0.08)", border: "rgba(26,38,255,0.25)", icon: "ℹ️" },
    warning: { bg: "rgba(255,171,0,0.08)", border: "rgba(255,171,0,0.35)", icon: "⚠️" },
  };
  const c = colors[variant];
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: "var(--radius-control)", padding: "10px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ flexShrink: 0, fontSize: 14 }}>{c.icon}</span>
      <div className="t-body-sm text-body" style={{ lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

function PaperTradingPanel({ config, onSave, onDisable }) {
  const [sol, setSol] = useState(config?.virtualBalanceSOL ?? 10);
  const [usd, setUsd] = useState(config?.virtualBalanceUSD ?? 1500);
  const [note, setNote] = useState(config?.note ?? "");
  const [pollMin, setPollMin] = useState(config?.paperPollIntervalMin ?? 10);
  const [confirmDisable, setConfirmDisable] = useState(false);

  const iStyle = { width: "100%", height: 34, padding: "0 10px", borderRadius: "var(--radius-control)", background: "var(--surface-card-elevated)", border: "1px solid var(--hairline-strong)", color: "var(--text-primary)", fontSize: 14, boxSizing: "border-box" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
      <div style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.3)", borderRadius: "var(--radius-control)", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
        <IconFlask size={14} stroke={2} style={{ color: "#f97316", flexShrink: 0 }} />
        <span className="t-caption" style={{ color: "#f97316", fontWeight: 600 }}>PAPER TRADING AKTIF</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div><div className="t-caption text-muted" style={{ marginBottom: 4 }}>Virtual SOL</div><input type="number" value={sol} min={0} step={0.1} onChange={(e) => setSol(Number(e.target.value))} style={iStyle} /></div>
        <div><div className="t-caption text-muted" style={{ marginBottom: 4 }}>Virtual USD</div><input type="number" value={usd} min={0} step={10} onChange={(e) => setUsd(Number(e.target.value))} style={iStyle} /></div>
      </div>
      <div><div className="t-caption text-muted" style={{ marginBottom: 4 }}>Poll interval (menit)</div><input type="number" value={pollMin} min={5} max={60} step={5} onChange={(e) => setPollMin(Number(e.target.value))} style={iStyle} /></div>
      <div><div className="t-caption text-muted" style={{ marginBottom: 4 }}>Catatan sesi</div><input type="text" value={note} placeholder="Deskripsi sesi..." onChange={(e) => setNote(e.target.value)} style={iStyle} /></div>
      <InfoBox>Paper trading menggunakan data harga real, tapi PnL adalah simulasi.</InfoBox>
      <InfoBox variant="warning">Lesson dari paper trading akan di-share ke HiveMind secara default.</InfoBox>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onSave({ virtualBalanceSOL: sol, virtualBalanceUSD: usd, note, paperPollIntervalMin: pollMin })}>Simpan</button>
        {!confirmDisable ? (
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmDisable(true)}>Nonaktifkan</button>
        ) : (
          <div style={{ flex: 1, display: "flex", gap: 6 }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmDisable(false)}>Batal</button>
            <button style={{ flex: 1, height: 36, background: "var(--error)", color: "#fff", border: "none", borderRadius: "var(--radius-control)", cursor: "pointer", fontWeight: 600, fontSize: 14 }} onClick={() => { setConfirmDisable(false); onDisable(); }}>Konfirmasi</button>
          </div>
        )}
      </div>
      <div className="t-caption text-muted">Setelah nonaktifkan: review lesson dry run di <Link to="/insights" style={{ color: "var(--primary-glow)", textDecoration: "none" }}>Insights & Lessons</Link>.</div>
    </div>
  );
}

function EnablePaperPanel({ onEnable }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
      <InfoBox>Paper trading menjalankan bot dengan <code>DRY_RUN=true</code> — tidak ada transaksi on-chain.</InfoBox>
      <button className="btn btn-secondary" style={{ gap: 8 }} onClick={onEnable}><IconFlask size={14} stroke={2} /> Aktifkan paper trading</button>
    </div>
  );
}

export default function BotManager() {
  const { data: systemData, loading: sysLoading, reload } = useApi(api.system);
  const { data: walletData } = useApi(api.wallet);
  const { data: perfData } = useApi(api.performance);
  const { data: simData } = useApi(api.sim);
  const { data: botStatus, reload: reloadStatus } = useApi(() => apiFetch("/api/bot/status"));
  const [expandedPaper, setExpandedPaper] = useState({});
  const [paperEnabled, setPaperEnabled] = useState(null);
  const [actionStatus, setActionStatus] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [dryRunToggle, setDryRunToggle] = useState(false);

  const allTimePnl = (perfData?.performance ?? []).reduce((s, p) => s + (p.pnl_usd ?? 0), 0);
  const openPositions = systemData?.open_positions ?? 0;
  const status = systemData?.status ?? "idle";
  const dryRun = systemData?.dry_run ?? false;
  const simEnabled = paperEnabled ?? (simData?.config?.enabled ?? false);
  const walletAddress = walletData?.address ?? systemData?.wallet ?? "—";

  const bot = {
    id: "meridian",
    name: systemData?.agent_id ?? "Meridian Bot",
    wallet: walletAddress,
    status,
    dryRun,
    openPositions,
    uptimeHours: systemData?.uptime_hours ?? "—",
    allTimePnlUsd: allTimePnl,
    ramMb: systemData?.ram_mb ?? "—",
    cpuPct: systemData?.cpu_pct ?? "—",
  };

  function togglePaperPanel() {
    setExpandedPaper((prev) => ({ ...prev, meridian: !prev.meridian }));
  }

  async function handleEnable() {
    setPaperEnabled(true);
    try {
      await apiFetch("/api/config", { method: "POST", body: JSON.stringify({ simAbTestEnabled: true }) });
    } catch { /* non-fatal */ }
  }

  async function handleDisable() {
    setPaperEnabled(false);
    try {
      await apiFetch("/api/config", { method: "POST", body: JSON.stringify({ simAbTestEnabled: false }) });
    } catch { /* non-fatal */ }
  }

  const isRunning = botStatus?.running ?? false;

  async function handleBotAction(action) {
    setActionLoading(action);
    setActionStatus(null);
    try {
      await apiFetch(`/api/bot/${action}`, {
        method: "POST",
        body: JSON.stringify({ dry_run: dryRunToggle }),
      });
      const messages = {
        start: `✓ Bot berhasil dijalankan${dryRunToggle ? " (DRY RUN)" : " (LIVE)"}.`,
        stop: "✓ Bot berhasil dihentikan.",
        restart: `✓ Bot berhasil di-restart${dryRunToggle ? " (DRY RUN)" : ""}.`,
      };
      setActionStatus({ ok: true, message: messages[action] });
      setTimeout(() => { reloadStatus(); reload(); }, 1800);
    } catch (e) {
      setActionStatus({ ok: false, message: e.message });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSave(updates) {
    try {
      await apiFetch("/api/config", { method: "POST", body: JSON.stringify({ simAbTestEnabled: true, ...updates }) });
      setActionStatus({ ok: true, message: "Config disimpan ke user-config.json." });
      setTimeout(() => setActionStatus(null), 4000);
    } catch (e) {
      setActionStatus({ ok: false, message: "Gagal simpan: " + e.message });
    }
  }

  if (sysLoading) return <div style={{ padding: "var(--space-6)" }}><p className="t-body-sm text-muted">Memuat status bot...</p></div>;

  return (
    <div className="page-pad" style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", padding: "var(--space-6)", overflowY: "auto", flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 className="t-display-sm">Bot manager</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={reload}>Refresh</button>
          <button className="btn btn-secondary" disabled title="Single instance">Add bot (1/1)</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "var(--space-4)" }}>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="t-title-sm">{bot.name}</span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {simEnabled && <IconFlask size={14} stroke={2} style={{ color: "#f97316" }} title="Paper trading aktif" />}
              <StatusBadge status={bot.status} />
            </div>
          </div>

          <div className="t-code text-muted" style={{ wordBreak: "break-all", fontSize: 11 }}>
            {bot.wallet !== "—" ? bot.wallet : "Wallet address tidak tersedia (HELIUS_API_KEY diperlukan)"}
          </div>

          <div className="t-body-sm text-body">
            Uptime: {bot.uptimeHours !== "—" ? `${bot.uptimeHours}h` : "—"} · Posisi terbuka: {bot.openPositions}
          </div>

          <div className="t-body-sm" style={{ color: bot.allTimePnlUsd >= 0 ? "var(--success)" : "var(--error)" }}>
            All-time PnL: {bot.allTimePnlUsd >= 0 ? "+" : ""}${bot.allTimePnlUsd.toFixed(2)}
          </div>

          <div className="t-caption" style={{ color: simEnabled ? "#f97316" : bot.dryRun ? "var(--warning)" : "var(--success)" }}>
            {simEnabled ? "PAPER TRADING" : bot.dryRun ? "DRY RUN" : "LIVE"}
          </div>

          {(bot.ramMb !== "—" || bot.cpuPct !== "—") && (
            <div className="t-caption text-muted">
              {bot.ramMb !== "—" ? `RAM ${bot.ramMb}MB · ` : ""}
              {bot.cpuPct !== "—" ? `CPU ${bot.cpuPct}%` : ""}
            </div>
          )}

          {/* DRY RUN toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
            <div
              onClick={() => setDryRunToggle((v) => !v)}
              style={{
                width: 40, height: 22, borderRadius: 11, cursor: "pointer", flexShrink: 0,
                background: dryRunToggle ? "var(--warning)" : "rgba(255,255,255,0.15)",
                position: "relative", transition: "background 0.2s",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <div style={{
                position: "absolute", top: 2, left: dryRunToggle ? 20 : 2,
                width: 16, height: 16, borderRadius: "50%", background: "#fff",
                transition: "left 0.2s",
              }} />
            </div>
            <span className="t-body-sm" style={{ color: dryRunToggle ? "var(--warning)" : "var(--text-muted)" }}>
              {dryRunToggle ? "DRY RUN — tidak ada transaksi real" : "Mode LIVE"}
            </span>
          </div>

          {/* Start / Stop / Restart buttons */}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <Link to="/settings" style={{ flex: 1, textDecoration: "none" }}>
              <button className="btn btn-secondary" style={{ width: "100%" }}>Config</button>
            </Link>

            {/* Toggle: Start kalau tidak jalan, Stop kalau jalan */}
            {!isRunning ? (
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={actionLoading === "start"}
                onClick={() => handleBotAction("start")}
              >
                {actionLoading === "start" ? "Menjalankan..." : "▶ Start"}
              </button>
            ) : (
              <button
                className="btn btn-secondary"
                style={{ flex: 1, color: "var(--error)" }}
                disabled={actionLoading === "stop"}
                onClick={() => handleBotAction("stop")}
              >
                {actionLoading === "stop" ? "Menghentikan..." : "■ Stop"}
              </button>
            )}

            <button
              className="btn btn-secondary"
              style={{ flex: 1 }}
              disabled={actionLoading === "restart"}
              onClick={() => handleBotAction("restart")}
            >
              {actionLoading === "restart" ? "Merestart..." : "↺ Restart"}
            </button>
          </div>

          {actionStatus && (
            <div style={{
              padding: "8px 12px", borderRadius: "var(--radius-control)", marginTop: 4,
              background: actionStatus.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
              border: `1px solid ${actionStatus.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
            }}>
              <span className="t-body-sm" style={{ color: actionStatus.ok ? "var(--success)" : "var(--error)" }}>
                {actionStatus.message}
              </span>
            </div>
          )}

          {/* Paper trading toggle */}
          <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: 10, marginTop: 4 }}>
            <button onClick={togglePaperPanel} style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "none", border: "none", cursor: "pointer", padding: 0,
              color: simEnabled ? "#f97316" : "var(--text-muted)",
            }}>
              <span className="t-body-sm" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <IconFlask size={14} stroke={2} />
                Paper trading {simEnabled ? "(aktif)" : "(nonaktif)"}
              </span>
              <span style={{ fontSize: 12 }}>{expandedPaper.meridian ? "▲" : "▼"}</span>
            </button>

            {expandedPaper.meridian && (
              simEnabled
                ? <PaperTradingPanel config={simData?.config} onSave={handleSave} onDisable={handleDisable} />
                : <EnablePaperPanel onEnable={handleEnable} />
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ background: "rgba(26,38,255,0.06)", border: "1px solid rgba(26,38,255,0.2)" }}>
        <div className="t-body-sm" style={{ fontWeight: 600, marginBottom: 6 }}>ℹ️ Tentang Start / Stop dari dashboard</div>
        <div className="t-caption text-muted" style={{ lineHeight: 1.7 }}>
          Dashboard menjalankan <code>node index.js</code> langsung di folder repo — tidak perlu PM2.
          Toggle <strong>DRY RUN</strong> aktif = tidak ada transaksi on-chain.
          PID disimpan di <code>.bot.pid</code> agar Stop bisa menemukan proses yang berjalan.
        </div>
      </div>
    </div>
  );
}
