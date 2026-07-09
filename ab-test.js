/**
 * Strategy A/B test (simulation scenario 3) — dashboard-toggled, applies an
 * alternate set of the SAME deterministic numeric pre-filters the real
 * screener already applies (before the LLM ever sees candidates), against
 * the exact candidate list the real screening cycle already fetched.
 *
 * Deliberately zero extra LLM/RPC cost: the "which one wins" pick is a plain
 * numeric ranking (fee_active_tvl_ratio), not a second LLM ranking call. This
 * is a simplification vs. a true LLM-driven alt strategy, but keeps cost
 * exactly zero rather than merely bounded — documented in CLAUDE.md/plan.
 */
import { config } from "./config.js";
import { trackSimPosition } from "./sim-state.js";
import { log } from "./logger.js";

function passesAltFilters(pool, altConfig) {
  const get = (key, fallback) => (altConfig[key] != null ? altConfig[key] : fallback);
  const s = config.screening;
  if (pool.tvl != null && pool.tvl < get("minTvl", s.minTvl)) return false;
  if (pool.tvl != null && get("maxTvl", s.maxTvl) != null && pool.tvl > get("maxTvl", s.maxTvl)) return false;
  if (pool.volume_window != null && pool.volume_window < get("minVolume", s.minVolume)) return false;
  if (pool.fee_active_tvl_ratio != null && pool.fee_active_tvl_ratio < get("minFeeActiveTvlRatio", s.minFeeActiveTvlRatio)) return false;
  if (pool.bin_step != null) {
    if (pool.bin_step < get("minBinStep", s.minBinStep)) return false;
    if (pool.bin_step > get("maxBinStep", s.maxBinStep)) return false;
  }
  return true;
}

/** candidates: the already-fetched, condensed pool list from getTopCandidates(). */
export function runAbTestPass(candidates) {
  if (!config.simulation?.abTestEnabled) return null;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const altConfig = config.simulation.altConfig || {};
  const passing = candidates.filter((c) => passesAltFilters(c, altConfig));
  if (passing.length === 0) return null;

  const best = passing.reduce((a, b) =>
    (b.fee_active_tvl_ratio ?? 0) > (a.fee_active_tvl_ratio ?? 0) ? b : a
  );

  try {
    trackSimPosition({
      pool: best.pool,
      pool_name: best.name,
      base_mint: best.base?.mint,
      scenario: "ab_test",
      strategy: config.strategy.strategy,
      bin_range: { min: null, max: null },
      amount_sol: config.management.deployAmountSol,
      active_bin: null,
      bin_step: best.bin_step,
      fee_tvl_ratio: best.fee_active_tvl_ratio,
      reasoning: `A/B test alt-config pick (deterministic, zero LLM cost) among ${passing.length} candidates passing alt filters`,
    });
    log("ab_test", `Tracked ab_test shadow position for pool ${best.pool}`);
  } catch (e) {
    log("sim_state_error", `Failed to track ab_test position: ${e.message}`);
  }
  return best;
}
