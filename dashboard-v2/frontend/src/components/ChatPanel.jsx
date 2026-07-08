import { useState, useEffect, useRef, useCallback } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { useChatContext } from "../context/ChatContext";

const MERIDIAN_TARGET = { id: "meridian", label: "Meridian AI" };
const TARGETS = [MERIDIAN_TARGET, { id: "orchestrator", label: "Orchestrator (soon)" }];

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
  const [target, setTarget] = useState(MERIDIAN_TARGET.id);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [pendingId, setPendingId] = useState(null); // chat request ID awaiting SSE response
  const timeoutRef = useRef(null);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const { pendingMessage, consumePending } = useChatContext();

  // Consume injected message from context (e.g. activity row click)
  useEffect(() => {
    if (!pendingMessage) return;
    const { text, target: newTarget } = consumePending();
    setTarget(newTarget || MERIDIAN_TARGET.id);
    setInput(text);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [pendingMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // SSE listener for chat responses
  useEffect(() => {
    let es; let dead = false; let retryTimer;
    function connect() {
      if (dead) return;
      es = new EventSource("/api/events");
      es.addEventListener("chat_response", (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.status === "done" || data.status === "error" || data.status === "busy") {
            setPendingId((cur) => {
              if (cur !== data.id) return cur; // not our request
              clearTimeout(timeoutRef.current); timeoutRef.current = null;
              setMessages((prev) => {
                const withoutThinking = prev.filter((m) => m._thinking !== true);
                return [...withoutThinking, {
                  role: "assistant",
                  content: data.content || "Bot tidak merespons.",
                }];
              });
              return null;
            });
          }
        } catch { /* ignore parse errors */ }
      });
      es.onerror = () => { es.close(); if (!dead) retryTimer = setTimeout(connect, 3000); };
    }
    connect();
    return () => { dead = true; clearTimeout(retryTimer); es?.close(); };
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || pendingId) return;

    const userMsg = { role: "user", content: text };
    const thinkingMsg = { role: "assistant", content: "⏳ Berpikir...", _thinking: true };
    setMessages((prev) => [...prev, userMsg, thinkingMsg]);
    setInput("");

    if (target !== MERIDIAN_TARGET.id) {
      // Non-Meridian targets not yet implemented
      setMessages((prev) => {
        const withoutThinking = prev.filter((m) => m._thinking !== true);
        return [...withoutThinking, { role: "assistant", content: "Target ini belum tersedia. Pilih Meridian AI untuk komunikasi nyata dengan bot." }];
      });
      return;
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim pesan");
      setPendingId(data.id);

      // Timeout: if bot doesn't respond in 60s, show error
      timeoutRef.current = setTimeout(() => {
        setPendingId((cur) => {
          if (cur !== data.id) return cur;
          setMessages((prev) => {
            const withoutThinking = prev.filter((m) => m._thinking !== true);
            return [...withoutThinking, {
              role: "assistant",
              content: "⏱️ Bot tidak merespons dalam 60 detik. Pastikan Meridian sedang berjalan (`node index.js`).",
            }];
          });
          return null;
        });
      }, 60_000);
    } catch (err) {
      clearTimeout(timeoutRef.current); timeoutRef.current = null;
      setMessages((prev) => {
        const withoutThinking = prev.filter((m) => m._thinking !== true);
        return [...withoutThinking, { role: "assistant", content: `Error: ${err.message}` }];
      });
    }
  }, [input, pendingId, target]);

  const isSending = !!pendingId;

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", height: 420 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        <span className="t-title-sm">Chat</span>
        <BotSelect value={target} onChange={setTarget} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.length === 0 && (
          <div className="t-body-sm text-muted">
            {target === MERIDIAN_TARGET.id
              ? "Tanya Meridian AI tentang posisi, kandidat pool, atau strategi LP."
              : "Target ini belum tersedia."}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div
              className="t-body-sm"
              style={{
                maxWidth: "85%", borderRadius: "var(--radius-card)", padding: "8px 12px",
                background: m.role === "user" ? "rgba(0, 7, 205, 0.15)" : "var(--surface-card-elevated)",
                border: m.role === "user" ? "1px solid var(--primary)" : "none",
                opacity: m._thinking ? 0.6 : 1,
                fontStyle: m._thinking ? "italic" : "normal",
                whiteSpace: "pre-wrap",
              }}
            >
              {m.content}
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
          placeholder={isSending ? "Menunggu respons bot..." : "Tanya Meridian AI..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isSending}
        />
        <button className="btn btn-primary" type="submit" disabled={!input.trim() || isSending}>
          {isSending ? "..." : "Kirim"}
        </button>
      </form>
    </div>
  );
}
