// Minimal static-file stub — serves the built frontend. NOT wired to any bot
// data yet (no routes to state.json/user-config.json/CLI subprocess calls).
// That wiring is the next phase, once the UI mockup is signed off.
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, "../frontend/dist");
const PORT = Number(process.env.PORT) || 4001;

const app = Fastify({ logger: true });

app.register(fastifyStatic, {
  root: DIST_DIR,
});

// SPA fallback — any unmatched route serves index.html so client-side routing works.
app.setNotFoundHandler((req, reply) => {
  reply.sendFile("index.html");
});

app.listen({ port: PORT, host: "127.0.0.1" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
