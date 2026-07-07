import { useState } from "react";
import { Link } from "react-router-dom";
import { IconFlask, IconAlertTriangle, IconX } from "@tabler/icons-react";
import StatusBadge from "../components/StatusBadge";
import { bots, paperConfig as initialPaperConfig } from "../mock/mockData";

function InfoBox({ children, variant = "info" }) {
  const colors = {
    info: { bg: "rgba(26,38,255,0.08)", border: "rgba(26,38,255,0.25)", icon: "ℹ️" },
    warning: { bg: "rgba(255,171,0,0.08)", border: "rgba(255,171,0,0.35)", icon: "⚠️" },
  };
  const c = colors[variant];
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: "var(--radius-control)", padding: "10px 14px",
      display: "flex", gap: 10, alignItems: "flex-start",
    }}>
      <span style={{ flexShrink: 0, fontSize: 14 }}>{c.icon}</span>
      <div className="t-body-sm text-body" style={{ lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

function PaperTradingPanel({ bot, config, onSave, onDisable }) {
  const [sol, setSol] = useState(config?.virtualBalanceSOL ?? 10);
  const [usd, setUsd] = useState(config?.virtualBalanceUSD ?? 1500);
  const [note, setNote] = useState(config?.note ?? "");
  const [pollMin, setPollMin] = useState(config?.paperPollIntervalMin ?? 10);
  const [confirmDisable, setConfirmDisable] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
      <div style={{
        background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.3)",
        borderRadius: "var(--radius-control)", padding: "8px 12px",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <IconFlask size={14} stroke={2} style={{ color: "#f97316", flexShrink: 0 }} />
        <span className="t-caption" style={{ color: "#f97316", fontWeight: 600 }}>PAPER TRADING AKTIF</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <div className="t-caption text-muted" style={{ marginBottom: 4 }}>Virtual balance (SOL)</div>
          <input
            type="number" value={sol} min={0} step={0.1}
            onChange={(e) => setSol(Number(e.target.value))}
            style={{ width: "100%", height: 34, padding: "0 10px", borderRadius: "var(--radius-control)", background: "var(--surface-card-elevated)", border: "1px solid var(--hairline-strong)", color: "var(--text-primary)", fontSize: 14 }}
          />
        </div>
        <div>
          <div className="t-caption text-muted" style={{ marginBottom: 4 }}>Virtual balance (USD)</div>
          <input
            type="number" value={usd} min={0} step={10}
            onChange={(e) => setUsd(Number(e.target.value))}
            style={{ width: "100%", height: 34, padding: "0 10px", borderRadius: "var(--radius-control)", background: "var(--surface-card-elevated)", border: "1px solid var(--hairline-strong)", color: "var(--text-primary)", fontSize: 14 }}
          />
        </div>
      </div>

      <div>
        <div className="t-caption text-muted" style={{ marginBottom: 4 }}>Poll interval PnL simulasi (menit)</div>
        <input
          type="number" value={pollMin} min={5} max={60} step={5}
          onChange={(e) => setPollMin(Number(e.target.value))}
          style={{ width: "100%", height: 34, padding: "0 10px", borderRadius: "var(--radius-control)", background: "var(--surface-card-elevated)", border: "1px solid var(--hairline-strong)", color: "var(--text-primary)", fontSize: 14 }}
        />
      </div>

      <div>
        <div className="t-caption text-muted" style={{ marginBottom: 4 }}>Catatan sesi (opsional)</div>
        <input
          type="text" value={note} placeholder="Deskripsi sesi paper trading..."
          onChange={(e) => setNote(e.target.value)}
          style={{ width: "100%", height: 34, padding: "0 10px", borderRadius: "var(--radius-control)", background: "var(--surface-card-elevated)", border: "1px solid var(--hairline-strong)", color: "var(--text-primary)", fontSize: 14, boxSizing: "border-box" }}
        />
      </div>

      <InfoBox>
        <strong>Paper trading menggunakan data harga real, tapi PnL adalah simulasi</strong> — fee dan IL dihitung dari estimasi dashboard. Hasil tidak menjamin performa live.
      </InfoBox>
      <InfoBox>
        Wallet bot ini tetap butuh ~0.15 SOL real agar bot bisa buka posisi. Turunkan <code>minSolToOpen</code> dan <code>gasReserve</code> di Settings bot ini.
      </InfoBox>
      <InfoBox variant="warning">
        <strong>HiveMind aktif:</strong> lesson dan outcomes dari paper trading ini akan di-share ke server Agent Meridian. Ini perilaku default yang tidak bisa dimatikan via config.
      </InfoBox>

      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onSave({ virtualBalanceSOL: sol, virtualBalanceUSD: usd, note, paperPollIntervalMin: pollMin })}>
          Simpan
        </button>
        {!confirmDisable ? (
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmDisable(true)}>
            Nonaktifkan
          </button>
        ) : (
          <div style={{ flex: 1, display: "flex", gap: 6 }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmDisable(false)}>Batal</button>
            <button
              style={{ flex: 1, height: 36, background: "var(--error)", color: "#fff", border: "none", borderRadius: "var(--radius-control)", cursor: "pointer", fontWeight: 600, fontSize: 14 }}
              onClick={() => { setConfirmDisable(false); onDisable(); }}
            >Konfirmasi</button>
          </div>
        )}
      </div>
      <div className="t-caption text-muted">
        Setelah nonaktifkan: lesson dry run pending tidak otomatis masuk ke live — review dulu di{" "}
        <Link to="/insights" style={{ color: "var(--primary-glow)", textDecoration: "none" }}>Insights & Lessons</Link>.
      </div>
    </div>
  );
}

function EnablePaperPanel({ onEnable }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
      <InfoBox>
        Paper trading menjalankan bot dengan <code>DRY_RUN=true</code> — tidak ada transaksi on-chain. PnL dihitung simulasi dari data harga real.
      </InfoBox>
      <button className="btn btn-secondary" style={{ gap: 8 }} onClick={onEnable}>
        <IconFlask size={14} stroke={2} /> Aktifkan paper trading
      </button>
    </div>
  );
}

export default function BotManager() {
  const [paperConfig, setPaperConfig] = useState(initialPaperConfig);
  const [expandedPaper, setExpandedPaper] = useState({});

  function togglePaperPanel(botId) {
    setExpandedPaper((prev) => ({ ...prev, [botId]: !prev[botId] }));
  }

  function handleEnable(botId) {
    setPaperConfig((prev) => ({
      ...prev,
      [botId]: {
        botId, paperTradingEnabled: true,
        virtualBalanceSOL: 10.0, virtualBalanceUSD: 1500.0,
        paperPollIntervalMin: 10, note: "",
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
    }));
  }

  function handleSave(botId, updates) {
    setPaperConfig((prev) => ({
      ...prev,
      [botId]: { ...prev[botId], ...updates, updatedAt: new Date().toISOString() },
    }));
    alert("[mock] Paper config disimpan — restart bot untuk apply perubahan.");
  }

  function handleDisable(botId) {
    setPaperConfig((prev) => {
      const next = { ...prev };
      if (next[botId]) next[botId] = { ...next[botId], paperTradingEnabled: false };
      return next;
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", padding: "var(--space-6)", overflowY: "auto", flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 className="t-display-sm">Bot manager</h1>
        <button className="btn btn-secondary" disabled title="3/3 slot terpakai">Add bot (3/3)</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "var(--space-4)" }}>
        {bots.map((b) => {
          const processing = b.status === "processing";
          const pc = paperConfig[b.id];
          const isPaperActive = pc?.paperTradingEnabled ?? false;
          const showPanel = expandedPaper[b.id];

          return (
            <div key={b.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="t-title-sm">{b.name}</span>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {isPaperActive && <IconFlask size={14} stroke={2} style={{ color: "#f97316" }} title="Paper trading aktif" />}
                  <StatusBadge status={b.status} />
                </div>
              </div>
              <div className="t-code text-muted" style={{ wordBreak: "break-all" }}>{b.wallet}</div>
              <div className="t-body-sm text-body">Uptime: {b.uptimeHours}h &middot; Posisi terbuka: {b.openPositions}</div>
              <div className="t-body-sm" style={{ color: b.allTimePnlUsd >= 0 ? "var(--success)" : "var(--error)" }}>
                All-time PnL: ${b.allTimePnlUsd.toFixed(2)}
              </div>
              <div className="t-caption" style={{ color: isPaperActive ? "#f97316" : b.dryRun ? "var(--warning)" : "var(--success)" }}>
                {isPaperActive ? "PAPER TRADING" : b.dryRun ? "DRY RUN" : "LIVE"}
              </div>
              <div className="t-caption text-muted">RAM {b.ramMb}MB &middot; CPU {b.cpuPct}%</div>

              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }}>Config</button>
                <button className="btn btn-secondary" style={{ flex: 1 }} disabled={processing}>Restart</button>
                <button className="btn btn-secondary" style={{ flex: 1 }} disabled={processing}>Stop</button>
              </div>

              {/* Paper trading toggle */}
              <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: 10, marginTop: 4 }}>
                <button
                  onClick={() => togglePaperPanel(b.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: "none", border: "none", cursor: "pointer", padding: 0,
                    color: isPaperActive ? "#f97316" : "var(--text-muted)",
                  }}
                >
                  <span className="t-body-sm" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <IconFlask size={14} stroke={2} />
                    Paper trading {isPaperActive ? "(aktif)" : "(nonaktif)"}
                  </span>
                  <span style={{ fontSize: 12 }}>{showPanel ? "▲" : "▼"}</span>
                </button>

                {showPanel && (
                  isPaperActive ? (
                    <PaperTradingPanel
                      bot={b}
                      config={pc}
                      onSave={(updates) => handleSave(b.id, updates)}
                      onDisable={() => handleDisable(b.id)}
                    />
                  ) : (
                    <EnablePaperPanel onEnable={() => handleEnable(b.id)} />
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="t-caption text-muted">Slot bot kosong diisi wallet key manual via SSH — bukan dari dashboard.</p>
      <p className="t-caption text-muted">Status "Processing" berbasis parse log — bisa tidak akurat kalau proses crash tanpa log "completed".</p>
    </div>
  );
}
