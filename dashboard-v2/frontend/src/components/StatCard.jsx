export default function StatCard({ label, value, sub }) {
  return (
    <div className="card">
      <div className="t-caption-upper text-muted" style={{ marginBottom: 8 }}>{label}</div>
      <div className="t-display-sm">{value}</div>
      {sub && <div className="t-caption text-muted" style={{ marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
