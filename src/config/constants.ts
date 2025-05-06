import dotenv from "dotenv";

dotenv.config();

export const config: {
  PORT: number | string;
  NODE_ENV: string;
  DB_URL: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
} = {
  PORT: process.env.PORT || 3004,
  NODE_ENV: process.env.NODE_ENV || "development",
  DB_URL: process.env.DATABASE_URL || "postgres://postgres:postgres@trivance-db:5432/trivance_db",
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
