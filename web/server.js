import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import { requireAuth, loginHandler, logoutHandler } from "./auth.js";
import { sseHandler, startBroadcastLoop } from "./sse.js";
import dashboardRoutes from "./routes/dashboard.js";
import configRoutes from "./routes/config.js";
import lessonsRoutes from "./routes/lessons.js";
import chatRoutes from "./routes/chat.js";
import simRoutes from "./routes/sim.js";
import systemRoutes from "./routes/system.js";
import screeningRoutes from "./routes/screening.js";
import { getMyPositions } from "../tools/dlmm.js";
import { getTokenUsageSummary } from "../token-usage.js";
import { log } from "../logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");

/**
 * Starts the dashboard inside the same process as index.js's cron/Telegram
 * loops so it can read the same live `config` object and call the same
 * tool functions directly — no second process, no duplicate state.
 */
export function startWebServer(port = Number(process.env.WEB_PORT) || 4000) {
  const app = express();
  app.set("trust proxy", 1); // behind Nginx in production

  app.use(express.json());
  app.use(session({
    secret: process.env.WEB_SESSION_SECRET || "meridian-dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", secure: process.env.WEB_FORCE_SECURE_COOKIE === "true" },
  }));

  app.post("/api/login", loginHandler);
  app.post("/api/logout", logoutHandler);

  app.use(requireAuth);

  app.get("/api/stream", sseHandler);
  app.use("/api", dashboardRoutes); // exposes /api/positions, /api/token-usage, /api/decisions
  app.use("/api/config", configRoutes);
  app.use("/api/lessons", lessonsRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/sim", simRoutes);
  app.use("/api/system", systemRoutes);
  app.use("/api/screening", screeningRoutes);

  app.use(express.static(PUBLIC_DIR));
  app.get("*", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));

  // Periodic push: positions + token usage. Reads existing caches only.
  startBroadcastLoop(async () => {
    const [positions, tokenUsage] = await Promise.all([
      getMyPositions({ force: false, silent: true }).catch((e) => ({ error: e.message })),
      Promise.resolve(getTokenUsageSummary({ hours: 24 })),
    ]);
    return { positions, tokenUsage };
  }, 15000);

  app.use((err, req, res, _next) => {
    log("web_error", err.stack || err.message);
    res.status(500).json({ error: "internal error" });
  });

  const server = app.listen(port, () => {
    log("web", `Dashboard listening on http://localhost:${port}`);
  });
  return server;
}
