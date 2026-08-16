import {
  PaymentWebhookWorker,
  computeBackoff,
  MAX_BACKOFF_MS,
} from "@/workers/paymentWebhookWorker";

const claimClient = { query: jest.fn() } as any;

interface FakeRepo {
  claimDue: jest.Mock;
  markProcessed: jest.Mock;
  markRetry: jest.Mock;
  markDeadLetter: jest.Mock;
}

function makeEvent(overrides: Record<string, unknown> = {}): Record<string, any> {
  return {
    id: "evt-1",
    provider: "mercadopago",
    payment_id: "pay-1",
    payload: { type: "payment", data: { id: "pay-1" } },
    status: "pending",
    attempts: 0,
    max_attempts: 5,
    available_at: new Date().toISOString(),
    last_error: null,
    processed_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeHarness(options: Record<string, unknown> = {}) {
  let claimed: Array<Record<string, any>> = [];
  const repo: FakeRepo = {
    claimDue: jest.fn(
      async (work: (events: any[], client: any) => Promise<void>, _limit: number) => {
        await work(claimed, claimClient);
        return claimed;
      },
    ),
    markProcessed: jest.fn(async () => undefined),
    markRetry: jest.fn(async () => undefined),
    markDeadLetter: jest.fn(async () => undefined),
  };
  const service = {
    processWebhook: jest.fn().mockResolvedValue({ status: "processed" }),
  } as { processWebhook: jest.Mock };
  const onDeadLetter = jest.fn();
  const worker = new PaymentWebhookWorker(repo as any, service as any, {
    maxAttempts: 3,
    backoffBaseMs: 1000,
    onDeadLetter,
    ...options,
  });
  return {
    repo,
    service,
    onDeadLetter,
    worker,
    setClaimed: (events: Array<Record<string, any>>) => {
      claimed = events;
    },
  };
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("computeBackoff", () => {
  test("doubles the base on every attempt", () => {
    expect(computeBackoff(1, 5000)).toBe(5000);
    expect(computeBackoff(2, 5000)).toBe(10000);
    expect(computeBackoff(3, 5000)).toBe(20000);
    expect(computeBackoff(4, 5000)).toBe(40000);
  });

  test("caps the backoff at 5 minutes", () => {
    expect(computeBackoff(10, 5000)).toBe(MAX_BACKOFF_MS);
    expect(MAX_BACKOFF_MS).toBe(5 * 60 * 1000);
  });
});

describe("PaymentWebhookWorker.tick", () => {
  test("builds the webhook body from the stored payload and marks processed", async () => {
    const { repo, service, worker, setClaimed } = makeHarness();
    setClaimed([makeEvent()]);
    await worker.tick();

    expect(service.processWebhook).toHaveBeenCalledWith(
      { type: "payment", data: { id: "pay-1" } },
      claimClient,
    );
    expect(repo.markProcessed).toHaveBeenCalledWith("evt-1", claimClient);
    expect(repo.markRetry).not.toHaveBeenCalled();
    expect(repo.markDeadLetter).not.toHaveBeenCalled();
  });

  test("uses the stored payload type when building the body", async () => {
    const { service, worker, setClaimed } = makeHarness();
    setClaimed([makeEvent({ payload: { type: "test", data: { id: "pay-1" } } })]);
    await worker.tick();
    expect(service.processWebhook).toHaveBeenCalledWith(
      { type: "test", data: { id: "pay-1" } },
      claimClient,
    );
  });

  test("marks processed for already_processed and ignored outcomes", async () => {
    const { repo, service, worker, setClaimed } = makeHarness();
    service.processWebhook
      .mockResolvedValueOnce({ status: "already_processed" })
      .mockResolvedValueOnce({ status: "ignored", reason: "not_payment" });
    setClaimed([makeEvent({ id: "evt-a" }), makeEvent({ id: "evt-b" })]);
    await worker.tick();

    expect(service.processWebhook).toHaveBeenCalledTimes(2);
    expect(repo.markProcessed).toHaveBeenCalledWith("evt-a", claimClient);
    expect(repo.markProcessed).toHaveBeenCalledWith("evt-b", claimClient);
  });

  test("schedules a retry with attempts+1 and a jittered available_at", async () => {
    const { repo, service, worker, setClaimed } = makeHarness();
    service.processWebhook.mockResolvedValue({ status: "retry", reason: "payment_not_found" });
    setClaimed([makeEvent()]);
    await worker.tick();

    expect(repo.markRetry).toHaveBeenCalledTimes(1);
    const [id, attempts, availableAt, lastError, client] = repo.markRetry.mock.calls[0];
    expect(id).toBe("evt-1");
    expect(attempts).toBe(1);
    expect(lastError).toBe("payment_not_found");
    expect(client).toBe(claimClient);
    // base = 1000ms, jitter = +/-20% → available_at lands in [800, 1200]ms ahead.
    const ts = (availableAt as Date).getTime();
    const now = Date.now();
    expect(ts).toBeGreaterThan(now + 600);
    expect(ts).toBeLessThan(now + 1400);
    expect(repo.markDeadLetter).not.toHaveBeenCalled();
  });

  test("dead-letters when the retry would exhaust the row's max_attempts", async () => {
    const { repo, service, onDeadLetter, worker, setClaimed } = makeHarness();
    service.processWebhook.mockResolvedValue({ status: "retry", reason: "payment_not_found" });
    // Row budget (max_attempts = 3) governs: next attempt would be the last.
    setClaimed([makeEvent({ attempts: 2, max_attempts: 3 })]);
    await worker.tick();

    expect(repo.markRetry).not.toHaveBeenCalled();
    expect(repo.markDeadLetter).toHaveBeenCalledWith("evt-1", "payment_not_found", claimClient);
    expect(onDeadLetter).toHaveBeenCalledTimes(1);
    expect(onDeadLetter.mock.calls[0][0]).toMatchObject({ id: "evt-1" });
  });

  test("honors the per-row max_attempts over the constructor option", async () => {
    const { repo, service, worker, setClaimed } = makeHarness(); // option maxAttempts = 3
    service.processWebhook.mockResolvedValue({ status: "retry", reason: "payment_not_found" });
    setClaimed([
      // Row allows more attempts than the worker option → keep retrying.
      makeEvent({ id: "evt-high", attempts: 2, max_attempts: 10 }),
      // Row allows no further attempts → dead letter even though option is 3.
      makeEvent({ id: "evt-low", attempts: 0, max_attempts: 1 }),
    ]);
    await worker.tick();

    expect(repo.markRetry).toHaveBeenCalledWith(
      "evt-high",
      3,
      expect.any(Date),
      "payment_not_found",
      claimClient,
    );
    expect(repo.markDeadLetter).toHaveBeenCalledWith("evt-low", "payment_not_found", claimClient);
  });

  test("dead-letters straight away for permanent failures", async () => {
    const { repo, service, onDeadLetter, worker, setClaimed } = makeHarness();
    service.processWebhook.mockResolvedValue({ status: "dead_letter", reason: "mismatch" });
    setClaimed([makeEvent()]);
    await worker.tick();

    expect(repo.markDeadLetter).toHaveBeenCalledWith("evt-1", "mismatch", claimClient);
    expect(onDeadLetter).toHaveBeenCalledTimes(1);
  });

  test("treats a thrown error as a transient retry with the error message", async () => {
    const { repo, service, onDeadLetter, worker, setClaimed } = makeHarness();
    service.processWebhook.mockRejectedValue(new Error("network down"));
    setClaimed([makeEvent()]);
    await worker.tick();

    expect(repo.markRetry).toHaveBeenCalledWith(
      "evt-1",
      1,
      expect.any(Date),
      "network down",
      claimClient,
    );
    expect(repo.markDeadLetter).not.toHaveBeenCalled();
    expect(onDeadLetter).not.toHaveBeenCalled();
  });

  test("a failing row does not prevent the rest of the batch from being processed", async () => {
    const { repo, service, worker, setClaimed } = makeHarness();
    service.processWebhook
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ status: "processed" });
    setClaimed([makeEvent({ id: "evt-a" }), makeEvent({ id: "evt-b" })]);
    await worker.tick();

    expect(repo.markRetry).toHaveBeenCalledWith("evt-a", 1, expect.any(Date), "boom", claimClient);
    expect(repo.markProcessed).toHaveBeenCalledWith("evt-b", claimClient);
  });

  test("skips overlapping ticks while one is still running", async () => {
    const { repo, service, worker, setClaimed } = makeHarness();
    setClaimed([makeEvent()]);
    let release!: () => void;
    service.processWebhook.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ status: "processed" });
        }),
    );

    const first = worker.tick();
    const second = worker.tick();
    expect(repo.claimDue).toHaveBeenCalledTimes(1);
    await flush(); // the in-flight tick reaches processWebhook after the SAVEPOINT query
    release();
    await first;
    await second;
    expect(repo.claimDue).toHaveBeenCalledTimes(1);
  });
});

describe("PaymentWebhookWorker.start/stop", () => {
  test("ticks on the configured interval and stops on stop()", async () => {
    jest.useFakeTimers();
    try {
      const { repo, worker, setClaimed } = makeHarness({ intervalMs: 2000 });
      setClaimed([makeEvent()]);
      worker.start();
      await jest.advanceTimersByTimeAsync(2000);
      expect(repo.claimDue).toHaveBeenCalledTimes(1);

      const stopPromise = worker.stop();
      await jest.advanceTimersByTimeAsync(6000);
      expect(repo.claimDue).toHaveBeenCalledTimes(1);
      await stopPromise;
      await flush();
    } finally {
      jest.useRealTimers();
    }
  });

  test("stop() resolves only after an in-flight tick finishes", async () => {
    const { service, worker, setClaimed } = makeHarness();
    setClaimed([makeEvent()]);
    let release!: () => void;
    service.processWebhook.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ status: "processed" });
        }),
    );

    const tickPromise = worker.tick();
    await flush(); // the tick is now blocked inside processWebhook
    let stopped = false;
    const stopPromise = worker.stop().then(() => {
      stopped = true;
    });
    // Synchronous check: stop() must not resolve while the tick is in flight.
    expect(stopped).toBe(false);

    release();
    await tickPromise;
    await stopPromise;
    expect(stopped).toBe(true);
  });
});
