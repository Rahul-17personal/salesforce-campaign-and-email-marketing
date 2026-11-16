import { Pool } from "pg";
import { config } from "../config.js";

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ...(config.NODE_ENV === "production" ? { ssl: { rejectUnauthorized: true } } : {})
});

pool.on("error", () => {
  // Do not log connection strings or credentials.
  console.error("Unexpected PostgreSQL pool error.");
});
