import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import session from "express-session";
import { createClient } from "redis";
import { RedisStore } from "connect-redis";
import { config, SESSION_TTL_MS, SESSION_TTL_SECONDS } from "./config.js";
import authRoutes from "./auth/authRoutes.js";

async function startServer(): Promise<void> {
  const redisClient = config.REDIS_URL ? createClient({ url: config.REDIS_URL }) : null;

  if (redisClient) {
    redisClient.on("error", () => console.error("Redis session store connection error."));
    await redisClient.connect();
  } else if (config.NODE_ENV === "production") {
    throw new Error("A Redis session store is required in production.");
  }

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
    name: config.SESSION_COOKIE_NAME,
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    ...(redisClient ? { store: new RedisStore({
      client: redisClient,
      prefix: "campaignhub:sessions:",
      ttl: SESSION_TTL_SECONDS
    }) } : {}),
    cookie: {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_TTL_MS,
      path: "/"
    },
    proxy: config.NODE_ENV === "production"
  }));

  app.get("/health", (_req, res) => res.status(200).json({
    status: "ok",
    service: "salesforce-campaign-email-marketing-api",
    environment: config.NODE_ENV
  }));
  app.use("/auth", authRoutes);

  app.use((_req, res) => res.status(404).json({ error: "NOT_FOUND", message: "Route not found" }));
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // Never log request bodies, OAuth tokens, cookies or provider payloads.
    console.error("Unhandled API error", err instanceof Error ? err.name : "UnknownError");
    res.status(500).json({ error: "INTERNAL_ERROR", message: "An unexpected error occurred" });
  });

  app.listen(config.API_PORT, () => console.log(`API listening on port ${config.API_PORT}`));
}

startServer().catch((error: unknown) => {
  console.error("API startup failed", error instanceof Error ? error.message : "UnknownError");
  process.exitCode = 1;
});
