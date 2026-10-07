import { describe, expect, it } from "vitest";
import { normalizeReceiptPdfMetadata } from "@/lib/server/commerce/receipts/pdfRenderer";

describe("receipt production PDF metadata", () => {
  it("normalizes volatile Chromium timestamps to immutable issuedAt without changing byte length", () => {
    const source = Buffer.from("/CreationDate (D:20261007211812+00'00') /ModDate (D:20261007211812+00'00')", "latin1");
    const result = normalizeReceiptPdfMetadata(source, "2026-10-07T12:30:00.000Z");
    expect(result.byteLength).toBe(source.byteLength);
    expect(result.toString("latin1")).toBe("/CreationDate (D:20261007123000+00'00') /ModDate (D:20261007123000+00'00')");
  });

  it("fails closed if Chromium changes the expected PDF metadata contract", () => {
    expect(() => normalizeReceiptPdfMetadata(Buffer.from("not-a-pdf"), "2026-10-07T12:30:00.000Z"))
      .toThrow("unexpected_pdf_metadata");
  });
});
