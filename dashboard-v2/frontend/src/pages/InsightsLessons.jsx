import { useState } from "react";
import { Link } from "react-router-dom";
import StatCard from "../components/StatCard";
import DataTable from "../components/DataTable";
import { useApi } from "../hooks/useApi";
import { api } from "../api";

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
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: "var(--radius-control)", padding: "10px 14px" }}>
      <div className="t-body-sm text-body" style={{ lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

function LiveLessons() {
  const { data: lessonData, loading: lLoading } = useApi(api.lessons);
  const { data: perfData, loading: pLoading } = useApi(api.performance);
  const { data: pendingData, loading: pendLoading } = useApi(api.lessonsPending);
  const [decisions, setDecisions] = useState({});

  const lessons = lessonData?.lessons ?? [];
  const perf = perfData?.performance ?? [];
  const pending = (pendingData?.pending ?? []).filter((l) => (decisions[l.id] ?? l.status) === "pending");
  const history = (pendingData?.pending ?? []).filter((l) => (decisions[l.id] ?? l.status) !== "pending");

  const totalClosed = perf.length;
  const wins = perf.filter((p) => p.pnl_pct > 0).length;
  const winPct = totalClosed > 0 ? ((wins / totalClosed) * 100).toFixed(1) : "—";
  const lossPct = totalClosed > 0 ? (((totalClosed - wins) / totalClosed) * 100).toFixed(1) : "—";

  const ruleColumns = [
    { key: "rule", label: "Rule" },
    { key: "outcome", label: "Outcome" },
    { key: "confidence", label: "Confidence" },
    { key: "role", label: "Role" },
  ];

  function decide(id, status) {
    setDecisions((d) => ({ ...d, [id]: status }));
    fetch("/api/lessons/decide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    }).catch(() => {});
  }

  if (lLoading || pLoading || pendLoading) return <p className="t-body-sm text-muted">Memuat lessons...</p>;

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
        <StatCard label="Win rate" value={winPct !== "—" ? `${winPct}%` : "—"} sub={`${totalClosed} posisi closed`} />
        <StatCard label="Loss rate" value={lossPct !== "—" ? `${lossPct}%` : "—"} />
        <StatCard label="Total lessons" value={lessons.length} />
      </div>

      <div>
        <div className="t-title-sm" style={{ marginBottom: 12 }}>Lessons terbaru</div>
        {lessons.length === 0 ? (
          <p className="t-body-sm text-muted">Belum ada lessons tersimpan.</p>
        ) : (
          <DataTable
            columns={ruleColumns}
            rows={lessons.slice(0, 50).map((l, i) => ({ ...l, id: l.id ?? i }))}
            rowKey={(r) => r.id}
          />
        )}
      </div>

      <div>
        <div className="t-title-sm" style={{ marginBottom: 12 }}>Lesson approval queue</div>
        {pending.length === 0 && <p className="t-body-sm text-muted">Tidak ada lesson menunggu approval.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {pending.map((item) => (
            <div key={item.id} className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div className="t-body-md" style={{ fontWeight: 500 }}>{item.rule ?? item.title ?? "(no rule)"}</div>
                <div className="t-body-sm text-muted" style={{ marginTop: 4 }}>{item.context ?? item.tags?.join(", ")}</div>
                <div className="t-caption text-muted" style={{ marginTop: 4 }}>Confidence: {item.confidence ?? "—"}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => decide(item.id, "rejected")}>Tolak</button>
                <button className="btn btn-primary" onClick={() => decide(item.id, "approved")}>Setujui</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {history.length > 0 && (
        <div>
          <div className="t-title-sm" style={{ marginBottom: 12 }}>Riwayat keputusan</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {history.map((item) => {
              const status = decisions[item.id] ?? item.status;
              return (
                <div key={item.id} className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div className="t-body-md" style={{ fontWeight: 500 }}>{item.rule ?? item.title ?? "(no rule)"}</div>
                    <div className="t-body-sm text-muted" style={{ marginTop: 4 }}>{item.context ?? "—"}</div>
                  </div>
                  <span className={status === "approved" ? "badge badge-success" : "badge badge-error"}>
                    {status === "approved" ? "Disetujui" : "Ditolak"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

const DRY_RUN_FILTER_OPTIONS = ["Semua", "Pending", "Disetujui", "Ditolak"];
const FILTER_MAP = { "Semua": null, "Pending": "pending", "Disetujui": "approved", "Ditolak": "rejected" };

function DryRunLessons() {
  const { data: simData, loading } = useApi(api.sim);
  const [filter, setFilter] = useState("Semua");
  const [decisions, setDecisions] = useState({});

  const items = simData?.review ?? [];
  function decide(id, status) {
    setDecisions((d) => ({ ...d, [id]: status }));
    fetch("/api/sim/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    }).catch(() => {});
  }

  const filterStatus = FILTER_MAP[filter];
  const displayed = items.filter((x) => {
    const s = decisions[x.id] ?? x.status;
    return filterStatus ? s === filterStatus : true;
  });
  const pendingCount = items.filter((x) => (decisions[x.id] ?? x.status) === "pending").length;

  if (loading) return <p className="t-body-sm text-muted">Memuat lessons dry run...</p>;

  return (
    <>
      <InfoBox>
        <strong>Lesson approve dari dry run akan aktif memengaruhi keputusan bot live.</strong> Review dengan cermat sebelum approve.
      </InfoBox>
      <InfoBox variant="info">
        Paper trading menggunakan data harga real, tapi PnL adalah simulasi — fee dan IL dihitung dari estimasi dashboard, bukan kalkulasi on-chain aktual.
      </InfoBox>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <span className="t-title-sm">Lesson dari paper trading</span>
          {pendingCount > 0 && <span className="badge badge-warning" style={{ marginLeft: 10 }}>{pendingCount} pending</span>}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {DRY_RUN_FILTER_OPTIONS.map((opt) => (
            <button key={opt} onClick={() => setFilter(opt)} style={{
              height: 30, padding: "0 12px", borderRadius: "var(--radius-control)",
              border: "1px solid var(--hairline-strong)", fontSize: 13, cursor: "pointer",
              background: filter === opt ? "var(--primary-glow)" : "var(--surface-card)",
              color: filter === opt ? "#fff" : "var(--text-body)",
              fontWeight: filter === opt ? 600 : 400,
            }}>{opt}</button>
          ))}
        </div>
      </div>

      {displayed.length === 0 && <p className="t-body-sm text-muted">Tidak ada lesson dengan filter "{filter}".</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {displayed.map((item) => {
          const status = decisions[item.id] ?? item.status ?? "pending";
          const sc = DRY_RUN_STATUS_COLORS[status] ?? DRY_RUN_STATUS_COLORS.pending;
          const isPending = status === "pending";
          return (
            <div key={item.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: sc.color, flexShrink: 0 }} />
                    <span className="t-caption" style={{ color: sc.color, fontWeight: 600 }}>{sc.label}</span>
                    <span className="t-caption text-muted">{item.source ?? "paper"}</span>
                  </div>
                  <div className="t-body-md" style={{ fontWeight: 500, marginBottom: 4 }}>
                    {item.rule ?? item.title ?? "(no rule)"}
                  </div>
                  <div className="t-caption text-muted">
                    {item.tags?.join(", ")} {item.confidence ? `· Confidence: ${item.confidence}` : ""}
                  </div>
                </div>
                {isPending ? (
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button className="btn btn-secondary" onClick={() => decide(item.id, "rejected")}>Tolak</button>
                    <button className="btn btn-primary" onClick={() => decide(item.id, "approved")}>Setujui</button>
                  </div>
                ) : (
                  <span className={status === "approved" ? "badge badge-success" : "badge badge-error"}>{sc.label}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function InsightsLessons() {
  const [tab, setTab] = useState("live");
  const { data: simData } = useApi(api.sim);
  const pendingDryRun = (simData?.review ?? []).filter((x) => x.status === "pending").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", padding: "var(--space-6)", overflowY: "auto", flex: 1 }}>
      <h1 className="t-display-sm">Insights & lessons</h1>

      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--hairline)", paddingBottom: 0 }}>
        {[
          { key: "live", label: "Live Lessons" },
          { key: "dryrun", label: "Dry Run Lessons", badge: pendingDryRun },
        ].map(({ key, label, badge }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            height: 38, padding: "0 16px", border: "none", background: "none", cursor: "pointer",
            fontSize: 14, fontWeight: tab === key ? 600 : 400,
            color: tab === key ? "var(--text-primary)" : "var(--text-muted)",
            borderBottom: tab === key ? "2px solid var(--primary-glow)" : "2px solid transparent",
            marginBottom: -1, display: "flex", alignItems: "center", gap: 6,
          }}>
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
