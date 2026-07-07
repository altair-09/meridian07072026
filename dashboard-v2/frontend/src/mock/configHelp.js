export const configHelp = {
  // General
  preset: "Preset konfigurasi yang dipakai saat setup (degen/moderate/safe/custom).",
  rpcUrl: "Solana RPC endpoint. Helius sangat direkomendasikan untuk performa optimal.",
  llmBaseUrl: "OpenAI-compatible API base URL. Kosongkan untuk pakai OpenRouter default.",
  llmApiKey: "API key untuk LLM provider (OpenRouter atau custom endpoint).",
  llmModel: "Model default jika role-specific model tidak di-set.",
  dryRun: "Kalau aktif, semua transaksi on-chain di-skip. Gunakan untuk paper trading.",

  // Position sizing
  deployAmountSol: "Jumlah SOL minimum yang di-deploy per posisi (floor dari positionSizePct).",
  maxPositions: "Maksimum posisi terbuka yang diizinkan secara bersamaan.",
  minSolToOpen: "Minimum SOL di wallet agar screener mau deploy. Di bawah ini bot berhenti screening.",
  maxDeployAmount: "Batas atas deploy amount per posisi (SOL), override positionSizePct jika hasilnya lebih besar.",
  gasReserve: "SOL yang disisihkan untuk gas — tidak akan pernah di-deploy.",
  positionSizePct: "Persentase (0-1) dari wallet yang di-deploy per posisi. Dihitung dari sisa setelah gasReserve.",

  // Strategy / Range
  strategy: "Strategi LP default: bid_ask (bimodal), curve (bell), spot (flat).",
  minBinsBelow: "Minimum jumlah bin di bawah harga aktif saat deploy. Hard floor: 35.",
  maxBinsBelow: "Maksimum bin di bawah harga aktif. Hard ceiling: 69.",
  defaultBinsBelow: "Default bin di bawah harga aktif jika LLM tidak memilih.",

  // Screening
  timeframe: "Jendela waktu screening (5m/30m/1h/2h/4h/12h/24h). 15m tidak didukung Meteora API.",
  category: "Filter kategori pool Meteora, misal: trending.",
  excludeHighSupplyConcentration: "Hard-filter pool dengan konsentrasi supply sangat tinggi.",
  minTvl: "Minimum TVL pool (USD) agar dipertimbangkan.",
  maxTvl: "Maksimum TVL pool (USD) — hindari pool yang terlalu besar/tidak aktif.",
  minVolume: "Minimum volume trading (USD) dalam timeframe screening.",
  minOrganic: "Minimum organic score (0-100) — filter wash trading dan bot volume.",
  minQuoteOrganic: "Minimum organic score sisi quote token.",
  minHolders: "Minimum jumlah holder token. Terlalu sedikit adalah sinyal rug-pull.",
  minMcap: "Minimum market cap token (USD).",
  maxMcap: "Maksimum market cap token (USD).",
  minBinStep: "Minimum Meteora bin step yang diizinkan.",
  maxBinStep: "Maksimum bin step yang diizinkan.",
  minFeeActiveTvlRatio: "Minimum rasio fee terhadap active TVL yang harus ditunjukkan pool.",
  minTokenFeesSol: "Minimum total fee (SOL) yang dibayar trader token — di bawah ini sering bundled volume.",
  useDiscordSignals: "Gunakan sinyal dari Discord listener untuk kandidat pool.",
  discordSignalMode: "merge = gabung Discord + reguler; only = Discord signals saja.",
  avoidPvpSymbols: "Warn (tidak block) saat ada pool rival dengan simbol sama.",
  blockPvpSymbols: "Hard-filter rival PVP sebelum LLM melihat kandidat.",
  maxBotHoldersPct: "Maksimum % holder yang terdeteksi sebagai bot.",
  maxTop10Pct: "Maksimum % supply yang dipegang 10 holder terbesar.",
  allowedLaunchpads: "Jika diisi, HANYA launchpad ini yang dipertimbangkan. Kosong = semua.",
  blockedLaunchpads: "Launchpad yang di-hard-exclude sebelum LLM melihat kandidat.",
  minTokenAgeHours: "Minimum umur token (jam) agar eligible. Null = tidak ada batas bawah.",
  maxTokenAgeHours: "Maksimum umur token (jam). Null = tidak ada batas atas.",

  // Management
  minClaimAmount: "Minimum unclaimed fees (USD) sebelum auto-claim dijalankan.",
  autoSwapAfterClaim: "Otomatis swap base token ke SOL setelah claim fees.",
  outOfRangeBinsToClose: "Jumlah bin OOR (di luar range) sebelum posisi ditandai untuk close.",
  outOfRangeWaitMinutes: "Menit tunggu OOR sebelum close otomatis dijalankan.",
  oorCooldownTriggerCount: "Jumlah close OOR berturut-turut sebelum cooldown pool+token diaktifkan.",
  oorCooldownHours: "Durasi cooldown (jam) setelah OOR trigger count tercapai.",
  minVolumeToRebalance: "Minimum volume (USD) agar rebalance dipertimbangkan.",
  stopLossPct: "Stop loss (negatif, persen). Posisi ditutup paksa jika PnL menyentuh ini.",
  takeProfitPct: "Take profit (persen). Posisi ditutup saat PnL mencapai ini.",
  minFeePerTvl24h: "Minimum fee per TVL 24h (%) agar posisi dianggap yield cukup.",
  minAgeBeforeYieldCheck: "Umur minimum posisi (menit) sebelum yield check mulai dijalankan.",
  trailingTakeProfit: "Aktifkan trailing take profit — tidak close langsung saat peak, tunggu drop.",
  trailingTriggerPct: "PnL (%) yang harus dicapai untuk mengaktifkan trailing TP.",
  trailingDropPct: "Drop dari peak (%) yang memicu trailing TP close.",
  pnlSanityMaxDiffPct: "Batas perbedaan PnL reported vs derived (%). Lebih dari ini = tidak dipercaya.",
  solMode: "Hitung PnL dalam SOL, bukan USD.",
  repeatDeployCooldownEnabled: "Aktifkan cooldown jika pool di-deploy berulang terlalu sering.",
  repeatDeployCooldownTriggerCount: "Jumlah deploy berturut-turut yang memicu cooldown.",
  repeatDeployCooldownHours: "Durasi cooldown repeat-deploy (jam).",

  // Schedule
  managementIntervalMin: "Interval siklus management (menit). Min 1.",
  screeningIntervalMin: "Interval siklus screening (menit). Min 1.",
  healthCheckIntervalMin: "Interval health check (menit).",

  // LLM
  temperature: "Temperature LLM (0-1). Lebih tinggi = lebih kreatif/random.",
  maxTokens: "Maksimum token per LLM response.",
  maxSteps: "Maksimum langkah ReAct loop per cycle.",
  managementModel: "Model LLM untuk role MANAGER.",
  screeningModel: "Model LLM untuk role SCREENER.",
  generalModel: "Model LLM untuk chat umum (GENERAL role).",

  // Darwin
  darwinEnabled: "Aktifkan Darwinian signal weighting — auto-boost/decay bobot sinyal screening berdasarkan outcome.",
  darwinWindowDays: "Jendela data historis (hari) untuk perhitungan Darwin.",
  darwinRecalcEvery: "Recalculate bobot sinyal setiap N close.",
  darwinBoost: "Multiplier boost untuk sinyal top quartile (biasanya 1.05).",
  darwinDecay: "Multiplier decay untuk sinyal bottom quartile (biasanya 0.95).",
  darwinFloor: "Batas bawah bobot sinyal (tidak akan turun di bawah ini).",
  darwinCeiling: "Batas atas bobot sinyal (tidak akan naik di atas ini).",
  darwinMinSamples: "Minimum sample sebelum Darwin mulai recalculate.",

  // Agent Meridian / API
  agentId: "ID unik agent ini di ekosistem Agent Meridian. Auto-generated jika kosong.",
  publicApiKey: "API key publik untuk Agent Meridian. Bawaan sudah tersedia.",
  agentMeridianApiUrl: "Base URL Agent Meridian API.",
  lpAgentRelayEnabled: "Gunakan LPAgent relay (zap-in via Agent Meridian) saat deploy.",

  // PnL source
  pnlSource: "Sumber data PnL: rpc (langsung dari chain) atau lainnya.",
  pnlRpcUrl: "RPC URL khusus untuk polling PnL. Bisa sama dengan rpcUrl.",
  pnlPollIntervalSec: "Interval polling PnL (detik). Default 3.",
  pnlDepositCacheTtlSec: "TTL cache deposit data (detik). Default 300.",

  // GMGN
  gmgnFeeSource: "Sumber data fee: gmgn atau meteora.",
  gmgnApiKey: "API key untuk GMGN fee source.",

  // Chart indicators
  "chartIndicators.enabled": "Aktifkan konfirmasi indikator teknikal sebelum entry/exit.",
  "chartIndicators.entryPreset": "Preset indikator untuk konfirmasi entry.",
  "chartIndicators.exitPreset": "Preset indikator untuk konfirmasi exit.",
  "chartIndicators.rsiLength": "RSI lookback period.",
  "chartIndicators.intervals": "Candle intervals yang dicek (misal: 5_MINUTE). Pisah koma.",
  "chartIndicators.candles": "Jumlah candle yang di-fetch untuk kalkulasi indikator.",
  "chartIndicators.rsiOversold": "Level RSI yang dianggap oversold.",
  "chartIndicators.rsiOverbought": "Level RSI yang dianggap overbought.",
  "chartIndicators.requireAllIntervals": "Jika true, SEMUA interval harus konfirmasi, bukan salah satu.",

  // Telegram / HiveMind
  telegramChatId: "Telegram Chat ID untuk notifikasi. Diisi otomatis saat bot pertama terima pesan.",
  hiveMindUrl: "URL server HiveMind shared-learning. Selalu aktif — tidak ada toggle disable.",
  hiveMindApiKey: "API key untuk HiveMind server.",
  hiveMindPullMode: "auto = pull lesson otomatis; manual = hanya on-demand.",
};
