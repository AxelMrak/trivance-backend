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

const isTest = process.env.NODE_ENV === "test";
const TEST_JWT_SECRET = "test-secret";

if (isTest) {
  process.env.JWT_SECRET ??= TEST_JWT_SECRET;
}

export const buildTestDbUrl = (envUrl = process.env.DATABASE_URL): string => {
  try {
    const url = new URL(envUrl || "postgres://postgres:postgres@localhost:5432/trivance_db_test");
    if (url.hostname === "trivance-db") {
      url.hostname = "localhost";
    }
    url.pathname = "/trivance_db_test";
    return url.toString();
  } catch {
    return "postgres://postgres:postgres@localhost:5432/trivance_db_test";
  }
};

export const TEST_DATABASE_URL = buildTestDbUrl();

const buildDbUrl = (): string => {
  if (isTest) {
    return TEST_DATABASE_URL;
  }
  return process.env.DATABASE_URL || "postgres://postgres:postgres@trivance-db:5432/trivance_db";
};

export const config: {
  PORT: number | string;
  NODE_ENV: string;
  DB_URL: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  JWT_SECRET: string;
} = {
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || "development",
  DB_URL: buildDbUrl(),
  DB_USER: process.env.DB_USER || "postgres",
  DB_PASSWORD: process.env.DB_PASSWORD || "postgres",
  DB_NAME: isTest ? "trivance_db_test" : process.env.DB_NAME || "trivance_db",
  JWT_SECRET: process.env.JWT_SECRET as string,
};

if (process.env.NODE_ENV === "production") {
  const requiredVars = ["DB_URL", "JWT_SECRET"];
  const optionalVars = ["DB_USER", "DB_PASSWORD", "DB_NAME"];
  requiredVars.forEach((varName) => {
    if (!process.env[varName]) {
      throw new Error(`Missing environment variable: ${varName} in production`);
    }
  });
  optionalVars.forEach((varName) => {
    if (!process.env[varName]) {
      console.warn(`Warning: Missing optional environment variable: ${varName}`);
    }
  });
}
