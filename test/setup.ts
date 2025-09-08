import supertest from "supertest";

import app from "@/app";
import { dbClient } from "@config/db";

if (process.env.NODE_ENV === "test") {
  console.log = (() => {}) as typeof console.log;
  console.info = (() => {}) as typeof console.info;
  console.warn = (() => {}) as typeof console.warn;
  console.error = (() => {}) as typeof console.error;
}

/**
 * A test helper to create a supertest agent.
 * This is useful for making requests to the application in tests.
 */
export const getTestAgent = () => {
  return supertest(app);
};

// Note: We avoid wrapping tests in transactions because Jest runs tests in parallel
// across workers, which can interleave transactions on a single connection.
// The factories generate unique data to prevent conflicts.

/**
 * After all tests are done, we close the database connection.
 */
afterAll(async () => {
  try {
    await dbClient.end();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("DB not available for tests: skipping pool end");
  }
});
