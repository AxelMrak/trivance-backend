import crypto from "crypto";

interface VerifyWebhookSignatureParams {
  queryId: string;
  bodyId: string;
  xSignature: string;
  xRequestId: string;
  secret: string;
  nowSeconds: number;
  toleranceSeconds?: number;
}

export function verifyWebhookSignature({
  queryId,
  bodyId,
  xSignature,
  xRequestId,
  secret,
  nowSeconds,
  toleranceSeconds = 300,
}: VerifyWebhookSignatureParams): boolean {
  let ts: string | undefined;
  let v1: string | undefined;
  for (const part of xSignature.split(",")) {
    const [key, ...rest] = part.split("=");
    const value = rest.join("=");
    if (key === "ts") ts = value;
    if (key === "v1") v1 = value;
  }
  if (ts == null || v1 == null) return false;

  const tsNumber = Number(ts);
  if (!Number.isFinite(tsNumber)) return false;
  if (Math.abs(nowSeconds - tsNumber) > toleranceSeconds) return false;

  if (queryId !== bodyId) return false;

  const manifest = `id:${bodyId};request-id:${xRequestId};ts:${ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(v1, "hex");
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}
