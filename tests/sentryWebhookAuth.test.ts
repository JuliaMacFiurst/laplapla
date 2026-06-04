import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifySentryWebhookSignature } from "../lib/monitoring/sentryWebhookAuth";

describe("Sentry webhook authentication", () => {
  const secret = "test-client-secret";
  const body = Buffer.from('{"action":"triggered"}');
  const signature = createHmac("sha256", secret).update(body).digest("hex");

  it("accepts a valid Sentry HMAC signature", () => {
    expect(verifySentryWebhookSignature(body, signature, secret)).toBe(true);
    expect(verifySentryWebhookSignature(body, `sha256=${signature}`, secret)).toBe(true);
  });

  it("rejects missing, malformed, and invalid signatures", () => {
    expect(verifySentryWebhookSignature(body, null, secret)).toBe(false);
    expect(verifySentryWebhookSignature(body, "invalid", secret)).toBe(false);
    expect(verifySentryWebhookSignature(body, signature, "wrong-secret")).toBe(false);
  });
});
