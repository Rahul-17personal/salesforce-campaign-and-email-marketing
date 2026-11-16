import "dotenv/config";
import { readFile } from "node:fs/promises";
import { pool } from "./pool.js";

async function migrate(): Promise<void> {
  const sql = await readFile(new URL("../../sql/001_initial.sql", import.meta.url), "utf8");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    process.stdout.write("Database schema is up to date.\n");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error: unknown) => {
  console.error("Database migration failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
