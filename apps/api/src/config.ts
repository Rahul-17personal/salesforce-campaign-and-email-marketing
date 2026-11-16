import { z } from "zod";
const schema = z.object({
  NODE_ENV:z.enum(["development","test","production"]).default("development"),
  API_PORT:z.coerce.number().int().min(1).max(65535).default(4000),
  WEB_ORIGIN:z.string().url().default("http://localhost:5173"),
  SESSION_SECRET:z.string().min(32).default("local-only-change-this-session-secret-32"),
  SESSION_COOKIE_NAME:z.string().min(1).default("sf_marketing_session")
});
export const config = schema.parse(process.env);
