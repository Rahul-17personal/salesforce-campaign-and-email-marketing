import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  SESSION_SECRET: z.string().min(32).default("local-only-change-this-session-secret-32"),
  SESSION_COOKIE_NAME: z.string().min(1).default("sf_marketing_session"),
  SF_LOGIN_URL: z.string().url().default("https://login.salesforce.com"),
  SF_CLIENT_ID: z.string().trim().optional(),
  SF_CLIENT_SECRET: z.string().trim().optional(),
  SF_REDIRECT_URI: z.string().url().default("http://localhost:5173/api/auth/salesforce/callback"),
  SF_SCOPES: z.string().default("api id refresh_token"),
  REDIS_URL: z.string().url().optional(),
  TOKEN_ENCRYPTION_KEY_HEX: z.string().optional()
}).superRefine((value, ctx) => {
  const web = new URL(value.WEB_ORIGIN);
  const redirect = new URL(value.SF_REDIRECT_URI);
  const login = new URL(value.SF_LOGIN_URL);
  const allowedSalesforceHost =
    login.hostname === "login.salesforce.com" ||
    login.hostname === "test.salesforce.com" ||
    login.hostname.endsWith(".my.salesforce.com") ||
    login.hostname.endsWith(".salesforce.com") ||
    login.hostname.endsWith(".force.com");

  if (!allowedSalesforceHost || login.protocol !== "https:") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["SF_LOGIN_URL"], message: "SF_LOGIN_URL must be an HTTPS Salesforce login or My Domain URL." });
  }
  if (redirect.origin !== web.origin || redirect.pathname !== "/api/auth/salesforce/callback") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["SF_REDIRECT_URI"], message: "SF_REDIRECT_URI must use WEB_ORIGIN and end with /api/auth/salesforce/callback." });
  }
  if (value.NODE_ENV === "production") {
    if (web.protocol !== "https:" || redirect.protocol !== "https:") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["WEB_ORIGIN"], message: "Production web origin and OAuth callback must use HTTPS." });
    }
    if (!value.REDIS_URL) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["REDIS_URL"], message: "REDIS_URL is required in production for server-side sessions." });
    }
    if (!value.TOKEN_ENCRYPTION_KEY_HEX || !/^[a-fA-F0-9]{64}$/.test(value.TOKEN_ENCRYPTION_KEY_HEX)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["TOKEN_ENCRYPTION_KEY_HEX"], message: "Production requires a 64-character (32-byte) hex token encryption key." });
    }
  }
});

export const config = schema.parse(process.env);
export const SESSION_TTL_SECONDS = 8 * 60 * 60;
export const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000;

export function isSalesforceConfigured(): boolean {
  return Boolean(config.SF_CLIENT_ID && config.SF_CLIENT_SECRET);
}
