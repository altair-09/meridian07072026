import { useEffect } from "react";
import { IconMessageChatbot, IconChevronRight } from "@tabler/icons-react";
import ChatPanel from "./ChatPanel";
import { useChatContext } from "../context/ChatContext";

export default function RightChatSidebar() {
  const { chatOpen, setChatOpen, pendingMessage } = useChatContext();

  // Auto-open when a message is injected from outside (e.g. activity row click)
  useEffect(() => {
    if (pendingMessage) setChatOpen(true);
  }, [pendingMessage, setChatOpen]);

  if (!chatOpen) {
    return (
      <button
        onClick={() => setChatOpen(true)}
        aria-label="Buka chat"
        className="btn btn-primary"
        style={{
          position: "fixed", top: 96, right: 0,
          borderTopRightRadius: 0, borderBottomRightRadius: 0,
          padding: "10px 12px", zIndex: 25,
        }}
      >
        <IconMessageChatbot size={18} stroke={1.75} />
      </button>
    );
  }

  return (
    <div
      className="right-chat-sidebar"
      style={{
        width: 340, flexShrink: 0, borderLeft: "1px solid var(--hairline)",
        padding: "var(--space-4)", position: "sticky", top: 0,
        height: "100vh", overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button
          onClick={() => setChatOpen(false)}
          aria-label="Minimize chat"
          className="btn btn-secondary"
          style={{ height: 32, width: 32, padding: 0 }}
        >
          <IconChevronRight size={16} stroke={1.75} />
        </button>
      </div>
      <ChatPanel />
    </div>
  );
}
