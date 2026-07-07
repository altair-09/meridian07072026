import { useState } from "react";

export default function InfoDot({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Info"
        style={{
          width: 18, height: 18, borderRadius: "50%", border: "none",
          background: "var(--surface-strong)", color: "var(--text-body)",
          fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        i
      </button>
      {open && (
        <div
          onMouseLeave={() => setOpen(false)}
          className="t-caption"
          style={{
            position: "absolute", zIndex: 20, top: 22, right: 0, width: 240,
            background: "var(--surface-card-elevated)", border: "1px solid var(--hairline-strong)",
            borderRadius: "var(--radius-control)", padding: 10, color: "var(--text-body)",
          }}
        >
          {text}
        </div>
      )}
    </span>
  );
}
