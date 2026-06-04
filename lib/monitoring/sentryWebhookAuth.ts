import { createHmac, timingSafeEqual } from "node:crypto";

function normalizeSignature(signature: string): string {
  return signature.trim().replace(/^sha256=/i, "").toLowerCase();
}

export function verifySentryWebhookSignature(
  rawBody: Buffer,
  signature: string | null,
  secret: string | undefined,
): boolean {
  if (!signature || !secret) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = normalizeSignature(signature);

  if (!/^[a-f0-9]{64}$/.test(received)) {
    return false;
  }

  return timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"));
}
