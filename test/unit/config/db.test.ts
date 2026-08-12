import { dbClient, transaction } from "@/config/db";

describe("transaction", () => {
  const makeClient = () => ({
    query: jest.fn(async (sql: string) => ({ rows: [], rowCount: 0 })),
    release: jest.fn(),
  });

  let connectSpy: jest.SpyInstance;

  beforeEach(() => {
    connectSpy = jest.spyOn(dbClient, "connect");
  });

  afterEach(() => {
    connectSpy.mockRestore();
  });

  test("commits work, returns its result, and releases the client", async () => {
    const client = makeClient();
    connectSpy.mockResolvedValue(client as any);

    const result = await transaction(async (db) => {
      await db.query("SELECT work_marker");
      return { ok: true };
    });

    expect(result).toEqual({ ok: true });
    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(client.query).toHaveBeenNthCalledWith(2, "SELECT work_marker");
    expect(client.query).toHaveBeenNthCalledWith(3, "COMMIT");
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  test("rolls back, rethrows the work error, and still releases the client", async () => {
    const client = makeClient();
    connectSpy.mockResolvedValue(client as any);
    const workError = new Error("work failed");

    await expect(
      transaction(async (db) => {
        await db.query("INSERT INTO orders (id) VALUES ($1)", ["order-1"]);
        throw workError;
      }),
    ).rejects.toBe(workError);

    expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(client.query).toHaveBeenNthCalledWith(2, "INSERT INTO orders (id) VALUES ($1)", [
      "order-1",
    ]);
    expect(client.query).toHaveBeenNthCalledWith(3, "ROLLBACK");
    expect(client.query.mock.calls.some((call) => call[0] === "COMMIT")).toBe(false);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  test("attempts rollback and releases the client when COMMIT itself fails", async () => {
    const commitError = new Error("commit failed");
    const client = {
      query: jest.fn(async (sql: string) => {
        if (sql === "COMMIT") throw commitError;
        return { rows: [] };
      }),
      release: jest.fn(),
    };
    connectSpy.mockResolvedValue(client as any);

    await expect(
      transaction(async (db) => {
        await db.query("UPDATE orders SET status = $1", ["paid"]);
        return 7;
      }),
    ).rejects.toBe(commitError);

    expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(client.query).toHaveBeenNthCalledWith(2, "UPDATE orders SET status = $1", ["paid"]);
    expect(client.query).toHaveBeenNthCalledWith(3, "COMMIT");
    expect(client.query).toHaveBeenNthCalledWith(4, "ROLLBACK");
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  test("does not run work when the connection cannot be acquired", async () => {
    connectSpy.mockRejectedValue(new Error("pool exhausted"));

    const work = jest.fn(async () => "never");
    await expect(transaction(work)).rejects.toThrow("pool exhausted");
    expect(work).not.toHaveBeenCalled();
  });

  test("destroys the client when ROLLBACK itself fails", async () => {
    const rollbackError = new Error("rollback failed");
    const client = {
      query: jest.fn(async (sql: string) => {
        if (sql === "ROLLBACK") throw rollbackError;
        return { rows: [] };
      }),
      release: jest.fn(),
    };
    connectSpy.mockResolvedValue(client as any);

    const workError = new Error("work failed");
    await expect(
      transaction(async (db) => {
        await db.query("INSERT INTO orders (id) VALUES ($1)", ["order-1"]);
        throw workError;
      }),
    ).rejects.toBe(workError);

    expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(client.query).toHaveBeenNthCalledWith(2, "INSERT INTO orders (id) VALUES ($1)", [
      "order-1",
    ]);
    expect(client.query).toHaveBeenNthCalledWith(3, "ROLLBACK");
    // release(error) tells pg to DESTROY the connection instead of returning it
    // to the pool with an open transaction.
    expect(client.release).toHaveBeenCalledWith(rollbackError);
  });
});