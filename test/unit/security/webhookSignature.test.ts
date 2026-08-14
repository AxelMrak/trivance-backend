import crypto from "crypto";

import { verifyWebhookSignature } from "@/services/webhooks/webhookSignature";

const SECRET = "test-webhook-secret";

function sign(manifest: string, secret = SECRET): string {
  return crypto.createHmac("sha256", secret).update(manifest).digest("hex");
}

function buildSignature(opts: {
  bodyId: string;
  xRequestId: string;
  ts: number;
  secret?: string;
}): string {
  const manifest = `id:${opts.bodyId};request-id:${opts.xRequestId};ts:${opts.ts};`;
  return `ts=${opts.ts},v1=${sign(manifest, opts.secret)}`;
}

describe("verifyWebhookSignature", () => {
  const nowSeconds = 1_700_000_000;
  const bodyId = "payment-123";
  const queryId = bodyId;
  const xRequestId = "req-abc";

  function call(
    xSignature: string,
    params?: Partial<{
      queryId: string;
      bodyId: string;
      xRequestId: string;
      secret: string;
      nowSeconds: number;
    }>,
  ): boolean {
    return verifyWebhookSignature({
      queryId: params?.queryId ?? queryId,
      bodyId: params?.bodyId ?? bodyId,
      xSignature,
      xRequestId: params?.xRequestId ?? xRequestId,
      secret: params?.secret ?? SECRET,
      nowSeconds: params?.nowSeconds ?? nowSeconds,
    });
  }

  it("accepts a valid signature within the freshness window", () => {
    expect(call(buildSignature({ bodyId, xRequestId, ts: nowSeconds }))).toBe(true);
  });

  it("rejects a tampered signature", () => {
    const good = buildSignature({ bodyId, xRequestId, ts: nowSeconds });
    const tampered = good.slice(0, -1) + (good.endsWith("0") ? "1" : "0");
    expect(call(tampered)).toBe(false);
  });

  it("rejects a signature whose digest has a different length", () => {
    const good = buildSignature({ bodyId, xRequestId, ts: nowSeconds });
    expect(call(good.slice(0, good.length - 4))).toBe(false);
  });

  it("rejects a stale timestamp beyond the 300s tolerance", () => {
    const staleTs = nowSeconds + 600;
    expect(call(buildSignature({ bodyId, xRequestId, ts: staleTs }))).toBe(false);
  });

  it("rejects when the query data.id does not match the body data.id", () => {
    expect(
      call(buildSignature({ bodyId, xRequestId, ts: nowSeconds }), { queryId: "payment-OTHER" }),
    ).toBe(false);
  });

  it("rejects when signed for a different x-request-id", () => {
    expect(call(buildSignature({ bodyId, xRequestId: "req-OTHER", ts: nowSeconds }))).toBe(false);
  });

  it("rejects when signed with a different secret", () => {
    expect(
      call(buildSignature({ bodyId, xRequestId, ts: nowSeconds, secret: "another-secret" })),
    ).toBe(false);
  });

  it("rejects when the ts part is missing", () => {
    const v1 = sign(`id:${bodyId};request-id:${xRequestId};ts:${nowSeconds};`);
    expect(call(`v1=${v1}`)).toBe(false);
  });

  it("rejects when the v1 part is missing", () => {
    expect(call(`ts=${nowSeconds}`)).toBe(false);
  });
});
