import supertest from "supertest";
import app from "@/app";
import { dbClient } from "@config/db";

/**
 * A test helper to create a supertest agent.
 * This is useful for making requests to the application in tests.
 */
export const getTestAgent = () => {
  return supertest(app);
};

/**
 * Before each test, we start a transaction.
 */
beforeEach(async () => {
  try {
    await dbClient.query("BEGIN");
  } catch (err) {
    // If database is not reachable in the current environment, skip transaction handling.
    // This keeps unit/in-memory tests runnable without a DB.
    // eslint-disable-next-line no-console
    console.warn("DB not available for tests: skipping BEGIN");
  }
});

/**
 * After each test, we roll back the transaction.
 * This ensures that each test is isolated from the others.
 */
afterEach(async () => {
  try {
    await dbClient.query("ROLLBACK");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("DB not available for tests: skipping ROLLBACK");
  }
});

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
