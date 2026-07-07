// Static mock data — UI review only, no live backend wiring in this phase.

export const bots = [
  {
    id: "bot-1",
    name: "Bot 1 — Stable pairs",
    status: "idle",
    wallet: "5BgwREYGRxo1evzzmmTQPFaxgz4gLBEb7BEWSeUcjs8q",
    uptimeHours: 128,
    openPositions: 2,
    allTimePnlUsd: 84.32,
    ramMb: 172,
    cpuPct: 3,
    dryRun: false,
  },
  {
    id: "bot-2",
    name: "Bot 2 — Momentum",
    status: "processing",
    wallet: "8mQzP2yV1kXwB3nR7dCzT4uJ6hLpN9sK2eF5aG1bWxYz",
    uptimeHours: 61,
    openPositions: 1,
    allTimePnlUsd: -12.5,
    ramMb: 188,
    cpuPct: 9,
    dryRun: false,
  },
  {
    id: "bot-3",
    name: "Bot 3 — Manual assist",
    status: "idle",
    wallet: "3xT9vN5mQ8pL2rY6cW1zK4hJ7bF0dS3eA9gU5nM8vXqR",
    uptimeHours: 12,
    openPositions: 0,
    allTimePnlUsd: 0,
    ramMb: 150,
    cpuPct: 1,
    dryRun: true,
  },
];

export const walletsByBot = {
  "bot-1": { totalValueUsd: 412.8, inLpUsd: 340.1, idleUsd: 72.7 },
  "bot-2": { totalValueUsd: 205.4, inLpUsd: 180.0, idleUsd: 25.4 },
  "bot-3": { totalValueUsd: 50.0, inLpUsd: 0, idleUsd: 50.0 },
};

export const positionsByBot = {
  "bot-1": [
    { position: "Pos1abc...", pair: "BONK-SOL", inRange: true, pnlPct: 4.2, pnlUsd: 6.1, feesUsd: 2.3, strategy: "bid_ask" },
    { position: "Pos2def...", pair: "WIF-SOL", inRange: false, pnlPct: -1.8, pnlUsd: -3.4, feesUsd: 0.9, strategy: "spot" },
  ],
  "bot-2": [
    { position: "Pos3ghi...", pair: "POPCAT-SOL", inRange: true, pnlPct: 9.1, pnlUsd: 14.7, feesUsd: 5.2, strategy: "curve" },
  ],
  "bot-3": [],
};

export const poolCandidates = [
  { pool: "7cKW...VTQic", name: "BABYANSEM-SOL", tvl: 53315, volume: 28413, feeTvlRatio: 1.632, binStep: 100, organicScore: 75 },
  { pool: "9pLm...Xq2R", name: "GIGA-SOL", tvl: 128400, volume: 61200, feeTvlRatio: 0.842, binStep: 80, organicScore: 68 },
  { pool: "4hNb...Aw9T", name: "MOODENG-SOL", tvl: 71230, volume: 39800, feeTvlRatio: 1.104, binStep: 125, organicScore: 82 },
  { pool: "2xRt...Kp7L", name: "PNUT-SOL", tvl: 205000, volume: 98000, feeTvlRatio: 0.61, binStep: 100, organicScore: 71 },
];

// Richer pool-browser data — field names mirror tools/screening.js's real
// condensePool() output (verified by reading the function directly) so the
// Columns customizer's "available" flags stay honest. DLMM only — this bot
// cannot deploy into DAMM V2 pools (no bin-step concept there).
//
// `warningReasons` is what the small numbered badge next to the token name
// actually means — each string is one concrete flag (holder concentration,
// unverified dev, bot-holder %, etc.), the count shown is warningReasons.length.
export const poolBrowser = [
  {
    pool: "7cKW...VTQic", rank: 1, name: "ACM-SOL", base: "ACM", quote: "SOL",
    fee_pct: 2, bin_step: 100, poolType: "DLMM", timeframeMinutes: 720,
    warningReasons: ["Top 10 holders memegang 61% supply", "Dev wallet belum terverifikasi"],
    tvl: 27210, active_tvl: 812000, volume_window: 307660, volumeChangePct: 0, fee_window: 9990, feesChangePct: 0,
    fee_active_tvl_ratio: 38.32, volume_active_tvl_ratio: 37.9,
    priceTrend: [42, 38, 40, 33, 30, 26], token_age_label: "9mo 14d",
    mcap: 889.2, marketCapChangePct: 999, price: 0.000088924, poolPriceChangePct: 0,
    pool_price_sol: 0.04112,
    base_supply: 5200000, quote_supply: 265.71,
    organic_score: 75,
    swap_count: 4210, unique_traders: 812, unique_lps: 64, holders: 3120,
    volatility: 5.85, open_positions: 12, active_positions: 9, active_pct: 75, positions_created: 21,
    min_price: 0.03801, max_price: 0.04157,
    dynamic_fee_pct: 1.6875, total_fee_pct: 3.6875, max_fee_pct: 10,
    protocol_fee_pct: 0.36875, fee_collection_token: "Quote", limit_order_bonus_pct: 1.84375,
    // bins: array of {price, base, quote} for liquidity distribution — 32 bins around current price
    bins: Array.from({ length: 32 }, (_, i) => {
      const mid = 16; const inRange = i >= 12 && i <= 18;
      return { i, base: i < mid ? Math.max(0, 80 - i * 4 + Math.random() * 20) : 0, quote: i >= mid ? Math.max(0, (i - mid) * 8 + Math.random() * 15) : 0, active: inRange };
    }),
  },
  {
    pool: "9pLm...Xq2R", rank: 2, name: "TOLY-SOL", base: "TOLY", quote: "SOL",
    fee_pct: 2, bin_step: 100, poolType: "DLMM", timeframeMinutes: 720,
    warningReasons: ["Umur token < 24 jam", "Bot-holder terdeteksi 38%", "Volume spike >500% dalam 1 jam"],
    tvl: 5180000, active_tvl: 4400000, volume_window: 86330, volumeChangePct: 34.06, fee_window: 2690, feesChangePct: 47.61,
    fee_active_tvl_ratio: 0.61, volume_active_tvl_ratio: 19.6,
    priceTrend: [10, 9, 11, 18, 24, 30], token_age_label: "13h 15m",
    mcap: 5180000, marketCapChangePct: 506, price: 0.000064, poolPriceChangePct: 421,
    pool_price_sol: 0.00214, base_supply: 9800000, quote_supply: 182.4,
    organic_score: 48,
    swap_count: 1890, unique_traders: 640, unique_lps: 22, holders: 980,
    volatility: 12.4, open_positions: 5, active_positions: 3, active_pct: 60, positions_created: 8,
    min_price: 0.000041, max_price: 0.000071,
    dynamic_fee_pct: 2.1, total_fee_pct: 4.1, max_fee_pct: 10,
    protocol_fee_pct: 0.41, fee_collection_token: "Quote", limit_order_bonus_pct: 2.05,
    bins: Array.from({ length: 32 }, (_, i) => {
      const mid = 14;
      return { i, base: i < mid ? Math.max(0, 40 - i * 2 + Math.random() * 10) : 0, quote: i >= mid ? Math.max(0, (i - mid) * 12 + Math.random() * 20) : 0 };
    }),
  },
  {
    pool: "4hNb...Aw9T", rank: 3, name: "MOODENG-SOL", base: "MOODENG", quote: "SOL",
    fee_pct: 2, bin_step: 125, poolType: "DLMM", timeframeMinutes: 720,
    warningReasons: ["Organic score di bawah 60"],
    tvl: 89930, active_tvl: 71200, volume_window: 90810, volumeChangePct: 634, fee_window: 1470, feesChangePct: 633,
    fee_active_tvl_ratio: 2.06, volume_active_tvl_ratio: 127.5,
    priceTrend: [8, 14, 10, 18, 15, 22], token_age_label: "25d 20h",
    mcap: 89930, marketCapChangePct: 212, price: 0.0000013, poolPriceChangePct: 216,
    pool_price_sol: 0.000091, base_supply: 12400000, quote_supply: 78.2,
    organic_score: 58,
    swap_count: 3020, unique_traders: 410, unique_lps: 18, holders: 640,
    volatility: 8.2, open_positions: 3, active_positions: 3, active_pct: 100, positions_created: 6,
    min_price: 0.0000009, max_price: 0.0000018,
    dynamic_fee_pct: 0.9, total_fee_pct: 2.9, max_fee_pct: 10,
    protocol_fee_pct: 0.29, fee_collection_token: "Quote", limit_order_bonus_pct: 1.45,
    bins: Array.from({ length: 32 }, (_, i) => {
      const mid = 18;
      return { i, base: i < mid ? Math.max(0, 60 - i * 3 + Math.random() * 15) : 0, quote: i >= mid ? Math.max(0, (i - mid) * 10 + Math.random() * 12) : 0 };
    }),
  },
  {
    pool: "2xRt...Kp7L", rank: 4, name: "USWR-SOL", base: "USWR", quote: "SOL",
    fee_pct: 2, bin_step: 100, poolType: "DLMM", timeframeMinutes: 720,
    warningReasons: [],
    tvl: 18950000, active_tvl: 16200000, volume_window: 294910, volumeChangePct: 18, fee_window: 9620, feesChangePct: 22,
    fee_active_tvl_ratio: 0.59, volume_active_tvl_ratio: 18.2,
    priceTrend: [12, 16, 14, 20, 24, 28], token_age_label: "3d 6h",
    mcap: 18950000, marketCapChangePct: 44, price: 0.00024, poolPriceChangePct: 31,
    pool_price_sol: 0.01821, base_supply: 48200000, quote_supply: 1240.5,
    organic_score: 82,
    swap_count: 6100, unique_traders: 1540, unique_lps: 90, holders: 8200,
    volatility: 3.1, open_positions: 20, active_positions: 18, active_pct: 90, positions_created: 33,
    min_price: 0.00021, max_price: 0.00028,
    dynamic_fee_pct: 0.5, total_fee_pct: 2.5, max_fee_pct: 10,
    protocol_fee_pct: 0.25, fee_collection_token: "Quote", limit_order_bonus_pct: 1.25,
    bins: Array.from({ length: 32 }, (_, i) => {
      const mid = 16;
      return { i, base: i < mid ? Math.max(0, 70 - i * 3.5 + Math.random() * 10) : 0, quote: i >= mid ? Math.max(0, (i - mid) * 9 + Math.random() * 8) : 0 };
    }),
  },
];

export const walletMonitor = [
  { label: "Bot 1 wallet", address: "5BgwREYGRxo1evzzmmTQPFaxgz4gLBEb7BEWSeUcjs8q", status: "idle", solBalance: 1.42, totalValueUsd: 412.8, source: "Bot" },
  { label: "Bot 2 wallet", address: "8mQzP2yV1kXwB3nR7dCzT4uJ6hLpN9sK2eF5aG1bWxYz", status: "busy", solBalance: 0.87, totalValueUsd: 205.4, source: "Bot" },
  { label: "Bot 3 wallet", address: "3xT9vN5mQ8pL2rY6cW1zK4hJ7bF0dS3eA9gU5nM8vXqR", status: "idle", solBalance: 0.5, totalValueUsd: 50.0, source: "Bot" },
  { label: "Cold storage (watch only)", address: "Ab3dEfGh...zzYy", status: "-", solBalance: 12.1, totalValueUsd: 2180.0, source: "Manual" },
];

// Each rule states its trigger (the mechanical condition that fires it) and
// its measured outcome — not just a description, so the table answers "what
// exactly does this rule do, and is it working" at a glance.
export const ruleLessons = [
  {
    id: "rule-01",
    label: "Rule 01",
    rule: "Trailing take-profit",
    trigger: "PnL peak >= 3% armed, then drop >=1.5% from peak -> close",
    winRate: 71,
    avgPnlUsd: 4.2,
    sampleSize: 22,
    bot: "Bot 1",
  },
  {
    id: "rule-02",
    label: "Rule 02",
    rule: "Fee auto-claim",
    trigger: "Unclaimed fees >= $10 -> claim",
    winRate: null,
    avgPnlUsd: 9.8,
    sampleSize: 31,
    bot: "All bots",
  },
  {
    id: "rule-03",
    label: "Stop-loss 8%",
    rule: "Hard stop-loss",
    trigger: "PnL <= -8% -> force close",
    winRate: 18,
    avgPnlUsd: -6.4,
    sampleSize: 11,
    bot: "Bot 2",
  },
  {
    id: "rule-04",
    label: "Rule 04",
    rule: "Organic-score screening filter",
    trigger: "organic_score < 60 -> reject candidate before deploy",
    winRate: 64,
    avgPnlUsd: 1.8,
    sampleSize: 40,
    bot: "All bots",
  },
];

// Title = the actionable change being proposed. Context = the specific data
// point that triggered the proposal (bot, count, timeframe) — not a vague
// restatement of the rule. This is what a human needs to approve/reject
// with real judgment instead of rubber-stamping.
//
// `status` is the source of truth: "pending" | "approved" | "rejected".
// Approve/Reject in the UI only ever flips this field — a lesson record is
// never deleted, so there's always a full audit trail of what was proposed
// and what a human decided about it.
export const lessonApprovalQueue = [
  {
    id: "pend_1",
    title: "Widen range on volatile pairs",
    context: "Bot 2 — 3 stop-loss exits dalam 24h, range 6% terlalu sempit vs volatilitas token saat ini.",
    sampleSize: 3,
    confidence: "medium",
    status: "pending",
    decidedAt: null,
  },
  {
    id: "pend_2",
    title: "Skip pool TVL < $8K",
    context: "Bot 1 — peringatan low-liquidity berulang 4x pada pool berbeda, semua berujung slippage tinggi saat exit.",
    sampleSize: 4,
    confidence: "medium",
    status: "pending",
    decidedAt: null,
  },
  {
    id: "pend_3",
    title: "Discord-signaled pools — belum cukup data",
    context: "3 dari 3 simulated trade profitable, tapi sample masih terlalu kecil untuk dijadikan aturan tetap.",
    sampleSize: 3,
    confidence: "low",
    status: "pending",
    decidedAt: null,
  },
  {
    id: "pend_4",
    title: "Claim fees earlier on high-volume pools",
    context: "Bot 1 — 6 posisi dengan volume >$50K/24h kehilangan rata-rata $2.10 fee karena telat claim.",
    sampleSize: 6,
    confidence: "medium",
    status: "approved",
    decidedAt: new Date(Date.now() - 2 * 86400_000).toISOString(),
  },
  {
    id: "pend_5",
    title: "Blanket-ban semua token umur < 6 jam",
    context: "Diajukan dari 2 sample rug-pull, tapi terlalu luas — akan menolak juga token sehat yang baru listing.",
    sampleSize: 2,
    confidence: "low",
    status: "rejected",
    decidedAt: new Date(Date.now() - 5 * 86400_000).toISOString(),
  },
];

// Paper trading mock data
export const paperConfig = {
  "bot-3": {
    botId: "bot-3",
    paperTradingEnabled: true,
    virtualBalanceSOL: 10.0,
    virtualBalanceUSD: 1500.0,
    createdAt: "2026-07-01T00:00:00Z",
    updatedAt: "2026-07-06T08:00:00Z",
    note: "Sesi paper trading pertama",
    paperPollIntervalMin: 10,
  },
};

export const paperLedger = {
  "bot-3": {
    trades: [
      {
        id: "paper-trade-001",
        pool: "7cKW...VTQic",
        poolName: "ACM-SOL",
        openedAt: "2026-07-05T08:00:00Z",
        closedAt: "2026-07-05T09:30:00Z",
        strategy: "bid_ask",
        virtualAmountSOL: 0.5,
        virtualAmountUSD: 75.0,
        feesEarnedUSD: 4.2,
        ilUSD: -1.1,
        netPnLUSD: 3.1,
        netPnLSOL: 0.021,
        closeReason: "take_profit",
      },
      {
        id: "paper-trade-002",
        pool: "9pLm...Xq2R",
        poolName: "TOLY-SOL",
        openedAt: "2026-07-05T10:00:00Z",
        closedAt: "2026-07-05T12:15:00Z",
        strategy: "spot",
        virtualAmountSOL: 0.5,
        virtualAmountUSD: 75.0,
        feesEarnedUSD: 1.8,
        ilUSD: -5.2,
        netPnLUSD: -3.4,
        netPnLSOL: -0.023,
        closeReason: "stop_loss",
      },
      {
        id: "paper-trade-003",
        pool: "2xRt...Kp7L",
        poolName: "USWR-SOL",
        openedAt: "2026-07-06T06:00:00Z",
        closedAt: null,
        strategy: "bid_ask",
        virtualAmountSOL: 0.5,
        virtualAmountUSD: 75.0,
        feesEarnedUSD: 2.1,
        ilUSD: -0.4,
        netPnLUSD: null,
        netPnLSOL: null,
        closeReason: null,
        isOpen: true,
      },
    ],
    summary: {
      totalTrades: 2,
      winCount: 1,
      lossCount: 1,
      totalFeesUSD: 6.0,
      totalILUSD: -6.3,
      totalNetPnLUSD: -0.3,
      currentVirtualBalanceSOL: 9.998,
    },
  },
};

export const dryRunLessons = [
  {
    id: "dry-001",
    capturedAt: "2026-07-05T09:30:00Z",
    sourceBot: "bot-3",
    originalEntry: {
      rule: "PREFER bid_ask strategy on high-fee pools. Takeprofit hit +3.1% on ACM-SOL after 90 min.",
      tags: ["strategy", "bid_ask"],
      outcome: "positive",
      confidence: "medium",
    },
    status: "pending",
    reviewedAt: null,
    approvedToLiveAt: null,
    tradeRef: "paper-trade-001",
  },
  {
    id: "dry-002",
    capturedAt: "2026-07-05T12:15:00Z",
    sourceBot: "bot-3",
    originalEntry: {
      rule: "AVOID high-volatility tokens (>10%) with spot strategy. IL melebihi fee pada TOLY-SOL.",
      tags: ["strategy", "volatility", "il"],
      outcome: "negative",
      confidence: "medium",
    },
    status: "pending",
    reviewedAt: null,
    approvedToLiveAt: null,
    tradeRef: "paper-trade-002",
  },
  {
    id: "dry-003",
    capturedAt: "2026-07-04T14:00:00Z",
    sourceBot: "bot-3",
    originalEntry: {
      rule: "PREFER pools dengan organic_score > 70 — win rate lebih tinggi pada simulasi.",
      tags: ["screening", "organic"],
      outcome: "positive",
      confidence: "high",
    },
    status: "approved",
    reviewedAt: "2026-07-04T15:00:00Z",
    approvedToLiveAt: "2026-07-04T15:00:00Z",
    tradeRef: null,
  },
  {
    id: "dry-004",
    capturedAt: "2026-07-03T10:00:00Z",
    sourceBot: "bot-3",
    originalEntry: {
      rule: "AVOID token umur < 6 jam — 2 dari 2 simulasi berakhir stop-loss.",
      tags: ["screening", "token_age"],
      outcome: "negative",
      confidence: "low",
    },
    status: "rejected",
    reviewedAt: "2026-07-03T11:30:00Z",
    approvedToLiveAt: null,
    tradeRef: null,
  },
];

export const decisions = [
  { id: "dec_1", ts: new Date().toISOString(), actor: "SCREENER", type: "no_deploy", summary: "No valid entry this cycle", reason: "Best candidate BABYANSEM-SOL — wallet has 0 SOL, cannot execute deployment.", rejected: [] },
  { id: "dec_2", ts: new Date(Date.now() - 3600_000).toISOString(), actor: "MANAGER", type: "close", summary: "Closed WIF-SOL position", reason: "Stop loss triggered at -8.4%", rejected: [] },
];

export const winLossSummary = {
  winPct: 62,
  winLabel: "Menang — fee > IL, in-range",
  lossPct: 23,
  lossLabel: "Kalah — IL > fee, range sempit",
  totalClosed: 47,
};

export const chatHistoryByTarget = {
  "bot-1": [
    { role: "user", content: "status posisi sekarang gimana?" },
    { role: "assistant", content: "Bot 1 punya 2 posisi terbuka: BONK-SOL (+4.2%) dan WIF-SOL (-1.8%, out of range).", tokens: 612, costUsd: 0.0021 },
  ],
  orchestrator: [
    { role: "user", content: "bandingkan performa 3 bot minggu ini" },
    { role: "assistant", content: "Bot 1 total PnL +$84.32, Bot 2 -$12.50, Bot 3 belum ada trade (dry run). Bot 1 paling stabil.", tokens: 890, costUsd: 0.0031 },
  ],
};

// Mock OHLCV — 60 candles, 5-minute interval, shape matches lightweight-charts input
export function generateMockOhlcv(count = 60, basePrice = 0.00042) {
  const candles = [];
  let price = basePrice;
  const now = Math.floor(Date.now() / 1000);
  for (let i = count; i > 0; i--) {
    const open = price;
    const change = (Math.random() - 0.48) * open * 0.03;
    const close = Math.max(0.0000001, open + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.008);
    const low = Math.min(open, close) * (1 - Math.random() * 0.008);
    candles.push({
      time: now - i * 300,
      open: Number(open.toFixed(8)),
      high: Number(high.toFixed(8)),
      low: Number(low.toFixed(8)),
      close: Number(close.toFixed(8)),
      volume: Math.round(1000 + Math.random() * 9000),
    });
    price = close;
  }
  return candles;
}

export const feeBreakdown = { base: 0.002, dynamic: 0.0015, protocol: 0.0005, total: 0.004 };

// Stats per scope × timeframe — stat cards read from here
export const dashboardStats = {
  all: {
    "Last 24 hours": { netPnl: 383.71, fees: 42.60, winRate: 75, trades: 47, pnlTrend: [24, 18, 42, -8, 38, 61, 77], feeTrend: [4.1, 5.2, 8.8, 2.1, 6.9, 9.3, 9.1] },
    "Last 7 days":   { netPnl: 1240.5, fees: 187.3, winRate: 68, trades: 203, pnlTrend: [120, 180, 95, 240, 310, 280, 390], feeTrend: [18, 24, 16, 31, 42, 38, 44] },
    "Last 30 days":  { netPnl: 4820.0, fees: 612.8, winRate: 71, trades: 840, pnlTrend: [820, 1100, 950, 1400, 1200, 1600, 1900], feeTrend: [80, 110, 90, 140, 120, 160, 180] },
  },
  "bot-1": {
    "Last 24 hours": { netPnl: 210.40, fees: 24.10, winRate: 82, trades: 28, pnlTrend: [14, 18, 32, 4, 28, 42, 54], feeTrend: [2.5, 3.1, 4.8, 1.8, 4.0, 6.1, 7.2] },
    "Last 7 days":   { netPnl: 720.30, fees: 103.4, winRate: 79, trades: 112, pnlTrend: [80, 110, 70, 140, 180, 160, 210], feeTrend: [11, 14, 9, 18, 24, 22, 26] },
    "Last 30 days":  { netPnl: 2940.0, fees: 381.2, winRate: 76, trades: 480, pnlTrend: [500, 680, 590, 880, 760, 1000, 1200], feeTrend: [48, 66, 58, 88, 76, 100, 110] },
  },
  "bot-2": {
    "Last 24 hours": { netPnl: 173.31, fees: 18.50, winRate: 71, trades: 19, pnlTrend: [10, 0, 10, -12, 10, 19, 23], feeTrend: [1.6, 2.1, 4.0, 0.3, 2.9, 3.2, 1.9] },
    "Last 7 days":   { netPnl: 520.20, fees: 83.90, winRate: 63, trades: 91,  pnlTrend: [40, 70, 25, 100, 130, 120, 180], feeTrend: [7, 10, 7, 13, 18, 16, 18] },
    "Last 30 days":  { netPnl: 1880.0, fees: 231.6, winRate: 65, trades: 360, pnlTrend: [320, 420, 360, 520, 440, 600, 700], feeTrend: [32, 44, 32, 52, 44, 60, 70] },
  },
  "bot-3": {
    "Last 24 hours": { netPnl: 0, fees: 0, winRate: 0, trades: 0, pnlTrend: [0,0,0,0,0,0,0], feeTrend: [0,0,0,0,0,0,0] },
    "Last 7 days":   { netPnl: 0, fees: 0, winRate: 0, trades: 0, pnlTrend: [0,0,0,0,0,0,0], feeTrend: [0,0,0,0,0,0,0] },
    "Last 30 days":  { netPnl: 0, fees: 0, winRate: 0, trades: 0, pnlTrend: [0,0,0,0,0,0,0], feeTrend: [0,0,0,0,0,0,0] },
  },
};

// botId must match bots[].id so activity filtering by scope works
export const recentActivity = [
  { time: "10:42", botId: "bot-1", bot: "Bot 1", pool: "BONK-SOL",    event: "Range exit, position rebalanced",         result: "Rebalanced", resultType: "neutral" },
  { time: "10:15", botId: "bot-2", bot: "Bot 2", pool: "POPCAT-SOL",  event: "Auto fee claim +$12.40",                  result: "Claimed",    resultType: "success" },
  { time: "09:30", botId: "bot-1", bot: "Bot 1", pool: "WIF-SOL",     event: "Manual close by user",                    result: "Closed",     resultType: "neutral" },
  { time: "08:55", botId: "bot-2", bot: "Bot 2", pool: "MOODENG-SOL", event: "Stop-loss triggered at -8.4%",            result: "Closed",     resultType: "error"   },
  { time: "08:10", botId: "bot-1", bot: "Bot 1", pool: "BONK-SOL",    event: "New position opened, 0.5 SOL deployed",   result: "Deployed",   resultType: "success" },
  { time: "07:44", botId: "bot-2", bot: "Bot 2", pool: "TOLY-SOL",    event: "Position out-of-range for 32 min",        result: "OOR",        resultType: "error"   },
  { time: "07:10", botId: "bot-1", bot: "Bot 1", pool: "ACM-SOL",     event: "Trailing take-profit fired at +3.2%",     result: "Closed",     resultType: "success" },
  { time: "06:30", botId: "bot-1", bot: "Bot 1", pool: "USWR-SOL",    event: "New position opened, 0.35 SOL deployed",  result: "Deployed",   resultType: "success" },
  { time: "05:55", botId: "bot-2", bot: "Bot 2", pool: "POPCAT-SOL",  event: "Low yield — fee/TVL < 0.07%, closed",     result: "Closed",     resultType: "neutral" },
  { time: "05:20", botId: "bot-1", bot: "Bot 1", pool: "GIGA-SOL",    event: "Auto fee claim +$8.90",                   result: "Claimed",    resultType: "success" },
];
