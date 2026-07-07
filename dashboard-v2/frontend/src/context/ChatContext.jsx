import { createContext, useContext, useState } from "react";

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  // pendingMessage: { text, target } — written by any page, consumed once by ChatPanel
  const [pendingMessage, setPendingMessage] = useState(null);
  // chatOpen: controls RightChatSidebar minimized state from outside
  const [chatOpen, setChatOpen] = useState(true);

  function injectMessage(text, target = "orchestrator") {
    setPendingMessage({ text, target });
    setChatOpen(true);
  }

  function consumePending() {
    const msg = pendingMessage;
    setPendingMessage(null);
    return msg;
  }

  return (
    <ChatContext.Provider value={{ pendingMessage, injectMessage, consumePending, chatOpen, setChatOpen }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  return useContext(ChatContext);
}
