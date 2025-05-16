import { dbClient } from "@config/db";

beforeEach(async () => {
  await dbClient.query("BEGIN");
});

afterEach(async () => {
  await dbClient.query("ROLLBACK");
});

afterAll(async () => {
  await dbClient.end();
});
