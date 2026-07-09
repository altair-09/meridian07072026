import express from "express";
import { config } from "../../config.js";
import { executeTool } from "../../tools/executor.js";

const router = express.Router();

// Whitelist of sections exposed to the web editor — excludes secrets
// (llm api keys live in env, not in config.js) and internal-only fields.
const EXPOSED_SECTIONS = ["screening", "management", "risk", "strategy", "schedule", "simulation"];

router.get("/", (req, res) => {
  const safe = {};
  for (const section of EXPOSED_SECTIONS) safe[section] = config[section];
  res.json(safe);
});

router.post("/", async (req, res) => {
  const { changes } = req.body || {};
  if (!changes || typeof changes !== "object") {
    return res.status(400).json({ error: "body must be { changes: {...} }" });
  }
  try {
    const result = await executeTool("update_config", { changes, reason: "web dashboard" });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
