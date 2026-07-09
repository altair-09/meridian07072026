import bcrypt from "bcryptjs";

/**
 * Single-admin session auth. Not multi-tenant — this dashboard controls a
 * wallet, so anything reachable without a valid session (including chat,
 * which has full GENERAL-role tool access) is a real financial risk.
 */
export function requireAuth(req, res, next) {
  if (req.path === "/login.html") return next(); // unauthenticated login page itself
  if (req.session?.authed) return next();
  if (req.path.startsWith("/api/")) return res.status(401).json({ error: "unauthenticated" });
  return res.redirect("/login.html");
}

export function loginHandler(req, res) {
  const { username, password } = req.body || {};
  const expectedUser = process.env.WEB_ADMIN_USER;
  const expectedHash = process.env.WEB_ADMIN_PASSWORD_HASH;

  if (!expectedUser || !expectedHash) {
    return res.status(500).json({ error: "WEB_ADMIN_USER / WEB_ADMIN_PASSWORD_HASH not configured in .env" });
  }
  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "username and password required" });
  }
  if (username !== expectedUser || !bcrypt.compareSync(password, expectedHash)) {
    return res.status(401).json({ error: "invalid credentials" });
  }
  req.session.authed = true;
  req.session.username = username;
  return res.json({ success: true });
}

export function logoutHandler(req, res) {
  req.session.destroy(() => res.json({ success: true }));
}
