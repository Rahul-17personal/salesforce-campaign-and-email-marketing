import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { config } from "../config.js";

const tokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  instance_url: z.string().url(),
  id: z.string().url()
});

const identitySchema = z.object({
  user_id: z.string().min(1),
  organization_id: z.string().min(1),
  username: z.string().min(1),
  display_name: z.string().optional(),
  email: z.string().optional(),
  asserted_user: z.boolean().optional()
});

export type SalesforceTokenResponse = z.infer<typeof tokenSchema>;
export type SalesforceIdentity = z.infer<typeof identitySchema>;

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function createAuthorizationUrl(state: string, challenge: string): string {
  const url = new URL("/services/oauth2/authorize", config.SF_LOGIN_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.SF_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", config.SF_REDIRECT_URI);
  url.searchParams.set("scope", config.SF_SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export function isSalesforceHttpsUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      (url.hostname === "login.salesforce.com" ||
       url.hostname === "test.salesforce.com" ||
       url.hostname.endsWith(".salesforce.com") ||
       url.hostname.endsWith(".force.com") ||
       url.hostname.endsWith(".salesforce.mil") ||
       url.hostname.endsWith(".force.mil"));
  } catch {
    return false;
  }
}

export async function exchangeAuthorizationCode(
  code: string,
  verifier: string
): Promise<SalesforceTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: config.SF_CLIENT_ID ?? "",
    client_secret: config.SF_CLIENT_SECRET ?? "",
    redirect_uri: config.SF_REDIRECT_URI,
    code_verifier: verifier
  });

  const response = await fetch(new URL("/services/oauth2/token", config.SF_LOGIN_URL), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body,
    signal: AbortSignal.timeout(15_000)
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error("SALESFORCE_TOKEN_EXCHANGE_FAILED");

  const token = tokenSchema.parse(payload);
  if (!isSalesforceHttpsUrl(token.instance_url) || !isSalesforceHttpsUrl(token.id)) {
    throw new Error("SALESFORCE_TOKEN_RESPONSE_URL_INVALID");
  }
  return token;
}

export async function getSalesforceIdentity(token: SalesforceTokenResponse): Promise<SalesforceIdentity> {
  const identityUrl = new URL(token.id);
  const idParts = identityUrl.pathname.split("/").filter(Boolean);
  if (idParts.length !== 3 || idParts[0] !== "id") throw new Error("SALESFORCE_IDENTITY_URL_INVALID");

  const response = await fetch(identityUrl, {
    headers: { authorization: `Bearer ${token.access_token}`, accept: "application/json" },
    signal: AbortSignal.timeout(15_000)
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error("SALESFORCE_IDENTITY_LOOKUP_FAILED");

  const identity = identitySchema.parse(payload);
  if (identity.user_id !== idParts[2] || identity.organization_id !== idParts[1]) {
    throw new Error("SALESFORCE_IDENTITY_MISMATCH");
  }
  if (identity.asserted_user === false) throw new Error("SALESFORCE_IDENTITY_NOT_ASSERTED");
  return identity;
}

export async function revokeSalesforceToken(token: string): Promise<void> {
  const body = new URLSearchParams({ token });
  const response = await fetch(new URL("/services/oauth2/revoke", config.SF_LOGIN_URL), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(10_000)
  });
  if (!response.ok && response.status !== 400) throw new Error("SALESFORCE_TOKEN_REVOCATION_FAILED");
}
