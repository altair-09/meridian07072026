/**
 * Paper-trading state — sim-state.json. Fully separate from state.json/real
 * positions: a simulated position has no on-chain account, so it can never be
 * confused with a real one (real positions are only ever discovered via
 * on-chain getMyPositions() RPC calls).
 *
 * Deliberately does NOT reuse lessons.js's recordPerformance() for closes —
 * that function auto-derives a lesson straight into the active lesson list,
 * which would bypass the human-reviewed promotion queue (sim-review.js) the
 * simulation feature exists to provide. Closed simulated performance is kept
 * in its own array here instead, read only by sim-review.js.
 */
import fs from "fs";
import { log } from "./logger.js";
import { repoPath } from "./repo-root.js";

const SIM_STATE_FILE = repoPath("sim-state.json");

function load() {
  if (!fs.existsSync(SIM_STATE_FILE)) return { positions: {}, performance: [] };
  try {
    return JSON.parse(fs.readFileSync(SIM_STATE_FILE, "utf8"));
  } catch (err) {
    log("sim_state_error", `Failed to read sim-state.json: ${err.message}`);
    return { positions: {}, performance: [] };
  }
}

function save(state) {
  try {
    fs.writeFileSync(SIM_STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    log("sim_state_error", `Failed to write sim-state.json: ${err.message}`);
  }
}

/**
 * @param {"full_paper"|"shadow_skip"|"ab_test"} scenario
 */
export function trackSimPosition({
  pool,
  pool_name,
  base_mint,
  scenario,
  strategy,
  bin_range = {},
  amount_sol,
  active_bin,
  bin_step,
  fee_tvl_ratio,
  reasoning = null,
}) {
  const state = load();
  const id = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  state.positions[id] = {
    id,
    pool,
    pool_name,
    base_mint,
    scenario,
    strategy,
    bin_range,
    amount_sol,
    active_bin_at_entry: active_bin,
    bin_step,
    entry_fee_tvl_24h: fee_tvl_ratio,
    reasoning,
    deployed_at: new Date().toISOString(),
    out_of_range_since: null,
    peak_pnl_pct: 0,
    closed: false,
  };
  save(state);
  log("sim_state", `Tracked simulated position ${id} (${scenario}) in pool ${pool}`);
  return state.positions[id];
}

export function listSimPositions({ openOnly = true } = {}) {
  const state = load();
  const all = Object.values(state.positions);
  return openOnly ? all.filter((p) => !p.closed) : all;
}

export function getSimPosition(id) {
  return load().positions[id] || null;
}

export function markSimOutOfRange(id) {
  const state = load();
  const pos = state.positions[id];
  if (!pos || pos.out_of_range_since) return;
  pos.out_of_range_since = new Date().toISOString();
  save(state);
}

export function markSimInRange(id) {
  const state = load();
  const pos = state.positions[id];
  if (!pos || !pos.out_of_range_since) return;
  pos.out_of_range_since = null;
  save(state);
}

export function updateSimPeak(id, pnlPct) {
  const state = load();
  const pos = state.positions[id];
  if (!pos) return;
  if (pnlPct > (pos.peak_pnl_pct ?? 0)) {
    pos.peak_pnl_pct = pnlPct;
    save(state);
  }
}

/** Closes a simulated position and appends a performance record — never touches real lessons.js. */
export function closeSimPosition(id, { pnl_pct, pnl_usd, close_reason, minutes_held }) {
  const state = load();
  const pos = state.positions[id];
  if (!pos || pos.closed) return null;
  pos.closed = true;
  pos.closed_at = new Date().toISOString();
  const record = {
    id,
    scenario: pos.scenario,
    pool: pos.pool,
    pool_name: pos.pool_name,
    strategy: pos.strategy,
    pnl_pct,
    pnl_usd,
    close_reason,
    minutes_held,
    recorded_at: pos.closed_at,
  };
  state.performance.push(record);
  save(state);
  log("sim_state", `Simulated position ${id} closed (${close_reason}): pnl ${pnl_pct}%`);
  return record;
}

export function getSimPerformance({ scenario = null, limit = 100 } = {}) {
  const state = load();
  let perf = state.performance || [];
  if (scenario) perf = perf.filter((p) => p.scenario === scenario);
  return perf.slice(-limit);
}
