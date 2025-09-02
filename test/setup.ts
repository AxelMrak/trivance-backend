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
  await dbClient.query("BEGIN");
});

/**
 * After each test, we roll back the transaction.
 * This ensures that each test is isolated from the others.
 */
afterEach(async () => {
  await dbClient.query("ROLLBACK");
});

/**
 * After all tests are done, we close the database connection.
 */
afterAll(async () => {
  await dbClient.end();
});
