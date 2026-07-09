/**
 * AI-reviewed promotion queue for simulated (paper-trading) performance.
 *
 * Deliberately NOT part of the ReAct tool loop — a single one-shot analysis
 * call over a batch of simulated closes, producing candidate lessons that a
 * human must explicitly Promote before they touch the real lesson set used
 * by the live trading prompt. This exists specifically to counter
 * survivorship bias: the model must state sample size and confidence, not
 * just report a win.
 */
import fs from "fs";
import OpenAI from "openai";
import { repoPath } from "./repo-root.js";
import { log } from "./logger.js";
import { config } from "./config.js";
import { getSimPerformance } from "./sim-state.js";
import { addLesson } from "./lessons.js";

const PENDING_FILE = repoPath("sim-review.json");

function load() {
  if (!fs.existsSync(PENDING_FILE)) return { pending: [] };
  try {
    return JSON.parse(fs.readFileSync(PENDING_FILE, "utf8"));
  } catch (e) {
    log("sim_review_error", `Failed to read sim-review.json: ${e.message}`);
    return { pending: [] };
  }
}

function save(data) {
  fs.writeFileSync(PENDING_FILE, JSON.stringify(data, null, 2));
}

export function listPendingLessons() {
  return load().pending;
}

export function promotePendingLesson(id) {
  const data = load();
  const idx = data.pending.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error(`Pending lesson ${id} not found`);
  const [item] = data.pending.splice(idx, 1);
  save(data);
  addLesson(item.rule, ["simulation_promoted", item.scenario], { role: null });
  log("sim_review", `Promoted simulated lesson ${id}: ${item.rule}`);
  return { success: true, promoted: item };
}

export function dismissPendingLesson(id) {
  const data = load();
  const idx = data.pending.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error(`Pending lesson ${id} not found`);
  const [item] = data.pending.splice(idx, 1);
  save(data);
  log("sim_review", `Dismissed simulated lesson ${id}`);
  return { success: true, dismissed: item };
}

const client = new OpenAI({
  baseURL: process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1",
  apiKey: process.env.LLM_API_KEY || process.env.OPENROUTER_API_KEY,
});

/**
 * Analyzes recent simulated closes and proposes candidate lessons. Never
 * writes to the active lesson list directly — only to the pending queue.
 */
export async function runSimReviewPass({ limit = 40 } = {}) {
  const records = getSimPerformance({ limit });
  if (records.length === 0) return { proposed: 0 };

  const prompt = `You are reviewing PAPER-TRADING (simulated, fictional money) results for a Solana DLMM LP bot. \
These are NOT real trades — treat wins with skepticism, since simulated PnL is an estimate (fee accrual only, no price/IL modeling). \
Your job is to propose candidate lessons for a human to review — NOT to declare a strategy works. \
For each pattern you find, you MUST state the sample size and an honest confidence level, and a caveat if the sample is small (e.g. under 10). \
Do not just report win/loss — explain the mechanism you believe is driving it. \
If there isn't a real pattern (too few samples, mixed results, contradicts itself), say so instead of inventing one — it's fine to propose zero lessons.

Simulated performance records (JSON):
${JSON.stringify(records, null, 2)}

Respond with ONLY a JSON array (no prose, no markdown fences) of objects: { "rule": string, "scenario": string, "sample_size": number, "confidence": "low"|"medium"|"high", "caveat": string }`;

  const response = await client.chat.completions.create({
    model: config.llm.generalModel,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    max_tokens: 1200,
  });

  const raw = response.choices?.[0]?.message?.content || "[]";
  let proposals;
  try {
    proposals = JSON.parse(raw.replace(/^```(json)?/i, "").replace(/```$/, "").trim());
  } catch (e) {
    log("sim_review_error", `Failed to parse review response: ${e.message}`);
    return { proposed: 0, error: "unparseable LLM response" };
  }
  if (!Array.isArray(proposals)) return { proposed: 0 };

  const data = load();
  for (const p of proposals) {
    if (!p.rule) continue;
    data.pending.push({
      id: `pend_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      rule: String(p.rule).slice(0, 400),
      scenario: p.scenario || "unknown",
      sample_size: Number(p.sample_size) || 0,
      confidence: ["low", "medium", "high"].includes(p.confidence) ? p.confidence : "low",
      caveat: p.caveat ? String(p.caveat).slice(0, 300) : null,
      created_at: new Date().toISOString(),
    });
  }
  save(data);
  log("sim_review", `Proposed ${proposals.length} pending lesson(s) from ${records.length} simulated records`);
  return { proposed: proposals.length };
}
