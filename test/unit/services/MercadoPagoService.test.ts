import type { MercadoPagoService } from "@/services/payments/MercadoPagoService";

jest.mock("@/services/payments/mercadopagoClient", () => ({
  getPaymentResource: jest.fn(),
}));

let getPaymentResourceMock: jest.Mock;
let ServiceCtor: typeof MercadoPagoService;

// test/setup.ts imports @/app before this file runs, caching the real service
// and client modules. resetModules + dynamic import re-loads them with the
// jest.mock above applied (same pattern as the MercadoPagoWebhook int test).
beforeAll(async () => {
  jest.resetModules();
  getPaymentResourceMock = (await import("@/services/payments/mercadopagoClient"))
    .getPaymentResource as jest.Mock;
  ({ MercadoPagoService: ServiceCtor } = await import("@/services/payments/MercadoPagoService"));
});

afterEach(() => {
  jest.useRealTimers();
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe("MercadoPagoService.getPayment", () => {
  test("rejects with a timeout error when the upstream get hangs", async () => {
    jest.useFakeTimers();
    getPaymentResourceMock.mockReturnValue({ get: jest.fn(() => new Promise(() => {})) });

    const service = new ServiceCtor();
    const promise = service.getPayment("pay-1");
    const assertion = expect(promise).rejects.toThrow("Mercado Pago getPayment timed out");
    await jest.advanceTimersByTimeAsync(10_000);
    await assertion;
  });

  test("returns the mapped payment when the upstream responds in time", async () => {
    jest.useFakeTimers();
    // Plain implementation (not mockResolvedValue): jest defers mockResolvedValue
    // through queueMicrotask, which fake timers also fake. A native resolved
    // promise settles on real microtask turns, like the real HTTP call would.
    const get = jest.fn(() =>
      Promise.resolve({
        id: "123",
        status: "approved",
        external_reference: "order-1",
        transaction_amount: 100,
        currency_id: "ARS",
        live_mode: false,
      }),
    );
    getPaymentResourceMock.mockReturnValue({ get });

    const service = new ServiceCtor();
    const expected = {
      id: "123",
      status: "approved",
      externalReference: "order-1",
      transactionAmountCents: 10000,
      currencyId: "ARS",
      liveMode: false,
    };
    await expect(service.getPayment("pay-1")).resolves.toMatchObject(expected);
    // The timer must have been cleared after the response: letting the full
    // timeout elapse must NOT reject the already-resolved call.
    await jest.advanceTimersByTimeAsync(10_000);
    await expect(service.getPayment("pay-1")).resolves.toMatchObject(expected);
  });
});
