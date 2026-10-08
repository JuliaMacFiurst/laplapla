import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ render: vi.fn() }));
vi.mock("@/lib/server/commerce/receipts/pdfRenderer", () => ({ renderReceiptPdf: mocks.render }));

import { receiptPdfRuntimeSmokeHandler } from "@/pages/api/internal/receipt-pdf-runtime-smoke";

function response() {
  const res = { setHeader: vi.fn(), status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

describe("temporary receipt PDF runtime probe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "runtime-probe-secret";
    mocks.render.mockResolvedValue(Buffer.alloc(12345, 1));
  });

  it.each([undefined, "Bearer incorrect"])("rejects missing or incorrect authorization", async (authorization) => {
    const res = response();
    await receiptPdfRuntimeSmokeHandler({ method: "GET", headers: { authorization } } as never, res as never);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(mocks.render).not.toHaveBeenCalled();
  });

  it("renders one synthetic customer original and returns safe metadata only", async () => {
    const res = response();
    await receiptPdfRuntimeSmokeHandler({
      method: "GET", headers: { authorization: "Bearer runtime-probe-secret" },
    } as never, res as never);

    expect(mocks.render).toHaveBeenCalledOnce();
    expect(mocks.render.mock.calls[0][0]).toMatchObject({ documentCopy: "original" });
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload).toMatchObject({
      ok: true, renderer: "chromium", documentCopy: "original",
      byteSize: 12345, templateVersion: "receipt-html-v2",
    });
    expect(payload.durationMs).toEqual(expect.any(Number));
    expect(payload).not.toHaveProperty("pdf");
    expect(payload).not.toHaveProperty("html");
    expect(JSON.stringify(payload)).not.toContain("Анна");
    expect(JSON.stringify(payload)).not.toContain("WEB-000001");
  });

  it("sanitizes renderer failures", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.render.mockRejectedValue(new Error("private executable path"));
    const res = response();
    await receiptPdfRuntimeSmokeHandler({
      method: "GET", headers: { authorization: "Bearer runtime-probe-secret" },
    } as never, res as never);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ ok: false, stage: "render", code: "receipt_pdf_render_failed" });
    expect(JSON.stringify(res.json.mock.calls)).not.toContain("private executable path");
  });
});
