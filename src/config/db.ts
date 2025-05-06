import { Pool } from "pg";
import { config } from "./constants";

export const dbClient = new Pool({
  DATABASE_URL: config.DATABASE_URL,
});
