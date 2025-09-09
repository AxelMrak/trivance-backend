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

const buildDbUrl = () => {
  const envUrl = process.env.DATABASE_URL;
  if (isTest) {
    if (envUrl) {
      try {
        const u = new URL(envUrl);
        if (u.hostname === "trivance-db") {
          u.hostname = "localhost";
        }
        return u.toString();
      } catch {
        return "postgres://postgres:postgres@localhost:5432/trivance_db";
      }
    }
    return "postgres://postgres:postgres@localhost:5432/trivance_db";
  }
  return envUrl || "postgres://postgres:postgres@trivance-db:5432/trivance_db";
};

export const config: {
  PORT: number | string;
  NODE_ENV: string;
  DB_URL: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
} = {
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || "development",
  DB_URL: buildDbUrl(),
  DB_USER: process.env.DB_USER || "postgres",
  DB_PASSWORD: process.env.DB_PASSWORD || "postgres",
  DB_NAME: process.env.DB_NAME || "trivance_db",
};

if (process.env.NODE_ENV === "production") {
  const requiredVars = ["DB_URL"];
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
