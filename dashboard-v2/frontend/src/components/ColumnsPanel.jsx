import { useState } from "react";
import { IconGripVertical } from "@tabler/icons-react";
import { COLUMN_DEFS, DEFAULT_COLUMN_ORDER } from "../mock/poolColumns";

export default function ColumnsPanel({ order, visible, onChange, onClose }) {
  const [dragIndex, setDragIndex] = useState(null);
  const byKey = Object.fromEntries(COLUMN_DEFS.map((c) => [c.key, c]));

  const toggle = (key) => {
    const col = byKey[key];
    if (!col.available) return;
    const next = new Set(visible);
    next.has(key) ? next.delete(key) : next.add(key);
    onChange({ order, visible: next });
  };

  const reset = () => {
    onChange({ order: DEFAULT_COLUMN_ORDER, visible: new Set(COLUMN_DEFS.filter((c) => c.default).map((c) => c.key)) });
  };

  const handleDrop = (targetIndex) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...order];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    onChange({ order: next, visible });
    setDragIndex(null);
  };

  return (
    <div className="card" style={{ maxWidth: 340, maxHeight: 460, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span className="t-title-sm">Columns</span>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button onClick={reset} className="t-body-sm" style={{ background: "none", border: "none", color: "#ff8a4c", cursor: "pointer" }}>Reset</button>
          {onClose && <button onClick={onClose} aria-label="Tutup" style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>&times;</button>}
        </div>
      </div>
      <div style={{ overflowY: "auto" }}>
        {order.map((key, i) => {
          const col = byKey[key];
          if (!col) return null;
          const checked = visible.has(key);
          return (
            <div
              key={key}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(i)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 6px",
                borderRadius: "var(--radius-control)",
                background: dragIndex === i ? "var(--surface-strong)" : "transparent",
                opacity: col.available ? 1 : 0.45,
              }}
              title={col.available ? undefined : col.reason}
            >
              <button
                onClick={() => toggle(key)}
                disabled={!col.available}
                aria-label={checked ? `Sembunyikan ${col.label}` : `Tampilkan ${col.label}`}
                style={{
                  width: 22, height: 22, borderRadius: 6, border: "none", flexShrink: 0,
                  background: checked && col.available ? "#ff6a1a" : "var(--surface-strong)",
                  color: "#fff", cursor: col.available ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
                }}
              >
                {checked && col.available ? "✓" : ""}
              </button>
              <span className="t-body-sm" style={{ flex: 1, color: col.available ? "var(--text-primary)" : "var(--text-muted)" }}>
                {col.label}
              </span>
              <IconGripVertical size={16} stroke={1.5} style={{ color: "var(--text-muted-soft)", cursor: "grab" }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
