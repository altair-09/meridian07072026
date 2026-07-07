import { useState } from "react";
import DataTable from "../components/DataTable";
import { walletMonitor } from "../mock/mockData";

export default function WalletMonitor() {
  const [newAddress, setNewAddress] = useState("");

  const columns = [
    { key: "label", label: "Label" },
    { key: "address", label: "Address", render: (r) => <span className="t-code">{r.address.slice(0, 6)}...{r.address.slice(-4)}</span> },
    { key: "status", label: "Status" },
    { key: "solBalance", label: "SOL", render: (r) => r.solBalance.toFixed(2) },
    { key: "totalValueUsd", label: "Total value", render: (r) => `$${r.totalValueUsd.toLocaleString()}` },
    { key: "source", label: "Sumber" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", padding: "var(--space-6)", overflowY: "auto", flex: 1 }}>
      <h1 className="t-display-sm">Wallet monitor</h1>
      <p className="t-body-sm text-muted">Read-only — data dari RPC Solana langsung.</p>

      <DataTable columns={columns} rows={walletMonitor} rowKey={(r) => r.address} />

      <div className="card">
        <div className="t-title-sm" style={{ marginBottom: 12 }}>Tambah wallet</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            className="input"
            style={{ flex: 1, minWidth: 240 }}
            placeholder="Alamat publik Solana (BUKAN private key)"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
          />
          <button className="btn btn-primary">Tambah</button>
        </div>
        <p className="t-caption text-muted" style={{ marginTop: 8 }}>
          Hanya menerima address publik untuk dipantau — private key tidak pernah diminta di sini.
        </p>
      </div>
    </div>
  );
}
