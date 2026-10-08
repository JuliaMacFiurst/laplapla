import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

const mocks = vi.hoisted(() => ({ access: vi.fn(), download: vi.fn(), client: null as unknown }));
vi.mock("@/lib/server/auth/customerAccess", () => ({ resolveCustomerAccess: mocks.access }));
vi.mock("@/lib/server/customerPurchases", async (original) => ({ ...(await original<typeof import("@/lib/server/customerPurchases")>()), downloadOwnReceiptOriginal: mocks.download }));

import { customerReceiptDownloadHandler } from "@/pages/api/customer/purchases/[orderId]/receipt";

function req(orderId = "11111111-1111-4111-8111-111111111111") { return { method: "GET", query: { orderId }, headers: {} } as unknown as NextApiRequest; }
function response() {
  const result = { status: 0, body: null as unknown, sent: null as unknown, headers: {} as Record<string, string> };
  const res = { setHeader: vi.fn((name: string, value: string) => { result.headers[name] = value; }), status: vi.fn((status: number) => { result.status = status; return res; }), json: vi.fn((body: unknown) => { result.body = body; return res; }), send: vi.fn((body: unknown) => { result.sent = body; return res; }) } as unknown as NextApiResponse;
  return { res, result };
}

describe("customer receipt original download API", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.access.mockResolvedValue({ isAuthenticated: true, accessToken: "token", user: { id: "user-1" } }); });

  it("rejects anonymous and malformed order requests", async () => {
    mocks.access.mockResolvedValueOnce({ isAuthenticated: false, accessToken: null, user: null });
    const anonymous = response(); await customerReceiptDownloadHandler(req(), anonymous.res); expect(anonymous.result.status).toBe(401);
    const malformed = response(); await customerReceiptDownloadHandler(req("receipt-id-or-storage-key"), malformed.res); expect(malformed.result.status).toBe(400);
    expect(mocks.download).not.toHaveBeenCalled();
  });

  it("derives ownership from authenticated user and downloads only a ready original", async () => {
    mocks.download.mockResolvedValue({ status: "ready", bytes: Buffer.from("pdf"), fileName: "receipt-WEB-000001.pdf" });
    const target = response(); await customerReceiptDownloadHandler(req(), target.res);
    expect(mocks.download).toHaveBeenCalledWith("user-1", "11111111-1111-4111-8111-111111111111");
    expect(target.result.status).toBe(200);
    expect(target.result.headers["Content-Type"]).toBe("application/pdf");
    expect(target.result.headers["Content-Disposition"]).toContain("receipt-WEB-000001.pdf");
  });

  it("does not download another customer's or non-ready receipt", async () => {
    mocks.download.mockResolvedValueOnce({ status: "not_found" });
    const foreign = response(); await customerReceiptDownloadHandler(req(), foreign.res); expect(foreign.result.status).toBe(404);
    mocks.download.mockResolvedValueOnce({ status: "not_ready" });
    const pending = response(); await customerReceiptDownloadHandler(req(), pending.res); expect(pending.result.status).toBe(409);
  });

  it("has no customer-controlled copy, bucket, key, or receipt identifier", () => {
    const route = readFileSync(`${process.cwd()}/pages/api/customer/purchases/[orderId]/receipt.ts`, "utf8");
    const server = readFileSync(`${process.cwd()}/lib/server/customerPurchases.ts`, "utf8");
    expect(route).not.toMatch(/documentCopy|receiptId|storageKey|bucket/);
    expect(server).toContain('.eq("user_id", userId)');
    expect(server).toContain('.eq("document_copy", "original")');
  });
});
