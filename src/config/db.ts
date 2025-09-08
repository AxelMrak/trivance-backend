import { Pool } from "pg";

import { config } from "@config/constants";

export const dbClient = new Pool({
  connectionString: config.DB_URL,
  max: process.env.NODE_ENV === "test" ? 1 : undefined,
});
