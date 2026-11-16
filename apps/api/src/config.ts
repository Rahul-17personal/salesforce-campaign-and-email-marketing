import { z } from "zod";

const EXAMPLE_SESSION_SECRET = "replace-with-a-random-value-at-least-32-characters";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  SESSION_SECRET: z.string().min(32),
  SESSION_COOKIE_NAME: z.string().min(1).default("campaignhub_session"),
  DATABASE_URL: z.string().url().default("postgresql://campaignhub:campaignhub_dev_password@localhost:5432/campaignhub")
}).superRefine((value, ctx) => {
  if (value.SESSION_SECRET === EXAMPLE_SESSION_SECRET) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["SESSION_SECRET"], message: "Generate a unique SESSION_SECRET before starting the application." });
  }
  if (value.NODE_ENV === "production") {
    if (new URL(value.WEB_ORIGIN).protocol !== "https:") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["WEB_ORIGIN"], message: "Production WEB_ORIGIN must use HTTPS." });
    }
    if (!value.DATABASE_URL.startsWith("postgresql://") && !value.DATABASE_URL.startsWith("postgres://")) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["DATABASE_URL"], message: "A PostgreSQL connection URL is required." });
    }
  }
});

export const config = schema.parse(process.env);
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
