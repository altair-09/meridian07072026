import express from "express";
import { agentLoop } from "../../agent.js";
import { config } from "../../config.js";
import { sessionHistory, appendHistory } from "../../chat-history.js";

const router = express.Router();

// Same GENERAL-role call the Telegram/REPL chat already uses (agent.js
// agentLoop) — no new decision logic, just a second entry point into it.
router.post("/", async (req, res) => {
  const { message } = req.body || {};
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message is required" });
  }
  try {
    const { content } = await agentLoop(
      message,
      config.llm.maxSteps,
      sessionHistory,
      "GENERAL",
      config.llm.generalModel,
      null,
      { interactive: true },
    );
    appendHistory(`[Web] ${message}`, content);
    res.json({ reply: content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/history", (req, res) => {
  res.json({ history: sessionHistory });
});

export default router;
