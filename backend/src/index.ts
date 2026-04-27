import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import connectDB from "./db/database";
import authRoutes from "./routes/auth";
import analysesRoutes from "./routes/analyses";
import profileRoutes from "./routes/profile";
import aiFeaturesRoutes from "./routes/ai-features";

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: [
      process.env.CORS_ORIGIN || "http://localhost:8080",
      "http://localhost:8081",
      "http://localhost:5173",
    ],
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many auth attempts, please try again later." },
});

// Body parsing
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes — support both /api/* (production) and /* (legacy local)
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/analyses", analysesRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/ai", aiFeaturesRoutes);
// Legacy local routes (keep for backward compat)
app.use("/auth", authLimiter, authRoutes);
app.use("/analyses", analysesRoutes);
app.use("/profile", profileRoutes);
app.use("/ai", aiFeaturesRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Connect to MongoDB then start server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Resume Analyzer API running on http://localhost:${PORT}`);
      console.log(`   ML Service: ${process.env.ML_SERVICE_URL || "http://localhost:8000"}`);
      console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });

export default app;
