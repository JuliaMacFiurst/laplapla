import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";
import { readFile } from "node:fs/promises";

const mocks = vi.hoisted(() => ({
  queryResult: { data: [] as Array<{ id: string }>, error: null as Error | null },
  lastBuilder: null as ReturnType<typeof queryBuilder> | null,
  issue: vi.fn(),
  alert: vi.fn(),
}));

function queryBuilder() {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(async () => mocks.queryResult),
  };
  mocks.lastBuilder = builder;
  return builder;
}

vi.mock("@/lib/server/supabase", () => ({
  createServerSupabaseClient: () => ({ from: vi.fn(() => queryBuilder()) }),
}));
vi.mock("@/lib/server/commerce/receipts/issuance", () => ({
  issueReceiptAfterPaidFinalization: mocks.issue,
}));
vi.mock("@/lib/monitoring/captureAndAlertServerError", () => ({
  captureAndAlertServerError: mocks.alert,
}));

import {
  findReceiptRecoveryCandidateIds,
  RECEIPT_RECOVERY_BATCH_SIZE,
  recoverMissingPaidOrderReceipts,
} from "@/lib/server/commerce/receipts/recovery";
import { recoverReceiptsHandler } from "@/pages/api/cron/recover-receipts";

function response() {
  const result = { status: 200, body: null as unknown };
  const res = {
    setHeader: vi.fn(),
    status: vi.fn((status: number) => { result.status = status; return res; }),
    json: vi.fn((body: unknown) => { result.body = body; return res; }),
  } as unknown as NextApiResponse;
  return { res, result };
}

describe("receipt recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queryResult = { data: [], error: null };
    mocks.issue.mockResolvedValue({ status: "issued", receiptId: "receipt", displayNumber: "WEB-000001" });
    mocks.alert.mockResolvedValue(undefined);
  });

  it("uses a bounded paid/live/no-receipt server query", async () => {
    mocks.queryResult.data = [{ id: "order-1" }];
    await expect(findReceiptRecoveryCandidateIds(999)).resolves.toEqual(["order-1"]);
    expect(RECEIPT_RECOVERY_BATCH_SIZE).toBe(25);
    expect(mocks.lastBuilder?.eq).toHaveBeenCalledWith("status", "paid");
    expect(mocks.lastBuilder?.eq).toHaveBeenCalledWith("provider_environment", "live");
    expect(mocks.lastBuilder?.is).toHaveBeenCalledWith("receipts", null);
    expect(mocks.lastBuilder?.limit).toHaveBeenCalledWith(25);
    const source = await readFile(new URL("../lib/server/commerce/receipts/recovery.ts", import.meta.url), "utf8");
    expect(source).toContain('.eq("status", "paid")');
    expect(source).toContain('.eq("provider_environment", "live")');
    expect(source).toContain('.is("receipts", null)');
    expect(source).toContain(".limit(boundedLimit)");
    const vercel = await readFile(new URL("../vercel.json", import.meta.url), "utf8");
    expect(vercel).toContain('"/api/cron/recover-receipts"');
  });

  it("continues after failures and reports review work without PII", async () => {
    mocks.queryResult.data = [{ id: "order-a" }, { id: "order-b" }, { id: "order-c" }, { id: "order-d" }];
    mocks.issue
      .mockResolvedValueOnce({ status: "issued", receiptId: "r1", displayNumber: "WEB-000001" })
      .mockResolvedValueOnce({ status: "failed", code: "rpc_unavailable" })
      .mockResolvedValueOnce({ status: "not_eligible", code: "missing_product_snapshot", needsReview: true })
      .mockResolvedValueOnce({ status: "already_issued", receiptId: "r4", displayNumber: "WEB-000002" });
    await expect(recoverMissingPaidOrderReceipts()).resolves.toEqual({
      scanned: 4, issued: 1, alreadyIssued: 1, notEligible: 1, needsReview: 1, failed: 1,
      reviewOrderIds: ["order-c"], failedOrderIds: ["order-b"],
    });
    expect(mocks.issue).toHaveBeenCalledTimes(4);
    expect(mocks.issue).toHaveBeenNthCalledWith(4, { orderId: "order-d", source: "recovery" });
  });

  it("is protected by the established CRON_SECRET bearer convention", async () => {
    const previous = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "cron-test-secret";
    const unauthorized = response();
    await recoverReceiptsHandler({ method: "GET", headers: {} } as NextApiRequest, unauthorized.res);
    expect(unauthorized.result.status).toBe(401);

    const authorized = response();
    await recoverReceiptsHandler({ method: "GET", headers: { authorization: "Bearer cron-test-secret" } } as NextApiRequest, authorized.res);
    expect(authorized.result).toMatchObject({ status: 200, body: { ok: true } });
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  });
});
