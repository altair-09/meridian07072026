// Generic table that collapses to a vertical card list under 640px (spec §10).
export default function DataTable({ columns, rows, rowKey }) {
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="t-caption-upper text-muted"
                style={{ textAlign: "left", padding: "12px 16px", borderBottom: "1px solid var(--hairline)" }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="data-row">
              {columns.map((col) => (
                <td
                  key={col.key}
                  data-label={col.label}
                  className="t-body-sm"
                  style={{ padding: "12px 16px", borderBottom: "1px solid var(--hairline)" }}
                >
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="t-body-sm text-muted" style={{ padding: 16 }}>Tidak ada data.</div>
      )}
    </div>
  );
}
