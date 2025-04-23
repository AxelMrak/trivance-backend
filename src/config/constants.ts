import dotenv from "dotenv";

dotenv.config();

export const config = {
  PORT: process.env.PORT || 3004,
  NODE_ENV: process.env.NODE_ENV || "development",
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_KEY: process.env.SUPABASE_KEY || "",
};

if (process.env.NODE_ENV === "production") {
  const requiredVars = ["SUPABASE_URL", "SUPABASE_KEY"];
  requiredVars.forEach((varName) => {
    if (!process.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  });
}
