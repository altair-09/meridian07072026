import { useState } from "react";
import { useWallet } from "../contexts/WalletContext";

export default function ConnectWalletButton({ style = {} }) {
  const { connected, publicKey, walletName, connect, disconnect, wallets } = useWallet();
  const [showPicker, setShowPicker] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [err, setErr] = useState(null);

  const shortAddr = publicKey
    ? `${publicKey.slice(0, 4)}…${publicKey.slice(-4)}`
    : null;

  if (connected && publicKey) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, ...style }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "5px 10px", borderRadius: "var(--radius-control)",
          background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)",
        }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--success)", display: "inline-block", flexShrink: 0 }} />
          <span className="t-caption" style={{ color: "var(--success)", fontWeight: 600 }}>{walletName}</span>
          <span className="t-code" style={{ fontSize: 11, color: "var(--text-muted)" }}>{shortAddr}</span>
        </div>
        <button className="btn btn-secondary" style={{ height: 30, fontSize: 11, padding: "0 8px" }} onClick={disconnect}>
          Disconnect
        </button>
      </div>
    );
  }

  if (showPicker) {
    return (
      <div style={{ position: "relative", display: "inline-block", ...style }}>
        {/* backdrop */}
        <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => { setShowPicker(false); setErr(null); }} />
        <div style={{
          position: "absolute", top: 0, right: 0, zIndex: 100,
          background: "var(--surface-card)", border: "1px solid var(--hairline-strong)",
          borderRadius: "var(--radius-control)", minWidth: 200, overflow: "hidden",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}>
          <div className="t-caption text-muted" style={{ padding: "8px 12px", borderBottom: "1px solid var(--hairline)" }}>
            Pilih wallet
          </div>

          {err && (
            <div className="t-caption" style={{ padding: "8px 12px", color: "var(--error)", background: "rgba(239,68,68,0.06)" }}>
              {err}
            </div>
          )}

          {wallets.map((w) => (
            <button
              key={w.name}
              disabled={connecting}
              onClick={async () => {
                setErr(null);
                setConnecting(true);
                try {
                  await connect(w.name);
                  setShowPicker(false);
                } catch (e) {
                  setErr(e.message);
                } finally {
                  setConnecting(false);
                }
              }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "10px 14px",
                background: "none", border: "none", cursor: w.available ? "pointer" : "default",
                color: w.available ? "var(--text-primary)" : "var(--text-muted)",
                opacity: connecting ? 0.6 : 1,
              }}
              onMouseEnter={(e) => { if (w.available) e.currentTarget.style.background = "var(--surface-card-elevated)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
            >
              <span className="t-body-sm">{w.name}</span>
              {!w.available && <span className="t-caption" style={{ color: "var(--text-muted)", fontSize: 10 }}>Tidak terinstall</span>}
            </button>
          ))}

          <div style={{ borderTop: "1px solid var(--hairline)", padding: "8px 12px" }}>
            <div className="t-caption text-muted" style={{ fontSize: 10 }}>
              Install Phantom: phantom.app · Solflare: solflare.com
            </div>
          </div>
        </div>

        <button className="btn btn-primary" style={{ height: 34, fontSize: 13, ...style }}>
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <button
      className="btn btn-primary"
      style={{ height: 34, fontSize: 13, ...style }}
      onClick={() => setShowPicker(true)}
    >
      Connect Wallet
    </button>
  );
}
