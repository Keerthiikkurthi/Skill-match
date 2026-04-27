/**
 * Vercel Serverless Function entry point.
 * Wraps the Express app for deployment on Vercel.
 */

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import connectDB from "../backend/src/db/database";
import authRoutes from "../backend/src/routes/auth";
import analysesRoutes from "../backend/src/routes/analyses";
import profileRoutes from "../backend/src/routes/profile";
import aiFeaturesRoutes from "../backend/src/routes/ai-features";

const app = express();

// CORS — allow Vercel frontend
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  "http://localhost:8080",
  "http://localhost:8081",
  "http://localhost:5173",
].filter(Boolean) as string[];

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Connect DB once (cached across warm invocations)
let dbConnected = false;
app.use(async (_req, _res, next) => {
  if (!dbConnected) {
    await connectDB();
    dbConnected = true;
  }
  next();
});

// Routes
app.get("/api/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));
app.use("/api/auth", authRoutes);
app.use("/api/analyses", analysesRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/ai", aiFeaturesRoutes);

app.use((_req, res) => res.status(404).json({ error: "Not found" }));
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
