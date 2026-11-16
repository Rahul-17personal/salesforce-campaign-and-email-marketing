import "./loadEnv.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { config, SESSION_TTL_MS } from "./config.js";
import { pool } from "./db/pool.js";
import authRoutes from "./auth/localAuthRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";

async function startServer(): Promise<void> {
  await pool.query("SELECT 1");

  const PgSessionStore = connectPgSimple(session);
  const sessionStore = new PgSessionStore({
    pool,
    tableName: "app_sessions",
    createTableIfMissing: true,
    pruneSessionInterval: 15
  });

  const app = express();
  app.disable("x-powered-by");
  if (config.NODE_ENV === "production") app.set("trust proxy", 1);

  app.use(helmet());
  app.use(compression());
  app.use(cors({
    origin: config.WEB_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "X-CSRF-Token"]
  }));
  app.use(express.json({ limit: "100kb", type: "application/json" }));
  app.use(rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: "draft-7",
    legacyHeaders: false
  }));

  app.use(session({
    store: sessionStore,
    name: config.SESSION_COOKIE_NAME,
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_TTL_MS,
      path: "/"
    },
    proxy: config.NODE_ENV === "production"
  }));

  app.get("/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.status(200).json({
        status: "ok",
        service: "campaignhub-api",
        environment: config.NODE_ENV,
        database: "connected",
        mode: "standalone"
      });
    } catch {
      res.status(503).json({ status: "error", database: "unavailable" });
    }
  });

  app.use("/auth", authRoutes);
  app.use("/dashboard", dashboardRoutes);

  app.use((_req, res) => {
    res.status(404).json({ error: "NOT_FOUND", message: "Route not found" });
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // Never log passwords, session cookies, contact records or request bodies.
    console.error("Unhandled API error", err instanceof Error ? err.name : "UnknownError");
    res.status(500).json({ error: "INTERNAL_ERROR", message: "An unexpected error occurred." });
  });

  const httpServer = app.listen(config.API_PORT, () => {
    console.log(`CampaignHub API listening on port ${config.API_PORT} (standalone mode)`);
  });

  const shutdown = (signal: string) => {
    console.log(`Received ${signal}; shutting down gracefully.`);
    httpServer.close(() => {
      sessionStore.close();
      void pool.end().finally(() => process.exit(0));
    });
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

startServer().catch((error: unknown) => {
  console.error("API startup failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
