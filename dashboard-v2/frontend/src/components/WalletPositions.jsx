import { useEffect, useState } from "react";
import { useWallet } from "../contexts/WalletContext";
import { apiFetch } from "../api";
import ConnectWalletButton from "./ConnectWalletButton";

function fmt(n, decimals = 4) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "0";
  return v.toFixed(decimals);
}

export default function WalletPositions() {
  const { connected, publicKey } = useWallet();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!connected || !publicKey) { setPositions([]); return; }
    setLoading(true);
    setError(null);
    apiFetch(`/api/wallet/${publicKey}/positions`)
      .then((d) => setPositions(d.positions ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [connected, publicKey]);

  if (!connected) {
    return (
      <div style={{ padding: "32px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div className="t-body-sm text-muted">Connect wallet untuk melihat posisi on-chain Anda</div>
        <ConnectWalletButton />
      </div>
    );
  }

  if (loading) return <div className="t-body-sm text-muted" style={{ padding: "24px 0" }}>Memuat posisi...</div>;
  if (error) return <div className="t-body-sm" style={{ color: "var(--error)", padding: "24px 0" }}>Error: {error}</div>;
  if (positions.length === 0) return (
    <div style={{ padding: "24px 0", textAlign: "center" }}>
      <div className="t-body-sm text-muted">Tidak ada posisi aktif di wallet ini</div>
      <div className="t-caption text-muted" style={{ marginTop: 6 }}>
        {publicKey.slice(0, 8)}…{publicKey.slice(-8)}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="t-caption text-muted" style={{ marginBottom: 4 }}>
        {positions.length} posisi aktif · {publicKey.slice(0, 6)}…{publicKey.slice(-6)}
      </div>
      {positions.map((p) => (
        <div key={p.position} style={{
          padding: "12px 14px", borderRadius: "var(--radius-control)",
          background: "var(--surface-card-elevated)", border: "1px solid var(--hairline)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="t-title-sm">{p.pool_name || `${p.base_symbol}/${p.quote_symbol}`}</div>
              <div className="t-code" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                {p.position.slice(0, 8)}…{p.position.slice(-8)}
              </div>
            </div>
            <div style={{
              fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
              background: p.in_range === true ? "rgba(34,197,94,0.15)" : p.in_range === false ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.06)",
              color: p.in_range === true ? "var(--success)" : p.in_range === false ? "var(--error)" : "var(--text-muted)",
            }}>
              {p.in_range === true ? "In Range" : p.in_range === false ? "Out of Range" : "—"}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
            <div>
              <div className="t-caption text-muted">Base ({p.base_symbol})</div>
              <div className="t-code" style={{ fontSize: 12 }}>{fmt(p.total_x_amount, 4)}</div>
            </div>
            <div>
              <div className="t-caption text-muted">Quote ({p.quote_symbol})</div>
              <div className="t-code" style={{ fontSize: 12 }}>{fmt(p.total_y_amount, 4)}</div>
            </div>
            <div>
              <div className="t-caption text-muted">Bin Range</div>
              <div className="t-code" style={{ fontSize: 12 }}>{p.lower_bin_id} – {p.upper_bin_id}</div>
            </div>
          </div>
          {(Number(p.fee_x_pending) > 0 || Number(p.fee_y_pending) > 0) && (
            <div style={{ marginTop: 8, display: "flex", gap: 12 }}>
              <div className="t-caption" style={{ color: "var(--warning)" }}>
                Unclaimed fees: {fmt(p.fee_x_pending, 4)} {p.base_symbol} + {fmt(p.fee_y_pending, 4)} {p.quote_symbol}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
