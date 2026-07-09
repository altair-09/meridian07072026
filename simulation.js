/**
 * Paper-trading simulation cycle — evaluates open sim-state.json positions
 * against REAL, live market data (same pool, same time as real trading) and
 * closes them using the exact same stop-loss/take-profit/OOR thresholds real
 * positions use (config.management). Never touches real positions/state.js.
 *
 * PnL estimate is an approximation, not a claim of ground truth: fee accrual
 * is derived from the pool's real fee/active-TVL ratio prorated by time held;
 * price/IL movement is NOT modeled (a real position's exact value curve
 * depends on bin-level liquidity math this module deliberately doesn't
 * duplicate). The dashboard labels this PnL "estimated".
 */
import { config } from "./config.js";
import { getPoolDetail } from "./tools/screening.js";
import { getActiveBin } from "./tools/dlmm.js";
import { log } from "./logger.js";
import {
  listSimPositions,
  markSimOutOfRange,
  markSimInRange,
  updateSimPeak,
  closeSimPosition,
} from "./sim-state.js";

function estimatePnlPct(pos, feeActiveTvlRatio24h, minutesHeld) {
  const dailyFeePct = Number(feeActiveTvlRatio24h ?? pos.entry_fee_tvl_24h ?? 0);
  const days = minutesHeld / 1440;
  return Math.round(dailyFeePct * days * 100) / 100;
}

async function evaluateOne(pos) {
  const minutesHeld = Math.floor((Date.now() - new Date(pos.deployed_at).getTime()) / 60000);

  let pool, activeBin;
  try {
    [pool, activeBin] = await Promise.all([
      getPoolDetail({ pool_address: pos.pool }).catch(() => null),
      getActiveBin({ pool_address: pos.pool }).catch(() => null),
    ]);
  } catch {
    return; // pool data unavailable this tick — try again next cycle
  }

  const feeRatio = pool?.fee_active_tvl_ratio ?? pos.entry_fee_tvl_24h ?? 0;
  const pnlPct = estimatePnlPct(pos, feeRatio, minutesHeld);
  updateSimPeak(pos.id, pnlPct);

  const active = activeBin?.active_bin ?? activeBin?.activeId ?? null;
  const inRange = active != null && pos.bin_range?.min != null && pos.bin_range?.max != null
    ? active >= pos.bin_range.min && active <= pos.bin_range.max
    : true;
  if (inRange) markSimInRange(pos.id); else markSimOutOfRange(pos.id);

  const mgmt = config.management;

  if (mgmt.takeProfitPct != null && pnlPct >= mgmt.takeProfitPct) {
    return closeSimPosition(pos.id, { pnl_pct: pnlPct, pnl_usd: null, close_reason: "TAKE_PROFIT (estimated)", minutes_held: minutesHeld });
  }
  if (mgmt.stopLossPct != null && pnlPct <= mgmt.stopLossPct) {
    return closeSimPosition(pos.id, { pnl_pct: pnlPct, pnl_usd: null, close_reason: "STOP_LOSS (estimated)", minutes_held: minutesHeld });
  }
  if (!inRange) {
    const minutesOOR = Math.floor((Date.now() - new Date(pos.out_of_range_since || Date.now()).getTime()) / 60000);
    if (minutesOOR >= mgmt.outOfRangeWaitMinutes) {
      return closeSimPosition(pos.id, { pnl_pct: pnlPct, pnl_usd: null, close_reason: `OUT_OF_RANGE (${minutesOOR}m)`, minutes_held: minutesHeld });
    }
  }
}

const THROTTLE_MS = 200;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function runSimulationCycle() {
  const open = listSimPositions({ openOnly: true });
  if (open.length === 0) return;
  log("sim_cycle", `Evaluating ${open.length} open simulated position(s)`);
  let closedCount = 0;
  for (const pos of open) {
    try {
      const result = await evaluateOne(pos);
      if (result) closedCount++;
    } catch (e) {
      log("sim_cycle_error", `Failed evaluating sim position ${pos.id}: ${e.message}`);
    }
    await sleep(THROTTLE_MS); // avoid hammering the RPC/pool-detail API
  }
  if (closedCount > 0) log("sim_cycle", `Closed ${closedCount} simulated position(s) this cycle`);
}
