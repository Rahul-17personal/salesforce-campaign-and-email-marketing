import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: config.WEB_ORIGIN, credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE"],
  allowedHeaders: ["Content-Type","X-CSRF-Token"]
}));
app.use(express.json({limit:"100kb",type:"application/json"}));
app.use(rateLimit({windowMs:60_000,limit:120,standardHeaders:"draft-7",legacyHeaders:false}));

app.get("/health", (_req,res) => res.status(200).json({
  status:"ok", service:"salesforce-campaign-email-marketing-api", environment:config.NODE_ENV
}));

// No OAuth, CRM mutation or email-send endpoint is exposed in this foundation.
app.use((_req,res) => res.status(404).json({error:"NOT_FOUND",message:"Route not found"}));
app.use((err:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction) => {
  // Never log request bodies, recipient addresses, OAuth tokens, cookies or raw provider payloads.
  console.error("Unhandled API error",err instanceof Error ? err.name : "UnknownError");
  res.status(500).json({error:"INTERNAL_ERROR",message:"An unexpected error occurred"});
});
app.listen(config.API_PORT,() => console.log(`API listening on port ${config.API_PORT}`));
