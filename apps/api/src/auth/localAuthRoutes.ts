import { randomBytes, timingSafeEqual } from "node:crypto";
import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { config } from "../config.js";

const router = Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: "draft-7", legacyHeaders: false });
const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(128)
});
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("campaignhub-dummy-credential", 10);

function safeEqual(left: string | undefined, right: string | undefined): boolean {
  if (!left || !right) return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => req.session.save((error) => error ? reject(error) : resolve()));
}
function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
}
function destroySession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => req.session.destroy((error) => error ? reject(error) : resolve()));
}
function isSameOrigin(req: Request): boolean {
  return req.get("origin") === config.WEB_ORIGIN;
}
function publicUser(user: { id: string; full_name: string; email: string; role: "admin" | "marketer" | "viewer" }) {
  return { id: user.id, fullName: user.full_name, email: user.email, role: user.role };
}

router.get("/status", async (req, res, next) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    if (!req.session.csrfToken) {
      req.session.csrfToken = randomBytes(32).toString("base64url");
      await saveSession(req);
    }
    res.json({
      authenticated: Boolean(req.session.user),
      csrfToken: req.session.csrfToken,
      user: req.session.user ?? null
    });
  } catch (error) { next(error); }
});

router.post("/login", loginLimiter, async (req, res, next) => {
  try {
    if (!isSameOrigin(req)) {
      res.status(403).json({ error: "ORIGIN_VALIDATION_FAILED", message: "Request origin could not be verified." });
      return;
    }
    if (!safeEqual(req.session.csrfToken, req.get("x-csrf-token"))) {
      res.status(403).json({ error: "CSRF_VALIDATION_FAILED", message: "Refresh the page and try signing in again." });
      return;
    }
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "INVALID_LOGIN_INPUT", message: "Enter a valid email address and password." });
      return;
    }

    const email = parsed.data.email.toLowerCase();
    const result = await pool.query<{
      id: string; full_name: string; email: string; password_hash: string;
      role: "admin" | "marketer" | "viewer"; status: string;
    }>(
      "SELECT id, full_name, email, password_hash, role, status FROM app_users WHERE LOWER(email) = $1 LIMIT 1",
      [email]
    );
    const user = result.rows[0];
    const passwordMatches = await bcrypt.compare(parsed.data.password, user?.password_hash ?? DUMMY_PASSWORD_HASH);
    if (!user || user.status !== "active" || !passwordMatches) {
      res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Email or password is incorrect." });
      return;
    }

    await regenerateSession(req);
    req.session.user = publicUser(user);
    req.session.csrfToken = randomBytes(32).toString("base64url");
    await pool.query("UPDATE app_users SET last_login_at = NOW() WHERE id = $1", [user.id]);
    await pool.query(
      "INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES ($1, 'auth.login', 'user', $1)",
      [user.id]
    );
    await saveSession(req);

    res.setHeader("Cache-Control", "no-store");
    res.json({ success: true, user: req.session.user, csrfToken: req.session.csrfToken });
  } catch (error) { next(error); }
});

router.post("/logout", async (req, res, next) => {
  try {
    if (!isSameOrigin(req) || !safeEqual(req.session.csrfToken, req.get("x-csrf-token"))) {
      res.status(403).json({ error: "CSRF_VALIDATION_FAILED", message: "Request could not be verified." });
      return;
    }
    const user = req.session.user;
    if (user) {
      await pool.query(
        "INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES ($1, 'auth.logout', 'user', $1)",
        [user.id]
      );
    }
    await destroySession(req);
    res.clearCookie(config.SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    });
    res.status(200).json({ success: true });
  } catch (error) { next(error); }
});

export default router;
