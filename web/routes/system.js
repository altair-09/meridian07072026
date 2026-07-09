import express from "express";
import fs from "fs";
import bcrypt from "bcryptjs";
import { execFile } from "child_process";
import { repoPath } from "../../repo-root.js";
import { log } from "../../logger.js";

const router = express.Router();
const ENV_PATH = repoPath(".env");

// Fields the web .env editor is allowed to touch. Deliberately excludes
// WALLET_PRIVATE_KEY (and anything else that controls fund custody) — those
// stay edit-the-file-by-hand only, never round-tripped through a web form.
const ALLOWED_ENV_KEYS = new Set([
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "RPC_URL",
  "LLM_BASE_URL",
  "LLM_MODEL",
  "LLM_API_KEY",
  "HELIUS_API_KEY",
  "WEB_SESSION_SECRET",
]);

function updateEnvLine(key, value) {
  const lines = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/) : [];
  let found = false;
  const updated = lines.map((line) => {
    if (new RegExp(`^${key}\\s*=`).test(line)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!found) updated.push(`${key}=${value}`);
  fs.writeFileSync(ENV_PATH, updated.join("\n"));
}

function restartIfPm2() {
  if (process.env.pm_id == null) return false;
  execFile("pm2", ["restart", "meridian", "--update-env"], (err) => {
    if (err) log("system_error", `pm2 restart failed: ${err.message}`);
  });
  return true;
}

router.get("/status", (req, res) => {
  res.json({
    dryRun: process.env.DRY_RUN === "true",
    underPm2: process.env.pm_id != null,
    envKeys: [...ALLOWED_ENV_KEYS],
  });
});

/**
 * Flips DRY_RUN in .env (source of truth on restart — envcrypt.js reloads it
 * with override:true) and, if running under PM2, restarts the process so the
 * new value actually takes effect (DRY_RUN is only read once at startup).
 * If not under PM2, the change is saved but requires a manual restart —
 * a bare `node index.js` can't safely restart itself mid-request.
 */
router.post("/dryrun", (req, res) => {
  const { enabled } = req.body || {};
  if (typeof enabled !== "boolean") {
    return res.status(400).json({ error: "body must be { enabled: boolean }" });
  }

  try {
    updateEnvLine("DRY_RUN", enabled);
  } catch (e) {
    return res.status(500).json({ error: `Failed to write .env: ${e.message}` });
  }

  log("system", `DRY_RUN set to ${enabled} via dashboard`);

  const restarting = restartIfPm2();
  return res.json({
    success: true,
    dryRun: enabled,
    restarting,
    message: restarting ? undefined : "Saved to .env. Not running under PM2 — stop and restart `node index.js` manually to apply.",
  });
});

/**
 * Write-only .env editor — never reads back existing secret values (the
 * frontend only ever sends fields the user actually typed something into).
 * Whitelisted to non-custody fields; WALLET_PRIVATE_KEY is refused even if
 * somehow present in the request body.
 */
router.post("/env", (req, res) => {
  const { values, newPassword } = req.body || {};
  const applied = [];
  const rejected = [];

  if (values && typeof values === "object") {
    for (const [key, value] of Object.entries(values)) {
      if (value == null || value === "") continue;
      if (!ALLOWED_ENV_KEYS.has(key)) { rejected.push(key); continue; }
      try {
        updateEnvLine(key, value);
        applied.push(key);
      } catch (e) {
        return res.status(500).json({ error: `Failed to write ${key}: ${e.message}` });
      }
    }
  }

  if (typeof newPassword === "string" && newPassword.length > 0) {
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password minimal 8 karakter" });
    }
    const hash = bcrypt.hashSync(newPassword, 10);
    updateEnvLine("WEB_ADMIN_PASSWORD_HASH", hash);
    applied.push("WEB_ADMIN_PASSWORD_HASH");
  }

  log("system", `.env updated via dashboard: ${applied.join(", ") || "(nothing)"}${rejected.length ? ` — rejected: ${rejected.join(", ")}` : ""}`);

  const restarting = restartIfPm2();
  res.json({
    success: true,
    applied,
    rejected,
    restarting,
    message: restarting ? undefined : "Tersimpan ke .env. Restart proses manual untuk menerapkan (tidak berjalan di bawah PM2).",
  });
});

export default router;
