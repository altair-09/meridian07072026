function dashboard() {
  return {
    tab: "dashboard",
    tabs: [
      { id: "dashboard", label: "Dashboard" },
      { id: "screening", label: "Screening" },
      { id: "lessons", label: "Lessons" },
      { id: "sim", label: "Simulasi" },
      { id: "chat", label: "Chat" },
    ],
    showConfigModal: false,
    showEnvModal: false,
    envKeys: [],
    envForm: { newPassword: "", values: {} },
    envStatus: "",
    dryRun: false,
    positions: null,
    tokenUsage: null,
    decisions: [],
    lessons: [],
    perfSummary: null,
    cfg: { screening: {}, management: {}, risk: {}, strategy: {}, schedule: {}, simulation: { abTestEnabled: false, altConfig: {} } },
    help: {},
    openHelp: null,
    configStatus: "",
    simPositions: [],
    pendingLessons: [],
    chatMessages: [],
    chatInput: "",
    chatBusy: false,
    walletBalance: null,

    underPm2: false,
    modeStatus: "",

    poolMode: "recommended",
    pools: [],
    poolsLoading: false,
    sortKey: "tvl",
    sortDir: "desc",
    deployStatus: "",

    get sortedPools() {
      const key = this.sortKey;
      const dir = this.sortDir === "asc" ? 1 : -1;
      return [...this.pools].sort((a, b) => {
        const av = a[key], bv = b[key];
        if (typeof av === "string" || typeof bv === "string") {
          return dir * String(av ?? "").localeCompare(String(bv ?? ""));
        }
        return dir * ((av ?? 0) - (bv ?? 0));
      });
    },

    async init() {
      await this.loadSystemStatus();
      await Promise.all([this.loadHelp(), this.loadConfig(), this.loadDashboard(), this.loadWallet(), this.loadLessons(), this.loadChatHistory(), this.loadSim(), this.loadPools()]);
      this.connectStream();
      setInterval(() => { this.loadSim(); }, 20000);
    },

    async api(path, opts = {}) {
      const res = await fetch(path, {
        headers: { "Content-Type": "application/json" },
        ...opts,
      });
      if (res.status === 401) { window.location.href = "/login.html"; throw new Error("unauthenticated"); }
      return res.json();
    },

    async loadPools() {
      this.poolsLoading = true;
      try {
        const data = await this.api(`/api/screening/pools?mode=${this.poolMode}&limit=30`);
        this.pools = data.pools || [];
      } catch {
        this.pools = [];
      } finally {
        this.poolsLoading = false;
      }
    },

    setPoolMode(mode) {
      this.poolMode = mode;
      this.loadPools();
    },

    sortPools(key) {
      if (this.sortKey === key) this.sortDir = this.sortDir === "asc" ? "desc" : "asc";
      else { this.sortKey = key; this.sortDir = "desc"; }
    },

    async openDeploy(pool) {
      const modeLabel = this.dryRun ? "DRY RUN (aman, tidak nyata)" : "LIVE (transaksi SUNGGUHAN)";
      const defaultAmount = this.cfg?.management?.deployAmountSol ?? 0.5;
      const input = prompt(`Deploy ke ${pool.name}\nMode saat ini: ${modeLabel}\n\nJumlah SOL:`, defaultAmount);
      if (input == null) return;
      const amount = Number(input);
      if (!Number.isFinite(amount) || amount <= 0) { this.deployStatus = "Jumlah SOL tidak valid."; return; }
      if (!confirm(`Konfirmasi: deploy ${amount} SOL ke ${pool.name} (${modeLabel})?`)) return;

      this.deployStatus = "Mengirim...";
      try {
        const result = await this.api("/api/screening/deploy", {
          method: "POST",
          body: JSON.stringify({
            pool_address: pool.pool,
            pool_name: pool.name,
            amount_sol: amount,
            bin_step: pool.bin_step,
            fee_tvl_ratio: pool.fee_active_tvl_ratio,
          }),
        });
        if (result.blocked) this.deployStatus = `Ditolak: ${result.reason}`;
        else if (result.error) this.deployStatus = `Gagal: ${result.error}`;
        else if (result.dry_run) this.deployStatus = `Dry run tercatat sebagai simulasi: ${result.message}`;
        else this.deployStatus = `Berhasil deploy ke ${pool.name}.`;
        this.loadDashboard();
      } catch (e) {
        this.deployStatus = `Gagal: ${e.message}`;
      }
      setTimeout(() => (this.deployStatus = ""), 8000);
    },

    async loadSystemStatus() {
      const s = await this.api("/api/system/status").catch(() => null);
      if (s) {
        this.dryRun = !!s.dryRun;
        this.underPm2 = !!s.underPm2;
        this.envKeys = s.envKeys || [];
        this.envForm.values = Object.fromEntries(this.envKeys.map((k) => [k, ""]));
      }
    },

    openConfigModal() {
      this.showConfigModal = true;
    },

    async saveEnv() {
      this.envStatus = "Menyimpan...";
      const values = Object.fromEntries(Object.entries(this.envForm.values).filter(([, v]) => v));
      try {
        const result = await this.api("/api/system/env", {
          method: "POST",
          body: JSON.stringify({ values, newPassword: this.envForm.newPassword || undefined }),
        });
        this.envStatus = result.error ? `Gagal: ${result.error}` : (result.message || "Tersimpan. Sedang restart...");
        if (!result.error) {
          this.envForm.newPassword = "";
          this.envForm.values = Object.fromEntries(this.envKeys.map((k) => [k, ""]));
        }
      } catch (e) {
        this.envStatus = `Gagal: ${e.message}`;
      }
    },

    async toggleDryRun() {
      const next = !this.dryRun;
      const label = next ? "DRY RUN (aman, tanpa transaksi nyata)" : "LIVE (transaksi nyata akan dieksekusi)";
      if (!confirm(`Ganti mode ke ${label}?`)) return;
      const result = await this.api("/api/system/dryrun", { method: "POST", body: JSON.stringify({ enabled: next }) });
      if (result.error) { this.modeStatus = `Gagal: ${result.error}`; return; }
      this.dryRun = result.dryRun;
      this.modeStatus = result.restarting
        ? "Menyimpan & merestart proses via PM2..."
        : (result.message || "Tersimpan.");
      setTimeout(() => (this.modeStatus = ""), 6000);
    },

    async loadHelp() {
      this.help = await fetch("/config-help.json").then((r) => r.json()).catch(() => ({}));
    },

    async loadConfig() {
      const cfg = await this.api("/api/config");
      if (!cfg.simulation) cfg.simulation = { abTestEnabled: false, altConfig: {} };
      this.cfg = cfg;
    },

    async loadWallet() {
      const data = await this.api("/api/wallet").catch(() => null);
      if (data && !data.error) this.walletBalance = data;
    },

    async loadDashboard() {
      const [positions, tokenUsage, decisions] = await Promise.all([
        this.api("/api/positions"),
        this.api("/api/token-usage"),
        this.api("/api/decisions"),
      ]);
      this.positions = positions;
      this.tokenUsage = tokenUsage;
      this.decisions = decisions.decisions || [];
    },

    async loadLessons() {
      const [lessons, perf] = await Promise.all([
        this.api("/api/lessons"),
        this.api("/api/lessons/performance"),
      ]);
      this.lessons = lessons.lessons || [];
      this.perfSummary = perf.summary;
    },

    async loadSim() {
      const sim = await this.api("/api/sim/positions").catch(() => ({ positions: [] }));
      this.simPositions = sim.positions || [];
      const pending = await this.api("/api/lessons/pending").catch(() => ({ pending: [] }));
      this.pendingLessons = pending.pending || [];
    },

    async loadChatHistory() {
      const h = await this.api("/api/chat/history").catch(() => ({ history: [] }));
      this.chatMessages = (h.history || []).map((m) => ({
        role: m.role,
        content: (m.content || "").replace(/^\[(Web|Telegram|REPL)\]\s*/, ""),
        channel: (m.content || "").match(/^\[(Web|Telegram|REPL)\]/)?.[1] || null,
      }));
    },

    connectStream() {
      const es = new EventSource("/api/stream");
      es.addEventListener("tick", (e) => {
        const data = JSON.parse(e.data);
        if (data.positions) this.positions = data.positions;
        if (data.tokenUsage) this.tokenUsage = data.tokenUsage;
      });
    },

    toggleHelp(key) {
      this.openHelp = this.openHelp === key ? null : key;
    },
    hoverHelp(key) {
      if (window.matchMedia("(hover: hover)").matches) this.openHelp = key;
    },

    async saveConfig() {
      this.configStatus = "Menyimpan...";
      const changes = {};
      for (const section of Object.keys(this.cfg)) {
        for (const [k, v] of Object.entries(this.cfg[section] || {})) {
          if (typeof v === "object") continue;
          changes[section === "simulation" ? (k === "abTestEnabled" ? "simAbTestEnabled" : "simAltConfig") : k] = v;
        }
      }
      const result = await this.api("/api/config", { method: "POST", body: JSON.stringify({ changes }) });
      this.configStatus = result.success ? "Tersimpan." : `Gagal: ${result.error || (result.unknown || []).join(", ")}`;
      setTimeout(() => (this.configStatus = ""), 4000);
    },

    async promotePending(id) {
      await this.api(`/api/lessons/pending/${id}/promote`, { method: "POST" });
      this.loadSim();
      this.loadLessons();
    },
    async dismissPending(id) {
      await this.api(`/api/lessons/pending/${id}/dismiss`, { method: "POST" });
      this.loadSim();
    },

    async sendChat() {
      const text = this.chatInput.trim();
      if (!text) return;
      this.chatMessages.push({ role: "user", content: text, channel: "Web" });
      this.chatInput = "";
      this.chatBusy = true;
      try {
        const res = await this.api("/api/chat", { method: "POST", body: JSON.stringify({ message: text }) });
        this.chatMessages.push({ role: "assistant", content: res.reply || res.error, channel: null });
      } finally {
        this.chatBusy = false;
        this.$nextTick(() => { this.$refs.chatLog.scrollTop = this.$refs.chatLog.scrollHeight; });
      }
    },

    async logout() {
      await fetch("/api/logout", { method: "POST" });
      window.location.href = "/login.html";
    },
  };
}
