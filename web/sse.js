// Server-Sent Events broadcast — one lightweight interval reading already-cached
// state (never triggers new RPC/LLM calls itself), pushed to all connected clients.
const clients = new Set();

export function sseHandler(req, res) {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders?.();
  clients.add(res);
  req.on("close", () => clients.delete(res));
}

export function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch { clients.delete(res); }
  }
}

/** Starts the periodic push. `collect` must be an async fn returning a plain object. */
export function startBroadcastLoop(collect, intervalMs = 15000) {
  const tick = async () => {
    if (clients.size === 0) return; // no point doing work with nobody listening
    try {
      const data = await collect();
      broadcast("tick", data);
    } catch (e) {
      broadcast("error", { message: e.message });
    }
  };
  const handle = setInterval(tick, intervalMs);
  handle.unref?.();
  return handle;
}
