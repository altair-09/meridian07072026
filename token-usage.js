import fs from "fs";
import { repoPath } from "./repo-root.js";
import { log } from "./logger.js";

const USAGE_DIR = repoPath("logs");

function usageFilePath(date = new Date()) {
  const day = date.toISOString().slice(0, 10);
  return `${USAGE_DIR}/token-usage-${day}.jsonl`;
}

/**
 * Pure observability — appends one line per LLM call. Never throws (a logging
 * failure must not affect the ReAct loop it's observing).
 */
export function logTokenUsage({ role, model, prompt_tokens, completion_tokens, step, scenario = null }) {
  try {
    if (!fs.existsSync(USAGE_DIR)) fs.mkdirSync(USAGE_DIR, { recursive: true });
    const entry = {
      at: new Date().toISOString(),
      role,
      model,
      prompt_tokens: prompt_tokens ?? 0,
      completion_tokens: completion_tokens ?? 0,
      total_tokens: (prompt_tokens ?? 0) + (completion_tokens ?? 0),
      step: step ?? null,
      scenario, // null for real usage, "shadow_skip" | "ab_test" for simulation-attributed calls
    };
    fs.appendFileSync(usageFilePath(), JSON.stringify(entry) + "\n");
  } catch (e) {
    log("token_usage", `Failed to log usage: ${e.message}`);
  }
}

function readUsageForDays(days) {
  const out = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - i * 86400000);
    const file = usageFilePath(d);
    if (!fs.existsSync(file)) continue;
    const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
    for (const line of lines) {
      try { out.push(JSON.parse(line)); } catch { /* skip malformed line */ }
    }
  }
  return out;
}

/** Aggregates usage over the trailing `hours` window for the dashboard. */
export function getTokenUsageSummary({ hours = 24 } = {}) {
  const entries = readUsageForDays(Math.ceil(hours / 24) + 1);
  const cutoff = Date.now() - hours * 3600 * 1000;
  const recent = entries.filter((e) => new Date(e.at).getTime() >= cutoff);

  const byRole = {};
  let simTokens = 0;
  for (const e of recent) {
    byRole[e.role] ??= { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, calls: 0 };
    byRole[e.role].prompt_tokens += e.prompt_tokens;
    byRole[e.role].completion_tokens += e.completion_tokens;
    byRole[e.role].total_tokens += e.total_tokens;
    byRole[e.role].calls += 1;
    if (e.scenario) simTokens += e.total_tokens;
  }

  const totalTokens = recent.reduce((s, e) => s + e.total_tokens, 0);

  return {
    hours,
    total_calls: recent.length,
    total_tokens: totalTokens,
    simulation_tokens: simTokens,
    by_role: byRole,
  };
}
