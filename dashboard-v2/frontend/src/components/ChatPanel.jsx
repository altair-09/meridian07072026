import { useState, useEffect, useRef } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { chatHistoryByTarget, bots } from "../mock/mockData";
import { useChatContext } from "../context/ChatContext";

const TARGETS = [...bots.map((b) => ({ id: b.id, label: b.name })), { id: "orchestrator", label: "Orchestrator" }];

function BotSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = TARGETS.find((t) => t.id === value) || TARGETS[0];

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "var(--surface-card-elevated)", border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-control)", height: 36, padding: "0 10px 0 12px",
          color: "var(--text-primary)", fontSize: 14, cursor: "pointer",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected.label}</span>
        <IconChevronDown size={14} stroke={2} style={{
          flexShrink: 0, marginLeft: 6, color: "var(--text-muted)",
          transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s",
        }} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
          background: "var(--surface-card-elevated)", border: "1px solid var(--hairline-strong)",
          borderRadius: "var(--radius-control)", overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}>
          {TARGETS.map((t) => (
            <button key={t.id} type="button" onClick={() => { onChange(t.id); setOpen(false); }}
              style={{
                width: "100%", textAlign: "left", padding: "9px 12px",
                background: t.id === value ? "rgba(26,38,255,0.12)" : "none", border: "none",
                color: t.id === value ? "var(--primary-glow)" : "var(--text-primary)", fontSize: 14, cursor: "pointer",
              }}
            >{t.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChatPanel() {
  const [target, setTarget] = useState(TARGETS[0].id);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState(() => ({ ...chatHistoryByTarget }));
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const { pendingMessage, consumePending } = useChatContext();

  // Consume injected message from context (e.g. activity row click)
  useEffect(() => {
    if (!pendingMessage) return;
    const { text, target: newTarget } = consumePending();
    setTarget(newTarget);
    setInput(text);
    // Focus the input so user sees the pre-filled message
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [pendingMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, target]);

  const messages = history[target] || [];

  function handleSubmit(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    const userMsg = { role: "user", content: text };
    // Stub bot reply — in production this calls the backend
    const botReply = {
      role: "assistant",
      content: `[mock] Menerima pesan untuk ${TARGETS.find((t) => t.id === target)?.label}: "${text}"`,
      tokens: Math.floor(Math.random() * 400 + 100),
      costUsd: +(Math.random() * 0.003 + 0.001).toFixed(4),
    };

    setHistory((prev) => ({
      ...prev,
      [target]: [...(prev[target] || []), userMsg, botReply],
    }));
    setInput("");
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", height: 420 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        <span className="t-title-sm">Chat</span>
        <BotSelect value={target} onChange={setTarget} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.length === 0 && (
          <div className="t-body-sm text-muted">Belum ada percakapan.</div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div
              className="t-body-sm"
              style={{
                maxWidth: "85%", borderRadius: "var(--radius-card)", padding: "8px 12px",
                background: m.role === "user" ? "rgba(0, 7, 205, 0.15)" : "var(--surface-card-elevated)",
                border: m.role === "user" ? "1px solid var(--primary)" : "none",
              }}
            >
              <div>{m.content}</div>
              {m.role === "assistant" && (
                <div className="t-caption text-muted" style={{ marginTop: 4 }}>
                  {m.tokens} token &middot; ${m.costUsd.toFixed(4)}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", gap: 8, marginTop: 12, borderTop: "1px solid var(--hairline)", paddingTop: 12 }}
      >
        <input
          ref={inputRef}
          className="input"
          style={{ flex: 1 }}
          placeholder="Tanya bot..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="btn btn-primary" type="submit" disabled={!input.trim()}>Kirim</button>
      </form>
    </div>
  );
}
