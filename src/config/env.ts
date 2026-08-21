import { z } from "zod";
import dotenv from "dotenv";

if (process.env.NODE_ENV === "test") {
  dotenv.config({ path: ".env.test" });
  if (!process.env.DATABASE_URL) {
    dotenv.config({ path: "../.env" });
  }
} else if (process.env.NODE_ENV === "production") {
  dotenv.config();
} else {
  dotenv.config({ path: ".env.development" });
  // Fallback to project root .env when .env.development is absent
  if (!process.env.SITE_URL || !process.env.DATABASE_URL) {
    dotenv.config({ path: "../.env" });
  }
}

const postgresUrl = z.string().refine(
  (val) => {
    try {
      const u = new URL(val);
      return u.protocol === "postgres:" || u.protocol === "postgresql:";
    } catch {
      return false;
    }
  },
  { message: "Must be a valid postgres:// or postgresql:// URL" },
);

const DEFAULT_DB_URL_TEST = "postgres://postgres:postgres@localhost:5432/trivance_db_test";
const DEFAULT_DB_URL_NON_TEST = "postgres://postgres:postgres@trivance-db:5432/trivance_db";
const DEFAULT_DB_URL =
  process.env.NODE_ENV === "test" ? DEFAULT_DB_URL_TEST : DEFAULT_DB_URL_NON_TEST;

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: postgresUrl.default(DEFAULT_DB_URL),
  DB_USER: z.string().default("postgres"),
  DB_PASSWORD: z.string().default("postgres"),
  DB_NAME: z.string().default("trivance_db"),

  JWT_SECRET: z.string(),
  COOKIE_SECRET: z.string().optional(),
  MP_ACCESS_TOKEN: z.string().default(""),
  MP_WEBHOOK_SECRET: z.string().default(""),

  SITE_URL: z.string().url().default("http://localhost"),
  PORT: z.coerce.number().int().positive().default(3001),
  COMPANY_ID: z.string().optional(),

  JSON_LIMIT: z.string().default("10mb"),
  URL_ENCODED_LIMIT: z.string().default("10mb"),

  CORS_ORIGIN: z.string().optional(),
  CROSS_ORIGIN: z.string().optional(),

  npm_package_version: z.string().default("unknown"),
});

export const EnvSchemaWithProdRules = EnvSchema.superRefine((env, ctx) => {
  if (env.NODE_ENV !== "production") return;

  if (env.DATABASE_URL === DEFAULT_DB_URL_NON_TEST) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["DATABASE_URL"],
      message: "DATABASE_URL must be explicitly set in production (not the fallback default)",
    });
  }
  if (env.JWT_SECRET.length < 32) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["JWT_SECRET"],
      message: "JWT_SECRET must be at least 32 characters in production",
    });
  }
  if (!env.COOKIE_SECRET || env.COOKIE_SECRET.length < 32) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["COOKIE_SECRET"],
      message: "COOKIE_SECRET is required (min 32 chars) in production",
    });
  }
  if (env.MP_ACCESS_TOKEN.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["MP_ACCESS_TOKEN"],
      message: "MP_ACCESS_TOKEN is required in production",
    });
  }
  if (env.MP_WEBHOOK_SECRET.length < 16) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["MP_WEBHOOK_SECRET"],
      message: "MP_WEBHOOK_SECRET is required (min 16 chars) in production",
    });
  }
  if (env.SITE_URL === "http://localhost") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["SITE_URL"],
      message: "SITE_URL must be set to a real URL in production",
    });
  }
  if (!env.COMPANY_ID) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["COMPANY_ID"],
      message: "COMPANY_ID is required in production",
    });
  }
  if (!env.CORS_ORIGIN && !env.CROSS_ORIGIN) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["CORS_ORIGIN"],
      message: "CORS_ORIGIN (or legacy CROSS_ORIGIN) is required in production",
    });
  }
});

const parsed = EnvSchemaWithProdRules.parse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME,
  JWT_SECRET: process.env.JWT_SECRET,
  COOKIE_SECRET: process.env.COOKIE_SECRET,
  MP_ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN,
  MP_WEBHOOK_SECRET: process.env.MP_WEBHOOK_SECRET,
  SITE_URL: process.env.SITE_URL,
  PORT: process.env.PORT,
  COMPANY_ID: process.env.COMPANY_ID,
  JSON_LIMIT: process.env.JSON_LIMIT,
  URL_ENCODED_LIMIT: process.env.URL_ENCODED_LIMIT,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  CROSS_ORIGIN: process.env.CROSS_ORIGIN,
  npm_package_version: process.env.npm_package_version,
});

const normalizeDatabaseUrl = (url: string, nodeEnv: string): string => {
  if (nodeEnv !== "test") return url;
  try {
    const u = new URL(url);
    if (u.hostname === "trivance-db") {
      u.hostname = "localhost";
      return u.toString();
    }
  } catch {
    // keep original if URL is somehow invalid
  }
  return url;
};

const dbNameFromUrl = (url: string): string => {
  try {
    return new URL(url).pathname.replace(/^\//, "");
  } catch {
    return "trivance_db";
  }
};

const normalizedDbUrl = normalizeDatabaseUrl(parsed.DATABASE_URL, parsed.NODE_ENV);
const normalizedDbName =
  parsed.NODE_ENV === "test" ? dbNameFromUrl(normalizedDbUrl) : parsed.DB_NAME;

const siteUrlNormalized = parsed.SITE_URL.replace(/\/$/, "");

const finalConfig = {
  ...parsed,
  DATABASE_URL: normalizedDbUrl,
  DB_NAME: normalizedDbName,
  SITE_URL: siteUrlNormalized,
};

if (
  finalConfig.NODE_ENV === "development" &&
  (!finalConfig.COOKIE_SECRET || finalConfig.COOKIE_SECRET.length < 32)
) {
  console.warn(
    "[config] COOKIE_SECRET is missing or too short — cookies are not signed (auth token cookie is currently unsigned; set signed:true + read req.signedCookies to enforce signing).",
  );
}

export type Config = z.infer<typeof EnvSchema>;

export const config: Readonly<Config> = Object.freeze(finalConfig);

export const isProduction = config.NODE_ENV === "production";
export const isDevelopment = config.NODE_ENV === "development";
export const isTest = config.NODE_ENV === "test";

const DEV_CORS_DEFAULTS = [
  "http://localhost",
  "https://localhost",
  "http://localhost:3000",
  "http://localhost:5173",
];

const parseOrigins = (value?: string): string[] =>
  (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const explicitCorsOrigins = parseOrigins(config.CORS_ORIGIN || config.CROSS_ORIGIN);

export const corsAllowedOrigins: string[] = (() => {
  if (explicitCorsOrigins.length > 0) {
    return explicitCorsOrigins;
  }

  if (isProduction) {
    return parseOrigins(config.SITE_URL);
  }

  return DEV_CORS_DEFAULTS;
})();

export const MP_WEBHOOK_TOLERANCE_S = 300;
export const DEFAULT_PAYMENT_CURRENCY = "ARS";

export const MP_WEBHOOK_SECRET = config.MP_WEBHOOK_SECRET;

export const TEST_DATABASE_URL = config.DATABASE_URL;
