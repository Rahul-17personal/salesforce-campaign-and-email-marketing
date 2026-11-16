import { randomBytes, timingSafeEqual } from "node:crypto";
import { Router, type Request } from "express";
import rateLimit from "express-rate-limit";
import { config, isSalesforceConfigured } from "../config.js";
import { decryptToken, encryptToken } from "../security/tokenCrypto.js";
import {
  createAuthorizationUrl,
  createPkcePair,
  exchangeAuthorizationCode,
  getSalesforceIdentity,
  revokeSalesforceToken
} from "./salesforceOAuth.js";

const router = Router();
const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

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
function redirectWithError(res: import("express").Response, code: string): void {
  const url = new URL("/", config.WEB_ORIGIN);
  url.searchParams.set("authError", code);
  res.redirect(303, url.toString());
}

router.get("/status", async (req, res, next) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    if (!req.session.csrfToken) {
      req.session.csrfToken = randomBytes(32).toString("base64url");
      await saveSession(req);
    }
    const connection = req.session.salesforceConnection;
    res.json({
      configured: isSalesforceConfigured(),
      authenticated: Boolean(connection),
      csrfToken: req.session.csrfToken,
      user: connection ? {
        userId: connection.userId,
        orgId: connection.orgId,
        username: connection.username,
        displayName: connection.displayName,
        email: connection.email
      } : null
    });
  } catch (error) {
    next(error);
  }
});

router.get("/salesforce", oauthLimiter, async (req, res, next) => {
  try {
    if (!isSalesforceConfigured()) {
      res.status(503).json({
        error: "OAUTH_NOT_CONFIGURED",
        message: "Salesforce OAuth credentials, session secret and token encryption key must be configured on the server."
      });
      return;
    }
    const state = randomBytes(32).toString("base64url");
    const pkce = createPkcePair();
    req.session.oauthState = state;
    req.session.pkceVerifier = pkce.verifier;
    await saveSession(req);
    res.redirect(302, createAuthorizationUrl(state, pkce.challenge));
  } catch (error) {
    next(error);
  }
});

router.get("/salesforce/callback", oauthLimiter, async (req, res) => {
  const state = typeof req.query.state === "string" ? req.query.state : undefined;
  const code = typeof req.query.code === "string" ? req.query.code : undefined;
  const providerError = typeof req.query.error === "string" ? req.query.error : undefined;
  const expectedState = req.session.oauthState;
  const verifier = req.session.pkceVerifier;

  // Consume and persist the one-time state before token exchange to prevent callback replay.
  delete req.session.oauthState;
  delete req.session.pkceVerifier;
  try {
    await saveSession(req);
  } catch {
    redirectWithError(res, "session_validation_failed");
    return;
  }

  if (!safeEqual(state, expectedState) || !verifier) {
    redirectWithError(res, "state_validation_failed");
    return;
  }
  if (providerError || !code) {
    redirectWithError(res, providerError === "access_denied" ? "access_denied" : "authorization_failed");
    return;
  }
  if (!isSalesforceConfigured()) {
    redirectWithError(res, "oauth_not_configured");
    return;
  }

  try {
    const token = await exchangeAuthorizationCode(code, verifier);
    const identity = await getSalesforceIdentity(token);

    // Rotate the local session identifier after authentication to prevent session fixation.
    await regenerateSession(req);
    req.session.csrfToken = randomBytes(32).toString("base64url");
    req.session.salesforceConnection = {
      userId: identity.user_id,
      orgId: identity.organization_id,
      username: identity.username,
      displayName: identity.display_name || identity.username,
      ...(identity.email ? { email: identity.email } : {}),
      instanceUrl: token.instance_url,
      encryptedAccessToken: encryptToken(token.access_token),
      ...(token.refresh_token ? { encryptedRefreshToken: encryptToken(token.refresh_token) } : {}),
      connectedAt: new Date().toISOString()
    };
    await saveSession(req);

    const destination = new URL("/", config.WEB_ORIGIN);
    destination.searchParams.set("auth", "connected");
    res.redirect(303, destination.toString());
  } catch {
    // Never log tokens, authorization codes, identity payloads or provider error bodies.
    redirectWithError(res, "salesforce_login_failed");
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    if (req.get("origin") !== config.WEB_ORIGIN ||
        !safeEqual(req.session.csrfToken, req.get("x-csrf-token"))) {
      res.status(403).json({ error: "CSRF_VALIDATION_FAILED", message: "Request could not be verified." });
      return;
    }

    const connection = req.session.salesforceConnection;
    const encryptedToken = connection?.encryptedRefreshToken ?? connection?.encryptedAccessToken;
    if (encryptedToken) {
      try {
        await revokeSalesforceToken(decryptToken(encryptedToken));
      } catch {
        // The local session is cleared even if remote revocation is unavailable.
      }
    }

    await destroySession(req);
    res.clearCookie(config.SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    });
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
