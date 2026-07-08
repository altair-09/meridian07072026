import { useState, useEffect } from "react";
import { useWallet } from "../contexts/WalletContext";
import { apiFetch } from "../api";
import ConnectWalletButton from "./ConnectWalletButton";

const STRATEGIES = ["spot", "curve", "bid_ask"];

function money(n) {
  if (!n || !Number.isFinite(Number(n))) return "—";
  const v = Number(n);
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(2)}K`;
  return `$${v.toFixed(2)}`;
}

export default function CreatePositionPanel({ pool }) {
  const { connected, publicKey, signTransaction } = useWallet();

  const [strategy, setStrategy] = useState("spot");
  const [amountSol, setAmountSol] = useState("0.5");
  const [binsBelow, setBinsBelow] = useState(35);
  const [binsAbove, setBinsAbove] = useState(35);

  const [poolDetail, setPoolDetail] = useState(null);
  const [building, setBuilding] = useState(false);
  const [txStatus, setTxStatus] = useState(null);

  useEffect(() => {
    if (!pool?.pool) return;
    apiFetch(`/api/pool/${pool.pool}`)
      .then(setPoolDetail)
      .catch(() => setPoolDetail(null));
  }, [pool?.pool]);

  const feeBreak = poolDetail?.fee_breakdown;
  const activeBin = poolDetail?.active_bin ?? 0;
  const minBin = activeBin - binsBelow;
  const maxBin = activeBin + binsAbove;
  const totalBins = binsBelow + binsAbove + 1;

  async function handleCreate() {
    if (!connected || !publicKey) return;
    setBuilding(true);
    setTxStatus(null);
    try {
      const lamportsPerSol = 1_000_000_000;
      const amountY = Math.floor(Number(amountSol) * lamportsPerSol);

      // 1. Backend builds the serialized transaction
      const result = await apiFetch("/api/trade/build-position-tx", {
        method: "POST",
        body: JSON.stringify({
          pool_address: pool.pool,
          wallet_pubkey: publicKey,
          strategy,
          amount_x: 0,
          amount_y: amountY,
          min_bin_id: minBin,
          max_bin_id: maxBin,
        }),
      });

      if (!result.ok) throw new Error(result.error ?? "Build transaction gagal");

      // 2. Deserialize → sign via wallet (Phantom/Solflare)
      const txBytes = Uint8Array.from(atob(result.transaction), (c) => c.charCodeAt(0));

      // Use wallet's signTransaction (returns signed tx bytes or object)
      const signed = await signTransaction({ serialize: () => txBytes, _bytes: txBytes });

      // 3. Broadcast via backend RPC proxy
      const broadcastResult = await apiFetch("/api/trade/broadcast-tx", {
        method: "POST",
        body: JSON.stringify({
          signed_tx: btoa(String.fromCharCode(...(signed.serialize?.() ?? signed._bytes ?? txBytes))),
        }),
      });

      setTxStatus({ ok: true, message: "Posisi berhasil dibuat!", signature: broadcastResult.signature });
    } catch (e) {
      setTxStatus({ ok: false, message: e.message });
    } finally {
      setBuilding(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Amount */}
      <div>
        <div className="t-caption text-muted" style={{ marginBottom: 6 }}>Amount SOL</div>
        <div style={{ background: "var(--surface-card-elevated)", border: "1px solid var(--hairline-strong)", borderRadius: "var(--radius-control)", padding: "10px 12px" }}>
          <input
            type="number" min="0.01" step="0.1"
            value={amountSol}
            onChange={(e) => setAmountSol(e.target.value)}
            style={{ width: "100%", background: "none", border: "none", color: "var(--text-primary)", fontSize: 20, fontWeight: 700, outline: "none" }}
          />
          <div className="t-caption text-muted">≈ ${(Number(amountSol) * 150).toFixed(2)} USD</div>
        </div>
      </div>

      {/* Strategy */}
      <div>
        <div className="t-caption text-muted" style={{ marginBottom: 6 }}>Strategy</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          {STRATEGIES.map((s) => (
            <button
              key={s}
              onClick={() => setStrategy(s)}
              style={{
                padding: "8px 4px", borderRadius: "var(--radius-control)", cursor: "pointer",
                border: `1px solid ${strategy === s ? "var(--primary)" : "var(--hairline-strong)"}`,
                background: strategy === s ? "var(--primary)" : "var(--surface-card-elevated)",
                color: strategy === s ? "#fff" : "var(--text-muted)",
                fontSize: 12, fontWeight: 600, textTransform: "capitalize",
              }}
            >
              {s === "bid_ask" ? "Bid Ask" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span className="t-caption text-muted">Price Range</span>
          <span className="t-caption" style={{ color: "var(--primary-glow)" }}>{totalBins} bins · active: {activeBin}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ background: "var(--surface-card-elevated)", border: "1px solid var(--hairline-strong)", borderRadius: "var(--radius-control)", padding: "8px 12px" }}>
            <div className="t-caption text-muted">Bins below</div>
            <input type="number" min={1} max={69} value={binsBelow} onChange={(e) => setBinsBelow(Number(e.target.value))}
              style={{ width: "100%", background: "none", border: "none", color: "var(--text-primary)", fontSize: 16, fontWeight: 600, outline: "none" }} />
            <div className="t-caption text-muted">bin {minBin}</div>
          </div>
          <div style={{ background: "var(--surface-card-elevated)", border: "1px solid var(--hairline-strong)", borderRadius: "var(--radius-control)", padding: "8px 12px" }}>
            <div className="t-caption text-muted">Bins above</div>
            <input type="number" min={1} max={69} value={binsAbove} onChange={(e) => setBinsAbove(Number(e.target.value))}
              style={{ width: "100%", background: "none", border: "none", color: "var(--text-primary)", fontSize: 16, fontWeight: 600, outline: "none" }} />
            <div className="t-caption text-muted">bin {maxBin}</div>
          </div>
        </div>
        <div style={{ marginTop: 8, height: 36, borderRadius: "var(--radius-control)", background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, background: "var(--warning)", opacity: 0.7 }} />
          <span className="t-caption text-muted" style={{ fontSize: 10 }}>bin {minBin} ─── active ─── bin {maxBin}</span>
        </div>
      </div>

      {/* Fee breakdown realtime */}
      {feeBreak ? (
        <div style={{ background: "var(--surface-card-elevated)", border: "1px solid var(--hairline)", borderRadius: "var(--radius-control)", padding: "10px 12px" }}>
          <div className="t-caption" style={{ fontWeight: 600, marginBottom: 8 }}>Fee breakdown (24h real)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[
              ["Base fee rate", `${feeBreak.base_fee_rate}%`],
              ["Dynamic fee rate", `+${feeBreak.dynamic_fee_rate.toFixed(4)}%`],
              ["LP fees 24h", money(feeBreak.lp_fees_24h)],
              ["Protocol fees 24h", money(feeBreak.protocol_fees_24h)],
              ["Total fees 24h", money(feeBreak.total_fees_24h)],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="t-caption text-muted">{k}</span>
                <span className="t-caption" style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="t-caption text-muted">Memuat fee breakdown...</div>
      )}

      {/* Tx status */}
      {txStatus && (
        <div style={{
          padding: "10px 12px", borderRadius: "var(--radius-control)",
          background: txStatus.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
          border: `1px solid ${txStatus.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
        }}>
          <div className="t-body-sm" style={{ color: txStatus.ok ? "var(--success)" : "var(--error)" }}>
            {txStatus.message}
          </div>
          {txStatus.signature && (
            <div className="t-code" style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, wordBreak: "break-all" }}>
              sig: {txStatus.signature}
            </div>
          )}
        </div>
      )}

      {/* CTA */}
      {connected ? (
        <button
          className="btn btn-primary"
          style={{ width: "100%", height: 44, fontSize: 15, fontWeight: 700 }}
          disabled={building}
          onClick={handleCreate}
        >
          {building ? "Membangun & mengirim transaksi..." : `Create Position · ${amountSol} SOL`}
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch" }}>
          <div className="t-caption text-muted" style={{ textAlign: "center" }}>
            Connect wallet untuk membuat posisi on-chain
          </div>
          <ConnectWalletButton />
        </div>
      )}
    </div>
  );
}
