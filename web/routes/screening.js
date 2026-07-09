import express from "express";
import { browsePools } from "../../tools/screening.js";
import { executeTool } from "../../tools/executor.js";
import { config } from "../../config.js";

const router = express.Router();

router.get("/pools", async (req, res) => {
  const mode = req.query.mode === "all" ? "all" : "recommended";
  const limit = Number(req.query.limit) || 30;
  try {
    res.json(await browsePools({ mode, limit }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Manual deploy from the web — same executeTool("deploy_position", ...) path and
// safety checks (maxPositions, duplicate pool/token, bin_step range, SOL balance)
// that SCREENER and Telegram/chat deploys already go through. No parallel logic.
router.post("/deploy", async (req, res) => {
  const { pool_address, pool_name, amount_sol, bin_step, fee_tvl_ratio, bins_below, strategy } = req.body || {};
  if (!pool_address || !amount_sol) {
    return res.status(400).json({ error: "pool_address and amount_sol are required" });
  }
  try {
    const result = await executeTool("deploy_position", {
      pool_address,
      pool_name,
      amount_y: Number(amount_sol),
      bin_step,
      fee_tvl_ratio,
      bins_below: bins_below != null ? Number(bins_below) : (config.strategy.defaultBinsBelow ?? config.strategy.minBinsBelow),
      bins_above: 0,
      strategy: strategy || config.strategy.strategy,
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
