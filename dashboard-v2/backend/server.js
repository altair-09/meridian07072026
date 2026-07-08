import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { exec } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, "../frontend/dist");
const REPO_ROOT = path.resolve(__dirname, "../../");
const PORT = Number(process.env.PORT) || 4001;

const app = Fastify({ logger: { level: "warn" } });

// ── file helpers ────────────────────────────────────────────────────────────

function readJson(rel, fallback = null) {
  const full = path.join(REPO_ROOT, rel);
  if (!fs.existsSync(full)) return fallback;
  try { return JSON.parse(fs.readFileSync(full, "utf8")); } catch { return fallback; }
}

function readEnv() {
  const envPath = path.join(REPO_ROOT, ".env");
  const out = {};
  if (!fs.existsSync(envPath)) return out;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

// ── external API helpers ────────────────────────────────────────────────────

async function fetchPoolDiscovery({ category = "trending", timeframe = "5m", limit = 30, botFilter = false }) {
  const BASE = "https://pool-discovery-api.datapi.meteora.ag";
  const params = new URLSearchParams({
    pool_type: "dlmm",
    page_size: "100",
    timeframe,
    sort_key: "fee_active_tvl_ratio",
    order_by: "desc",
  });
  if (category && category !== "all") params.set("category", category);

  const url = `${BASE}/pools?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pool discovery API ${res.status}`);
  const data = await res.json();
  const raw = Array.isArray(data.data) ? data.data : [];

  let filtered = raw;

  // botFilter = true hanya dipakai untuk bot deployment, bukan browsing
  if (botFilter) {
    const cfg = readJson("user-config.json", {});
    const minTvl = cfg.minTvl ?? 10_000;
    const maxTvl = cfg.maxTvl ?? 150_000;
    const minBinStep = cfg.minBinStep ?? 80;
    const maxBinStep = cfg.maxBinStep ?? 125;
    const minFeeRatio = cfg.minFeeActiveTvlRatio ?? 0.05;
    const minOrganic = cfg.minOrganic ?? 60;
    filtered = raw.filter((p) => {
      const tvl = Number(p.tvl ?? 0);
      const binStep = Number(p.dlmm_params?.bin_step ?? 0);
      if (tvl < minTvl || tvl > maxTvl) return false;
      if (binStep < minBinStep || binStep > maxBinStep) return false;
      if (Number(p.fee_active_tvl_ratio ?? 0) < minFeeRatio) return false;
      if (Number(p.token_x?.organic_score ?? 0) < minOrganic) return false;
      return true;
    });
  } else {
    // Browsing: hanya filter minimal — TVL > 0 dan ada nama
    filtered = raw.filter((p) => Number(p.tvl ?? 0) > 0 && p.name);
  }

  return filtered
    .slice(0, limit)
    .map((p, i) => ({
      rank: i + 1,
      pool: p.pool_address,
      name: p.name,
      base: p.token_x?.symbol ?? "?",
      quote: p.token_y?.symbol ?? "SOL",
      pool_type: p.pool_type,
      bin_step: p.dlmm_params?.bin_step ?? null,
      fee_pct: p.fee_pct ?? null,
      tvl:  Math.round(p.tvl ?? 0),
      active_tvl: Math.round(p.active_tvl ?? 0),
      volume_window: Math.round(p.volume ?? 0),
      fee_window: Math.round(p.fee ?? 0),
      fee_active_tvl_ratio: p.fee_active_tvl_ratio != null ? Number(p.fee_active_tvl_ratio.toFixed(4)) : null,
      volume_active_tvl_ratio: p.volume_active_tvl_ratio != null ? Number(p.volume_active_tvl_ratio.toFixed(4)) : null,
      volatility: p.volatility != null ? Number(p.volatility.toFixed(4)) : null,
      organic_score: Math.round(p.token_x?.organic_score ?? 0),
      holders: p.base_token_holders ?? null,
      mcap: Math.round(p.token_x?.market_cap ?? 0),
      token_age_hours: p.token_x?.created_at ? Math.floor((Date.now() - p.token_x.created_at) / 3_600_000) : null,
      price: p.pool_price ?? null,
      price_change_pct: p.pool_price_change_pct != null ? Number(p.pool_price_change_pct.toFixed(1)) : null,
      volume_change_pct: p.volume_change_pct != null ? Number(p.volume_change_pct.toFixed(1)) : null,
      fee_change_pct: p.fee_change_pct != null ? Number(p.fee_change_pct.toFixed(1)) : null,
      swap_count: p.swap_count ?? null,
      unique_traders: p.unique_traders ?? null,
      unique_lps: p.unique_lps ?? null,
      open_positions: p.open_positions ?? null,
      active_positions: p.active_positions ?? null,
      active_pct: p.active_positions_pct != null ? Number(p.active_positions_pct.toFixed(1)) : null,
      warningReasons: buildWarnings(p),
      priceTrend: [],
    }));
}

function buildWarnings(p) {
  const warnings = [];
  if (p.base_token_has_high_supply_concentration) warnings.push("Konsentrasi supply tinggi");
  if (p.token_x?.organic_score < 60) warnings.push(`Organic score rendah (${Math.round(p.token_x?.organic_score ?? 0)})`);
  if (p.base_token_holders < 500) warnings.push(`Holder sedikit (${p.base_token_holders})`);
  return warnings;
}

async function fetchHeliusWallet(address, heliusKey) {
  const url = `https://api.helius.xyz/v1/wallet/${address}/balances?api-key=${heliusKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Helius ${res.status}`);
  const data = await res.json();
  const balances = data.balances || [];
  const SOL_MINT = "So11111111111111111111111111111111111111112";
  const solEntry = balances.find((b) => b.mint === SOL_MINT || b.symbol === "SOL");
  const usdcEntry = balances.find((b) => b.symbol === "USDC");
  return {
    wallet: address,
    sol: Math.round((solEntry?.balance ?? 0) * 1e6) / 1e6,
    sol_price: Math.round((solEntry?.pricePerToken ?? 0) * 100) / 100,
    sol_usd: Math.round((solEntry?.usdValue ?? 0) * 100) / 100,
    usdc: Math.round((usdcEntry?.balance ?? 0) * 100) / 100,
    total_usd: Math.round((data.totalUsdValue ?? 0) * 100) / 100,
    tokens: balances
      .filter((b) => b.mint !== SOL_MINT && (b.usdValue ?? 0) >= 0.01)
      .map((b) => ({ symbol: b.symbol || b.mint.slice(0, 8), balance: b.balance, usd: Math.round((b.usdValue ?? 0) * 100) / 100 })),
  };
}

// ── compute dashboard stats from lessons.json performance records ───────────

function computeStats(perfRecords, hours) {
  const cutoff = Date.now() - hours * 3_600_000;
  const recent = perfRecords.filter((r) => new Date(r.closed_at || r.recorded_at || 0).getTime() >= cutoff);
  if (recent.length === 0) return { netPnl: 0, fees: 0, winRate: 0, trades: 0, pnlTrend: [], feeTrend: [] };

  const netPnl = recent.reduce((s, r) => s + (r.pnl_usd ?? 0), 0);
  const fees   = recent.reduce((s, r) => s + (r.fees_earned_usd ?? 0), 0);
  const wins   = recent.filter((r) => (r.pnl_pct ?? 0) > 0).length;
  const winRate = recent.length > 0 ? Math.round((wins / recent.length) * 100) : 0;

  // Build 7-bucket trend (equal time slices over the window)
  const bucketMs = (hours * 3_600_000) / 7;
  const pnlTrend = Array.from({ length: 7 }, (_, i) => {
    const from = cutoff + i * bucketMs;
    const to = from + bucketMs;
    return recent
      .filter((r) => { const t = new Date(r.closed_at || r.recorded_at || 0).getTime(); return t >= from && t < to; })
      .reduce((s, r) => s + (r.pnl_usd ?? 0), 0);
  });
  const feeTrend = Array.from({ length: 7 }, (_, i) => {
    const from = cutoff + i * bucketMs;
    const to = from + bucketMs;
    return recent
      .filter((r) => { const t = new Date(r.closed_at || r.recorded_at || 0).getTime(); return t >= from && t < to; })
      .reduce((s, r) => s + (r.fees_earned_usd ?? 0), 0);
  });

  return { netPnl: Math.round(netPnl * 100) / 100, fees: Math.round(fees * 100) / 100, winRate, trades: recent.length, pnlTrend, feeTrend };
}

// ── caches ──────────────────────────────────────────────────────────────────

let _poolsCache = null, _poolsCacheAt = 0;
let _walletCache = null, _walletCacheAt = 0;

// ── routes ──────────────────────────────────────────────────────────────────

app.get("/api/system", (req, reply) => {
  const env = readEnv();
  const cfg = readJson("user-config.json", {});
  const dryRun = (process.env.DRY_RUN ?? env.DRY_RUN ?? cfg.dryRun ?? "false") === "true" || cfg.dryRun === true;
  reply.send({
    dryRun,
    underPm2: process.env.pm_id != null,
    botName: "Meridian Bot",
  });
});

app.get("/api/positions", (req, reply) => {
  const state = readJson("state.json", { positions: {} });
  const positions = Object.values(state.positions || {})
    .filter((p) => !p.closed)
    .map((p) => ({
      position: p.position,
      pool: p.pool,
      pair: p.pool_name ?? p.pool,
      strategy: p.strategy,
      amount_sol: p.amount_sol,
      in_range: !p.out_of_range_since,
      pnl_pct: p.pnl_pct ?? 0,
      pnl_usd: p.pnl_usd ?? 0,
      unclaimed_fees_usd: p.unclaimed_fees_usd ?? 0,
      deployed_at: p.deployed_at,
      out_of_range_since: p.out_of_range_since ?? null,
      peak_pnl_pct: p.peak_pnl_pct ?? 0,
      trailing_active: p.trailing_active ?? false,
      instruction: p.instruction ?? null,
    }));
  reply.send({ total_positions: positions.length, positions });
});

app.get("/api/wallet", async (req, reply) => {
  const now = Date.now();
  if (_walletCache && now - _walletCacheAt < 60_000) return reply.send(_walletCache);

  const env = readEnv();
  const cfg = readJson("user-config.json", {});
  const heliusKey = process.env.HELIUS_API_KEY ?? env.HELIUS_API_KEY;
  const walletKey = process.env.WALLET_PRIVATE_KEY ?? env.WALLET_PRIVATE_KEY ?? cfg.walletKey;

  if (!heliusKey) return reply.send({ error: "HELIUS_API_KEY not configured", sol: 0, total_usd: 0, tokens: [] });
  if (!walletKey) return reply.send({ error: "WALLET_PRIVATE_KEY not configured", sol: 0, total_usd: 0, tokens: [] });

  let walletAddress;
  try {
    // Derive public key from private key (base58)
    const { Keypair } = await import("@solana/web3.js");
    const bs58 = (await import("bs58")).default;
    walletAddress = Keypair.fromSecretKey(bs58.decode(walletKey)).publicKey.toString();
  } catch (e) {
    return reply.status(500).send({ error: `Cannot derive wallet address: ${e.message}` });
  }

  try {
    const data = await fetchHeliusWallet(walletAddress, heliusKey);
    _walletCache = data; _walletCacheAt = now;
    reply.send(data);
  } catch (e) {
    reply.status(500).send({ error: e.message });
  }
});

// ── SSE: push events to dashboard whenever key files change ─────────────────

const sseClients = new Set();

function pushSseEvent(type, data) {
  const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try { res.raw.write(payload); } catch { sseClients.delete(res); }
  }
}

// Chat IPC paths
const DASH_CHAT_OUT = path.join(REPO_ROOT, ".dashboard-chat-out.json");

// POST /api/chat — write user message to IPC file, bot will respond via .dashboard-chat-out.json
app.post("/api/chat", (req, reply) => {
  const text = req.body?.text?.trim();
  if (!text) return reply.code(400).send({ error: "text required" });
  const id = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const payload = { id, text, ts: Date.now() };
  try {
    fs.writeFileSync(path.join(REPO_ROOT, ".dashboard-chat-in.json"), JSON.stringify(payload));
    reply.send({ ok: true, id });
  } catch (e) {
    reply.code(500).send({ error: e.message });
  }
});

// Poll key JSON files every 1s and push SSE when mtime changes (reliable on Windows)
const WATCHED_FILES = ["decision-log.json", "lessons.json", "state.json", ".dashboard-chat-out.json"];
const _lastMtime = {};
setInterval(() => {
  for (const fname of WATCHED_FILES) {
    const fpath = path.join(REPO_ROOT, fname);
    try {
      const mtime = fs.statSync(fpath).mtimeMs;
      if (_lastMtime[fname] !== undefined && mtime !== _lastMtime[fname]) {
        if (fname === ".dashboard-chat-out.json") {
          // Push full chat response content so frontend doesn't need a second fetch
          try {
            const chatOut = JSON.parse(fs.readFileSync(fpath, "utf8"));
            pushSseEvent("chat_response", chatOut);
          } catch { /* malformed JSON — skip */ }
        } else {
          const key = fname.replace(".json", "").replace(/-/g, "_") + "_changed";
          pushSseEvent(key, { ts: Date.now() });
        }
      }
      _lastMtime[fname] = mtime;
    } catch { /* file may not exist */ }
  }
}, 1000);

// Debug: write a test entry to decision-log.json (triggers mtime poll → SSE)
app.post("/api/events/test-write", (req, reply) => {
  const fpath = path.join(REPO_ROOT, "decision-log.json");
  const log = readJson("decision-log.json", { decisions: [] });
  log.decisions.push({ id: "sse_test_" + Date.now(), ts: new Date().toISOString(), type: "no_deploy", actor: "SCREENER", summary: "SSE test write" });
  fs.writeFileSync(fpath, JSON.stringify(log));
  reply.send({ ok: true, mtime: fs.statSync(fpath).mtimeMs });
});

// Debug: manually trigger SSE push
app.post("/api/events/trigger", (req, reply) => {
  const type = req.body?.type ?? "decision_log_changed";
  pushSseEvent(type, { ts: Date.now(), manual: true });
  reply.send({ ok: true, clients: sseClients.size, type });
});

app.get("/api/events/debug", (req, reply) => {
  const watchedPaths = WATCHED_FILES.map(f => path.join(REPO_ROOT, f));
  const stats = watchedPaths.map(p => {
    try { return { path: p, exists: true, mtime: fs.statSync(p).mtimeMs }; }
    catch { return { path: p, exists: false }; }
  });
  reply.send({ clients: sseClients.size, watched: stats });
});

app.get("/api/events", (req, reply) => {
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });
  reply.raw.write(": connected\n\n");

  sseClients.add(reply);
  req.raw.on("close", () => sseClients.delete(reply));
});

app.get("/api/decisions", (req, reply) => {
  const log = readJson("decision-log.json", { decisions: [] });
  const limit = Number(req.query.limit) || 30;
  const decisions = (log.decisions || []).slice(-limit).reverse();
  // Map to activity format for dashboard recent-activity table
  const activity = decisions.map((d) => ({
    id: d.id,
    ts: d.ts,
    time: new Date(d.ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    botId: "meridian",
    bot: "Meridian Bot",
    pool: d.pool_name ?? d.pool ?? "—",
    event: d.summary ?? "—",
    result: d.type === "deploy" ? "Deployed" : d.type === "close" ? "Closed" : d.type === "no_deploy" ? "Skipped" : d.type,
    resultType: d.type === "deploy" ? "success" : d.type === "close" ? "neutral" : "error",
    actor: d.actor,
    type: d.type,
    reason: d.reason,
    rejected: d.rejected ?? [],
  }));
  reply.send({ decisions, activity });
});

app.get("/api/lessons", (req, reply) => {
  const data = readJson("lessons.json", { lessons: [], performance: [] });
  const limit = Number(req.query.limit) || 50;
  const lessons = (data.lessons || []).slice(-limit).reverse().map((l) => ({
    id: l.id,
    rule: l.rule,
    tags: l.tags ?? [],
    outcome: l.outcome ?? null,
    confidence: l.confidence ?? null,
    role: l.role ?? null,
    pinned: l.pinned ?? false,
    created_at: l.created_at ?? null,
  }));
  reply.send({ lessons });
});

app.get("/api/lessons/pending", (req, reply) => {
  const data = readJson("sim-review.json", { pending: [] });
  reply.send({ pending: data.pending ?? [] });
});

app.get("/api/performance", (req, reply) => {
  const data = readJson("lessons.json", { lessons: [], performance: [] });
  const perf = data.performance ?? [];

  const total = perf.length;
  const closed = perf.filter((r) => r.pnl_pct != null);
  const wins = closed.filter((r) => (r.pnl_pct ?? 0) > 0);
  const winRate = closed.length > 0 ? Math.round((wins.length / closed.length) * 100) : 0;
  const totalPnlUsd = closed.reduce((s, r) => s + (r.pnl_usd ?? 0), 0);
  const avgPnlPct = closed.length > 0 ? closed.reduce((s, r) => s + (r.pnl_pct ?? 0), 0) / closed.length : 0;

  // Stats by timeframe
  const stats = {
    "Last 24 hours": computeStats(perf, 24),
    "Last 7 days":   computeStats(perf, 24 * 7),
    "Last 30 days":  computeStats(perf, 24 * 30),
  };

  reply.send({
    summary: {
      total_positions_closed: closed.length,
      win_rate_pct: winRate,
      total_pnl_usd: Math.round(totalPnlUsd * 100) / 100,
      avg_pnl_pct: Math.round(avgPnlPct * 100) / 100,
    },
    stats,
    winLossSummary: {
      winPct: winRate,
      lossPct: closed.length > 0 ? Math.round((1 - wins.length / closed.length) * 100) : 0,
      totalClosed: closed.length,
    },
    recent: perf.slice(-20).reverse(),
  });
});

app.get("/api/pools", async (req, reply) => {
  const now = Date.now();
  const category = req.query.category ?? "trending";
  const timeframe = req.query.timeframe ?? "5m";
  const limit = Number(req.query.limit) || 30;
  const cacheKey = `${category}-${timeframe}`;

  if (_poolsCache?.key === cacheKey && now - _poolsCacheAt < 60_000) {
    return reply.send({ pools: _poolsCache.pools.slice(0, limit) });
  }

  try {
    const pools = await fetchPoolDiscovery({ category, timeframe, limit });
    _poolsCache = { key: cacheKey, pools }; _poolsCacheAt = now;
    reply.send({ pools });
  } catch (e) {
    reply.status(500).send({ error: e.message });
  }
});

app.get("/api/sim", (req, reply) => {
  const state = readJson("sim-state.json", { positions: {}, performance: [] });
  const positions = Object.values(state.positions || {}).filter((p) => !p.closed);
  const perf = state.performance ?? [];
  const wins = perf.filter((r) => (r.pnl_pct ?? 0) > 0);
  reply.send({
    positions,
    performance: perf.slice(-20).reverse(),
    summary: {
      totalTrades: perf.length,
      winCount: wins.length,
      lossCount: perf.length - wins.length,
      totalNetPnLUSD: perf.reduce((s, r) => s + (r.pnl_usd ?? 0), 0),
      openCount: positions.length,
    },
  });
});

app.get("/api/config", (req, reply) => {
  const cfg = readJson("user-config.json", {});
  // Strip sensitive keys before sending to frontend
  const { walletKey, rpcUrl, llmApiKey, heliusApiKey, telegramBotToken, ...safe } = cfg;
  reply.send(safe);
});

// ── Bot process control (no PM2 required) ───────────────────────────────────

import { spawn } from "child_process";

const PID_FILE = path.join(REPO_ROOT, ".bot.pid");
let _botProcess = null;

function getBotPid() {
  if (_botProcess && !_botProcess.killed) return _botProcess.pid;
  try {
    const pid = parseInt(fs.readFileSync(PID_FILE, "utf8").trim(), 10);
    return isNaN(pid) ? null : pid;
  } catch { return null; }
}

function isBotRunning() {
  const pid = getBotPid();
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function startBotProcess(dryRun = false) {
  if (isBotRunning()) return { ok: false, error: "Bot sudah berjalan." };
  const env = { ...process.env };
  if (dryRun) env.DRY_RUN = "true";
  const child = spawn("node", ["index.js"], {
    cwd: REPO_ROOT,
    env,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.unref();
  _botProcess = child;
  fs.writeFileSync(PID_FILE, String(child.pid));
  return { ok: true, pid: child.pid };
}

function stopBotProcess() {
  const pid = getBotPid();
  if (!pid) return { ok: false, error: "Bot tidak sedang berjalan." };
  try {
    process.kill(pid, "SIGTERM");
    if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
    _botProcess = null;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

app.get("/api/bot/status", (req, reply) => {
  const running = isBotRunning();
  const pid = running ? getBotPid() : null;
  reply.send({ running, pid });
});

app.post("/api/bot/start", (req, reply) => {
  const dryRun = req.body?.dry_run ?? false;
  const result = startBotProcess(dryRun);
  if (result.ok) reply.send(result);
  else reply.status(400).send(result);
});

app.post("/api/bot/stop", (req, reply) => {
  const result = stopBotProcess();
  if (result.ok) reply.send(result);
  else reply.status(400).send(result);
});

app.post("/api/bot/restart", (req, reply) => {
  stopBotProcess();
  setTimeout(() => {
    const dryRun = req.body?.dry_run ?? false;
    const result = startBotProcess(dryRun);
    if (result.ok) reply.send({ ok: true, restarted: true, pid: result.pid });
    else reply.status(500).send(result);
  }, 1500);
});

app.post("/api/config", async (req, reply) => {
  const cfgPath = path.join(REPO_ROOT, "user-config.json");
  try {
    const existing = readJson("user-config.json", {});
    const updates = req.body ?? {};
    // Never overwrite sensitive keys from frontend (they come as undefined/empty from stripped response)
    const SENSITIVE = ["walletKey", "rpcUrl", "llmApiKey", "heliusApiKey", "telegramBotToken", "WALLET_PRIVATE_KEY"];
    const merged = { ...existing };
    for (const [k, v] of Object.entries(updates)) {
      if (SENSITIVE.includes(k)) continue;
      if (v === undefined || v === "") continue;
      merged[k] = v;
    }
    fs.writeFileSync(cfgPath, JSON.stringify(merged, null, 2));
    reply.send({ ok: true });
  } catch (e) {
    reply.status(500).send({ error: e.message });
  }
});

// ── Wallet on-chain positions (via Meteora DLMM API) ────────────────────────

app.get("/api/wallet/:address/positions", async (req, reply) => {
  const { address } = req.params;
  try {
    const url = `https://dlmm-api.meteora.ag/position/wallet/${address}`;
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) throw new Error(`Meteora DLMM API ${res.status}`);
    const data = await res.json();
    // data is array of positions
    const positions = (Array.isArray(data) ? data : []).map((p) => ({
      position: p.pubkey ?? p.position ?? "",
      pool: p.lbPair ?? p.pool ?? "",
      pool_name: p.name ?? p.lbPairName ?? "",
      base_symbol: p.tokenX?.symbol ?? "?",
      quote_symbol: p.tokenY?.symbol ?? "SOL",
      lower_bin_id: p.lowerBinId ?? null,
      upper_bin_id: p.upperBinId ?? null,
      in_range: p.positionBinData?.some?.((b) => b.binId === p.activeBin) ?? null,
      total_x_amount: p.totalXAmount ?? "0",
      total_y_amount: p.totalYAmount ?? "0",
      fee_x_pending: p.feeX ?? "0",
      fee_y_pending: p.feeY ?? "0",
      reward_one_pending: p.rewardOne ?? "0",
      reward_two_pending: p.rewardTwo ?? "0",
    }));
    reply.send({ wallet: address, total: positions.length, positions });
  } catch (e) {
    reply.status(500).send({ error: e.message });
  }
});

// ── Pool detail with fee breakdown ──────────────────────────────────────────

app.get("/api/pool/:address", async (req, reply) => {
  const { address } = req.params;
  try {
    const url = `https://dlmm-api.meteora.ag/pair/${address}`;
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) throw new Error(`Meteora pair API ${res.status}`);
    const p = await res.json();

    const feeRatePct = (p.baseFeePercentage ?? 0);
    const totalFeeRate = feeRatePct + (p.protocolFeePercentage ?? 0);
    const vol24h = Number(p.trade_volume_24h ?? 0);
    const feesEarned24h = vol24h * (totalFeeRate / 100);
    const lpFees24h = feesEarned24h * (1 - (p.protocolFeePercentage ?? 0) / Math.max(totalFeeRate, 0.001));
    const protocolFees24h = feesEarned24h - lpFees24h;

    reply.send({
      pool: p.address,
      name: p.name,
      base_fee_pct: feeRatePct,
      protocol_fee_pct: p.protocolFeePercentage ?? 0,
      total_fee_pct: totalFeeRate,
      bin_step: p.bin_step,
      active_bin: p.active_bin_id,
      current_price: p.current_price,
      tvl: Number(p.liquidity ?? 0),
      vol_24h: vol24h,
      fees_24h: feesEarned24h,
      fee_breakdown: {
        lp_fees_24h: Math.round(lpFees24h * 100) / 100,
        protocol_fees_24h: Math.round(protocolFees24h * 100) / 100,
        total_fees_24h: Math.round(feesEarned24h * 100) / 100,
        base_fee_rate: feeRatePct,
        dynamic_fee_rate: Math.max(0, totalFeeRate - feeRatePct),
      },
      token_x: { symbol: p.tokenX?.symbol, mint: p.tokenX?.address, decimals: p.tokenX?.decimal },
      token_y: { symbol: p.tokenY?.symbol, mint: p.tokenY?.address, decimals: p.tokenY?.decimal },
      min_bin_id: p.min_bin_id ?? null,
      max_bin_id: p.max_bin_id ?? null,
    });
  } catch (e) {
    reply.status(500).send({ error: e.message });
  }
});

// ── Build Meteora DLMM position transaction ─────────────────────────────────

app.post("/api/trade/build-position-tx", async (req, reply) => {
  const { pool_address, wallet_pubkey, strategy, amount_x, amount_y, min_bin_id, max_bin_id } = req.body ?? {};
  if (!pool_address || !wallet_pubkey) {
    return reply.status(400).send({ error: "pool_address dan wallet_pubkey diperlukan" });
  }

  try {
    const { Connection, PublicKey, Transaction } = await import("@solana/web3.js");
    const env = readEnv();
    const rpcUrl = process.env.RPC_URL ?? env.RPC_URL ?? "https://api.mainnet-beta.solana.com";
    const connection = new Connection(rpcUrl, "confirmed");

    // Dynamic import DLMM SDK (same lazy-load pattern as bot)
    const DLMM = (await import("@meteora-ag/dlmm")).default ?? (await import("@meteora-ag/dlmm"));
    const dlmmPool = await DLMM.create(connection, new PublicKey(pool_address));
    const activeBin = await dlmmPool.getActiveBin();

    const totalBins = (max_bin_id ?? activeBin.binId + 20) - (min_bin_id ?? activeBin.binId - 20) + 1;
    const stratMap = { spot: 1, curve: 2, bid_ask: 3 };
    const strategyType = stratMap[strategy] ?? 1;

    const user = new PublicKey(wallet_pubkey);
    const { tx } = await dlmmPool.initializePositionAndAddLiquidityByStrategy({
      positionPubKey: user, // will be overridden — just placeholder
      user,
      totalXAmount: BigInt(Math.floor(Number(amount_x ?? 0))),
      totalYAmount: BigInt(Math.floor(Number(amount_y ?? 0))),
      strategy: {
        minBinId: min_bin_id ?? activeBin.binId - 20,
        maxBinId: max_bin_id ?? activeBin.binId + 20,
        strategyType,
      },
    });

    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = user;

    const serialized = tx.serialize({ requireAllSignatures: false }).toString("base64");
    reply.send({ ok: true, transaction: serialized, active_bin: activeBin.binId });
  } catch (e) {
    reply.status(500).send({ error: e.message });
  }
});

// ── Broadcast signed transaction via RPC ─────────────────────────────────────

app.post("/api/trade/broadcast-tx", async (req, reply) => {
  const { signed_tx } = req.body ?? {};
  if (!signed_tx) return reply.status(400).send({ error: "signed_tx diperlukan" });
  try {
    const { Connection, Transaction } = await import("@solana/web3.js");
    const env = readEnv();
    const rpcUrl = process.env.RPC_URL ?? env.RPC_URL ?? "https://api.mainnet-beta.solana.com";
    const connection = new Connection(rpcUrl, "confirmed");
    const txBytes = Buffer.from(signed_tx, "base64");
    const tx = Transaction.from(txBytes);
    const signature = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction(signature, "confirmed");
    reply.send({ ok: true, signature });
  } catch (e) {
    reply.status(500).send({ error: e.message });
  }
});

app.get("/api/token-usage", (req, reply) => {
  const hours = Number(req.query.hours) || 24;
  const LOGS_DIR = path.join(REPO_ROOT, "logs");
  const cutoff = Date.now() - hours * 3_600_000;
  const entries = [];

  if (fs.existsSync(LOGS_DIR)) {
    for (let i = 0; i <= Math.ceil(hours / 24); i++) {
      const d = new Date(Date.now() - i * 86400_000);
      const file = path.join(LOGS_DIR, `token-usage-${d.toISOString().slice(0, 10)}.jsonl`);
      if (!fs.existsSync(file)) continue;
      for (const line of fs.readFileSync(file, "utf8").split("\n").filter(Boolean)) {
        try { entries.push(JSON.parse(line)); } catch { /* skip */ }
      }
    }
  }

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
  reply.send({ hours, total_calls: recent.length, total_tokens: totalTokens, simulation_tokens: simTokens, by_role: byRole });
});

// ── static frontend (production build) ──────────────────────────────────────

if (fs.existsSync(DIST_DIR)) {
  app.register(fastifyStatic, { root: DIST_DIR });
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith("/api/")) return reply.status(404).send({ error: "Not found" });
    reply.sendFile("index.html");
  });
} else {
  app.get("/", (req, reply) => reply.send({ status: "backend running — build frontend first (npm run build in dashboard-v2/frontend)" }));
}

app.listen({ port: PORT, host: "127.0.0.1" }, (err) => {
  if (err) { app.log.error(err); process.exit(1); }
  console.log(`Dashboard backend running on http://127.0.0.1:${PORT}`);
});
