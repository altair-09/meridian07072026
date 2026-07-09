// Shared conversation history for the GENERAL-role chat, reused by both the
// Telegram/REPL path (index.js) and the web chat route — a single source of
// truth so a conversation started on one channel continues on the other.
export const sessionHistory = [];
const MAX_HISTORY = 20; // keep last 20 messages (10 exchanges)

export function appendHistory(userMsg, assistantMsg) {
  sessionHistory.push({ role: "user", content: userMsg });
  sessionHistory.push({ role: "assistant", content: assistantMsg });
  if (sessionHistory.length > MAX_HISTORY) {
    sessionHistory.splice(0, sessionHistory.length - MAX_HISTORY);
  }
}
