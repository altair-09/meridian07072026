import { useState } from "react";
import { Link } from "react-router-dom";
import StatCard from "../components/StatCard";
import DataTable from "../components/DataTable";
import { ruleLessons, lessonApprovalQueue as initialQueue, winLossSummary, dryRunLessons as initialDryRun } from "../mock/mockData";

const STATUS_BADGE = {
  approved: { label: "Disetujui", className: "badge badge-success" },
  rejected: { label: "Ditolak", className: "badge badge-error" },
};

const DRY_RUN_STATUS_COLORS = {
  pending: { label: "Pending", color: "var(--warning)" },
  approved: { label: "Disetujui", color: "var(--success)" },
  rejected: { label: "Ditolak", color: "var(--error)" },
};

function InfoBox({ children, variant = "warning" }) {
  const colors = {
    info: { bg: "rgba(26,38,255,0.08)", border: "rgba(26,38,255,0.25)" },
    warning: { bg: "rgba(255,171,0,0.08)", border: "rgba(255,171,0,0.35)" },
  };
  const c = colors[variant];
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: "var(--radius-control)", padding: "10px 14px",
    }}>
      <div className="t-body-sm text-body" style={{ lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

function LiveLessons() {
  const [items, setItems] = useState(initialQueue);
  const decide = (id, status) => {
    setItems((list) => list.map((x) => (x.id === id ? { ...x, status, decidedAt: new Date().toISOString() } : x)));
  };

  const pending = items.filter((x) => x.status === "pending");
  const history = items
    .filter((x) => x.status !== "pending")
    .sort((a, b) => new Date(b.decidedAt) - new Date(a.decidedAt));

  const ruleColumns = [
    { key: "label", label: "Rule" },
    { key: "trigger", label: "Trigger" },
    { key: "winRate", label: "Win rate", render: (r) => (r.winRate == null ? "—" : `${r.winRate}%`) },
    {
      key: "avgPnlUsd",
      label: "Avg PnL",
      render: (r) => (
        <span style={{ color: r.avgPnlUsd >= 0 ? "var(--success)" : "var(--error)" }}>
          {r.avgPnlUsd >= 0 ? "+" : ""}${r.avgPnlUsd.toFixed(2)}
        </span>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
        <StatCard label={winLossSummary.winLabel} value={`${winLossSummary.winPct}%`} sub={`${winLossSummary.totalClosed} posisi closed`} />
        <StatCard label={winLossSummary.lossLabel} value={`${winLossSummary.lossPct}%`} />
      </div>

      <div>
        <div className="t-title-sm" style={{ marginBottom: 12 }}>Rule performance</div>
        <DataTable columns={ruleColumns} rows={ruleLessons} rowKey={(r) => r.id} />
      </div>

      <div>
        <div className="t-title-sm" style={{ marginBottom: 12 }}>Lesson approval queue</div>
        {pending.length === 0 && <p className="t-body-sm text-muted">Tidak ada lesson menunggu approval.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {pending.map((item) => (
            <div key={item.id} className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div className="t-body-md" style={{ fontWeight: 500 }}>{item.title}</div>
                <div className="t-body-sm text-muted" style={{ marginTop: 4 }}>{item.context}</div>
                <div className="t-caption text-muted" style={{ marginTop: 4 }}>
                  Sample: {item.sampleSize} &middot; Confidence: {item.confidence}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => decide(item.id, "rejected")}>Tolak</button>
                <button className="btn btn-primary" onClick={() => decide(item.id, "approved")}>Setujui</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="t-title-sm" style={{ marginBottom: 12 }}>Riwayat keputusan</div>
        {history.length === 0 && <p className="t-body-sm text-muted">Belum ada keputusan approve/reject.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {history.map((item) => (
            <div key={item.id} className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div className="t-body-md" style={{ fontWeight: 500 }}>{item.title}</div>
                <div className="t-body-sm text-muted" style={{ marginTop: 4 }}>{item.context}</div>
                <div className="t-caption text-muted" style={{ marginTop: 4 }}>
                  Sample: {item.sampleSize} &middot; Confidence: {item.confidence} &middot; {new Date(item.decidedAt).toLocaleDateString()}
                </div>
              </div>
              <span className={STATUS_BADGE[item.status].className}>{STATUS_BADGE[item.status].label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

const DRY_RUN_FILTER_OPTIONS = ["Semua", "Pending", "Disetujui", "Ditolak"];
const FILTER_MAP = { "Semua": null, "Pending": "pending", "Disetujui": "approved", "Ditolak": "rejected" };

function DryRunLessons() {
  const [items, setItems] = useState(initialDryRun);
  const [filter, setFilter] = useState("Semua");

  function decide(id, status) {
    setItems((list) => list.map((x) =>
      x.id === id ? { ...x, status, reviewedAt: new Date().toISOString(), approvedToLiveAt: status === "approved" ? new Date().toISOString() : x.approvedToLiveAt } : x
    ));
  }

  const filterStatus = FILTER_MAP[filter];
  const displayed = filterStatus ? items.filter((x) => x.status === filterStatus) : items;
  const pendingCount = items.filter((x) => x.status === "pending").length;

  return (
    <>
      <InfoBox>
        <strong>Lesson approve dari dry run akan aktif memengaruhi keputusan bot live.</strong> Review dengan cermat sebelum approve. Lesson yang direject tetap tersimpan untuk riwayat audit.
      </InfoBox>

      <InfoBox variant="info">
        Paper trading menggunakan data harga real, tapi PnL adalah simulasi — fee dan IL dihitung dari estimasi dashboard, bukan kalkulasi on-chain aktual.
      </InfoBox>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <span className="t-title-sm">Lesson dari paper trading</span>
          {pendingCount > 0 && (
            <span className="badge badge-warning" style={{ marginLeft: 10 }}>{pendingCount} pending</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {DRY_RUN_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              style={{
                height: 30, padding: "0 12px", borderRadius: "var(--radius-control)",
                border: "1px solid var(--hairline-strong)", fontSize: 13, cursor: "pointer",
                background: filter === opt ? "var(--primary-glow)" : "var(--surface-card)",
                color: filter === opt ? "#fff" : "var(--text-body)",
                fontWeight: filter === opt ? 600 : 400,
              }}
            >{opt}</button>
          ))}
        </div>
      </div>

      {displayed.length === 0 && (
        <p className="t-body-sm text-muted">Tidak ada lesson dengan filter "{filter}".</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {displayed.map((item) => {
          const sc = DRY_RUN_STATUS_COLORS[item.status];
          const isPending = item.status === "pending";
          return (
            <div key={item.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: sc.color, flexShrink: 0 }} />
                    <span className="t-caption" style={{ color: sc.color, fontWeight: 600 }}>{sc.label}</span>
                    <span className="t-caption text-muted">{item.sourceBot}</span>
                    <span className="t-caption text-muted">&middot; {new Date(item.capturedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="t-body-md" style={{ fontWeight: 500, marginBottom: 4 }}>
                    {item.originalEntry.rule}
                  </div>
                  <div className="t-caption text-muted">
                    Tags: {item.originalEntry.tags.join(", ")} &middot; Outcome: {item.originalEntry.outcome} &middot; Confidence: {item.originalEntry.confidence}
                  </div>
                  {item.tradeRef && (
                    <div className="t-caption text-muted" style={{ marginTop: 3 }}>
                      Trade ref: <code style={{ fontSize: 11 }}>{item.tradeRef}</code>
                    </div>
                  )}
                  {item.reviewedAt && (
                    <div className="t-caption text-muted" style={{ marginTop: 3 }}>
                      Diputuskan: {new Date(item.reviewedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
                {isPending && (
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button className="btn btn-secondary" onClick={() => decide(item.id, "rejected")}>Tolak</button>
                    <button className="btn btn-primary" onClick={() => decide(item.id, "approved")}>Setujui</button>
                  </div>
                )}
                {!isPending && (
                  <span className={item.status === "approved" ? "badge badge-success" : "badge badge-error"}>
                    {sc.label}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="t-caption text-muted">
        Lesson yang disetujui akan ditambahkan ke <code>lessons.json</code> bot live. Lesson yang ditolak tetap tersimpan di <code>dry-run-lessons.json</code> untuk audit.
      </div>
    </>
  );
}

export default function InsightsLessons() {
  const [tab, setTab] = useState("live");
  const pendingDryRun = initialDryRun.filter((x) => x.status === "pending").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", padding: "var(--space-6)", overflowY: "auto", flex: 1 }}>
      <h1 className="t-display-sm">Insights & lessons</h1>

      {/* Tab selector */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--hairline)", paddingBottom: 0 }}>
        {[
          { key: "live", label: "Live Lessons" },
          { key: "dryrun", label: "Dry Run Lessons", badge: pendingDryRun },
        ].map(({ key, label, badge }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              height: 38, padding: "0 16px", border: "none", background: "none", cursor: "pointer",
              fontSize: 14, fontWeight: tab === key ? 600 : 400,
              color: tab === key ? "var(--text-primary)" : "var(--text-muted)",
              borderBottom: tab === key ? "2px solid var(--primary-glow)" : "2px solid transparent",
              marginBottom: -1,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {label}
            {badge > 0 && (
              <span style={{
                minWidth: 18, height: 18, borderRadius: 9, background: "#f97316",
                color: "#fff", fontSize: 11, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px",
              }}>{badge}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "live" ? <LiveLessons /> : <DryRunLessons />}
    </div>
  );
}
