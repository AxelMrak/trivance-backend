import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors";

import { errorHandler } from "@middlewares/errorHandler";
import { requestLogger } from "@middlewares/requestLogger";
import mainRouter from "@routes/index";

const app = express();

// CORS configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"];

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "Cache-Control",
  ],
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(
  express.json({
    limit: process.env.JSON_LIMIT || "10mb",
    verify: (req, res, buf) => {
      // Store raw body for webhook verification if needed
      (req as any).rawBody = buf;
    },
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: process.env.URL_ENCODED_LIMIT || "10mb",
  }),
);

// Cookie parsing
app.use(cookieParser(process.env.COOKIE_SECRET));

// Request logging only in development
if (process.env.NODE_ENV === "development") {
  app.use(requestLogger);
}

// Health check endpoint
app.get("/health", (_req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: "Server is running",
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "unknown",
  };

  res.status(200).json(healthCheck);
});

// API routes
app.use("/api", mainRouter);

// 404 handler for undefined routes
app.use("*", (_req, res) => {
  res.status(404).json({
    error: "Route not found",
    message: "The requested endpoint does not exist",
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown handling
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  process.exit(0);
});

export default app;
