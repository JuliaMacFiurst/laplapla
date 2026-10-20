import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ recover: vi.fn(), alert: vi.fn() }));
vi.mock("@/lib/server/commerce/receipts/artifactRecovery", () => ({ recoverReceiptArtifacts: mocks.recover }));
vi.mock("@/lib/monitoring/captureAndAlertServerError", () => ({ captureAndAlertServerError: mocks.alert }));

import { recoverReceiptArtifactsHandler } from "@/pages/api/cron/recover-receipt-artifacts";

function response() {
  const res = { setHeader: vi.fn(), status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res); res.json.mockReturnValue(res);
  return res;
}

describe("receipt artifact recovery cron", () => {
  beforeEach(() => { vi.clearAllMocks(); process.env.CRON_SECRET = "cron-test-secret"; });

  it("requires the existing CRON_SECRET bearer convention", async () => {
    const res = response();
    await recoverReceiptArtifactsHandler({ method: "GET", headers: {} } as never, res as never);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(mocks.recover).not.toHaveBeenCalled();
  });

  it("returns only safe aggregate recovery data", async () => {
    mocks.recover.mockResolvedValue({ scanned: 2, complete: 1, incomplete: 1, failedReceiptIds: ["receipt-id"] });
    const res = response();
    await recoverReceiptArtifactsHandler({ method: "GET", headers: { authorization: "Bearer cron-test-secret" } } as never, res as never);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true, scanned: 2, complete: 1, incomplete: 1, failedReceiptIds: ["receipt-id"] });
  });
});
