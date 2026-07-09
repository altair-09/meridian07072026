import express from "express";
import { getMyPositions } from "../../tools/dlmm.js";
import { getRecentDecisions } from "../../decision-log.js";
import { getTokenUsageSummary } from "../../token-usage.js";
import { getWalletBalances } from "../../tools/wallet.js";

const router = express.Router();

// force:false — reuses the same cache the management cron already maintains,
// the dashboard never triggers extra RPC calls on its own.
router.get("/positions", async (req, res) => {
  try {
    const data = await getMyPositions({ force: false, silent: true });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/token-usage", (req, res) => {
  const hours = Number(req.query.hours) || 24;
  res.json(getTokenUsageSummary({ hours }));
});

router.get("/decisions", (req, res) => {
  const limit = Number(req.query.limit) || 30;
  res.json({ decisions: getRecentDecisions(limit) });
});

// 60-second cache so rapid page refreshes don't hammer the Helius RPC.
let _walletCache = null;
let _walletCacheAt = 0;
const WALLET_CACHE_TTL = 60_000;

router.get("/wallet", async (req, res) => {
  try {
    if (Date.now() - _walletCacheAt < WALLET_CACHE_TTL && _walletCache) {
      return res.json(_walletCache);
    }
    const data = await getWalletBalances();
    _walletCache = data;
    _walletCacheAt = Date.now();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
