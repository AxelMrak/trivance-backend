import { Pool } from "pg";
import crypto from "crypto";

import { TEST_DATABASE_URL } from "@/config/constants";
import { PaymentEventRepository } from "@/repositories/PaymentEventRepository";

describe("payment_events concurrent idempotency (two real connections)", () => {
  let poolA: Pool;
  let poolB: Pool;
  let repo: PaymentEventRepository;
  let paymentId: string;

  beforeAll(() => {
    poolA = new Pool({ connectionString: TEST_DATABASE_URL, max: 1 });
    poolB = new Pool({ connectionString: TEST_DATABASE_URL, max: 1 });
    repo = new PaymentEventRepository(poolA);
  });

  afterAll(async () => {
    await poolA.end();
    await poolB.end();
  });

  beforeEach(() => {
    paymentId = `pay-${crypto.randomUUID()}`;
  });

  afterEach(async () => {
    await poolA.query("DELETE FROM payment_events WHERE payment_id = $1", [paymentId]);
  });

  it("commits exactly one event insert when two connections race", async () => {
    const attempt = async (pool: Pool): Promise<"processed" | "already"> => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const existing = await repo.findByPaymentId(paymentId, client);
        if (existing) {
          await client.query("COMMIT");
          return "already";
        }
        try {
          await repo.insert({ payment_id: paymentId, event: "process" }, client);
        } catch (error) {
          await client.query("ROLLBACK").catch(() => {});
          if ((error as { code?: string }).code === "23505") {
            return "already";
          }
          throw error;
        }
        await client.query("COMMIT");
        return "processed";
      } finally {
        client.release();
      }
    };

    const [outcomeA, outcomeB] = await Promise.all([attempt(poolA), attempt(poolB)]);

    const { rows } = await poolA.query("SELECT * FROM payment_events WHERE payment_id = $1", [
      paymentId,
    ]);

    expect(rows.length).toBe(1);
    expect([outcomeA, outcomeB].sort()).toEqual(["already", "processed"]);
  });
});
