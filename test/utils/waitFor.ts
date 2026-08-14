export async function waitFor(
  cond: () => boolean | Promise<boolean>,
  message: string,
  timeoutMs = 4000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await cond()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`waitFor timeout: ${message}`);
}
