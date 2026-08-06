import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import "@config/constants";
import { errorHandler } from "@middlewares/errorHandler";
import { requestLogger } from "@middlewares/requestLogger";
import { globalLimiter, signInLimiter, signUpLimiter } from "@middlewares/security/rateLimiters";
import mainRouter from "@routes/index";

const app = express();

// One reverse proxy hop (nginx) sits between the client and the app.
// Must precede ANY middleware that reads req.ip (helmet has no IP use, but the
// rate limiters key on req.ip: without this they would bucket every user
// under the nginx container IP). Assumes exactly one proxy level.
app.set("trust proxy", 1);

// CORS configuration
const parseOrigins = (value?: string): string[] => {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

const isOriginAllowed = (origin: string, allowed: string[]): boolean => {
  if (allowed.includes("*")) return true; // allow all explicitly
  const normalizedOrigin = origin.replace(/\/$/, "");
  for (const entry of allowed) {
    const allowedEntry = entry.replace(/\/$/, "");
    if (allowedEntry === normalizedOrigin) return true;

    // Match by hostname ignoring port (useful for localhost:3000/5173, etc.)
    try {
      const o = new URL(normalizedOrigin);
      const a = new URL(allowedEntry);
      if (o.hostname === a.hostname) return true;
    } catch {
      // If parsing fails, fall back to startsWith/contains checks
      if (normalizedOrigin.startsWith(allowedEntry)) return true;
    }

    // Support basic wildcard subdomains like *.example.com
    if (allowedEntry.startsWith("*.") && normalizedOrigin.includes(".")) {
      const domain = allowedEntry.slice(2);
      try {
        const o = new URL(normalizedOrigin);
        if (o.hostname === domain || o.hostname.endsWith(`.${domain}`)) return true;
      } catch {
        // ignore
      }
    }
  }
  return false;
};

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Accept no-origin requests (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    // Support both CORS_ORIGIN (preferred) and legacy CROSS_ORIGIN
    // Also consider SITE_URL as a single allowed origin if provided
    const envOrigins = parseOrigins(
      process.env.CORS_ORIGIN || process.env.CROSS_ORIGIN || process.env.SITE_URL,
    );
    const defaults = [
      "http://localhost",
      "https://localhost",
      "http://localhost:3000",
      "http://localhost:5173",
    ];
    const allowed = envOrigins.length ? envOrigins : defaults;

    if (isOriginAllowed(origin, allowed)) {
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

app.use(
  helmet({
    // Spec requires the stricter-by-design policy; helmet's default is no-referrer.
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }),
);
app.use(cors(corsOptions));
// Handle CORS preflight for all routes
app.options("*", cors(corsOptions));

// Body parsing middleware
app.use(
  express.json({
    limit: process.env.JSON_LIMIT || "10mb",
    // Accept JSON even if Content-Type is missing or text/plain
    // (useful when clients don't set headers explicitly)
    type: (req) => {
      const ct = (req.headers["content-type"] || "").toString().toLowerCase();
      if (!ct) return true; // no header: try to parse as JSON
      if (ct.includes("application/json")) return true;
      if (ct.includes("+json")) return true; // e.g., application/ld+json
      if (ct.startsWith("text/plain")) return true; // allow plain text JSON
      return false;
    },
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

// Global request cap: 300 requests / minute / IP. Sits after body parsers so
// malformed payloads (400) reject before consuming a global token, and before
// the routes so every endpoint is covered.
app.use(globalLimiter);

// Stricter auth limits on top of the global cap (5 failed / 15 min per IP,
// and 10 sign-ups / hour per IP). Mounted before the main router.
app.use("/auth/sign-in", signInLimiter);
app.use("/auth/sign-up", signUpLimiter);

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
app.use("/", mainRouter);

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
