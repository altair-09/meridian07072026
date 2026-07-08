import { useApi } from "../hooks/useApi";
import { api } from "../api";
import DataTable from "../components/DataTable";

export default function WalletMonitor() {
  const { data, loading, error, reload } = useApi(api.wallet);

  const botWallet = data ? [{
    label: "Meridian Bot",
    address: data.address ?? "—",
    status: data.sol != null ? "aktif" : "tidak diketahui",
    solBalance: data.sol ?? 0,
    totalValueUsd: data.total_usd ?? 0,
    source: "Helius RPC",
  }] : [];

  const columns = [
    { key: "label", label: "Label" },
    { key: "address", label: "Address", render: (r) => r.address !== "—" ? <span className="t-code">{r.address.slice(0, 6)}...{r.address.slice(-4)}</span> : "—" },
    { key: "status", label: "Status" },
    { key: "solBalance", label: "SOL", render: (r) => r.solBalance.toFixed(4) },
    { key: "totalValueUsd", label: "Total value", render: (r) => `$${r.totalValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { key: "source", label: "Sumber" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", padding: "var(--space-6)", overflowY: "auto", flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 className="t-display-sm" style={{ flex: 1 }}>Wallet monitor</h1>
        <button className="btn btn-secondary" onClick={reload} disabled={loading}>Refresh</button>
      </div>
      <p className="t-body-sm text-muted">Data real dari Helius RPC — wallet bot Meridian.</p>

      {error && <p className="t-body-sm" style={{ color: "var(--error)" }}>Error: {error}</p>}
      {loading ? (
        <p className="t-body-sm text-muted">Memuat data wallet...</p>
      ) : (
        <>
          {data && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <div className="card">
                <div className="t-caption text-muted">SOL Balance</div>
                <div className="t-title-md" style={{ marginTop: 4 }}>{(data.sol ?? 0).toFixed(4)} SOL</div>
                <div className="t-caption text-muted" style={{ marginTop: 2 }}>${(data.sol_usd ?? 0).toFixed(2)}</div>
              </div>
              <div className="card">
                <div className="t-caption text-muted">Total Wallet (USD)</div>
                <div className="t-title-md" style={{ marginTop: 4 }}>${(data.total_usd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              {data.tokens && data.tokens.length > 0 && (
                <div className="card">
                  <div className="t-caption text-muted">Token lain</div>
                  <div className="t-title-md" style={{ marginTop: 4 }}>{data.tokens.length} token</div>
                </div>
              )}
            </div>
          )}
          <DataTable columns={columns} rows={botWallet} rowKey={(r) => r.address} />

          {data?.tokens && data.tokens.length > 0 && (
            <div className="card">
              <div className="t-title-sm" style={{ marginBottom: 12 }}>Token holdings</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr className="t-caption-upper text-muted">
                    <th style={{ textAlign: "left", padding: "8px 12px" }}>Mint</th>
                    <th style={{ textAlign: "left", padding: "8px 12px" }}>Amount</th>
                    <th style={{ textAlign: "left", padding: "8px 12px" }}>USD</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tokens.map((t) => (
                    <tr key={t.mint} style={{ borderTop: "1px solid var(--hairline)" }}>
                      <td style={{ padding: "8px 12px" }} className="t-code">{t.mint.slice(0, 8)}...</td>
                      <td style={{ padding: "8px 12px" }}>{t.amount}</td>
                      <td style={{ padding: "8px 12px" }}>{t.usd != null ? `$${t.usd.toFixed(2)}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
