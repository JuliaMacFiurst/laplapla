import type { NextApiRequest, NextApiResponse } from "next";
import { renderReceiptPdf } from "@/lib/server/commerce/receipts/pdfRenderer";
import { syntheticReceiptFixtures } from "@/lib/server/commerce/receipts/syntheticFixtures";
import { CUSTOMER_RECEIPT_DOCUMENT_COPY, RECEIPT_TEMPLATE_VERSION } from "@/lib/server/commerce/receipts/documentConfig";

type Response = {
  ok: true;
  renderer: "chromium";
  documentCopy: "original";
  byteSize: number;
  durationMs: number;
  templateVersion: string;
} | {
  ok: false;
  stage: "render";
  code: "receipt_pdf_render_failed";
};

export async function receiptPdfRuntimeSmokeHandler(req: NextApiRequest, res: NextApiResponse<Response>) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ ok: false, stage: "render", code: "receipt_pdf_render_failed" });
    return;
  }
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    res.status(401).json({ ok: false, stage: "render", code: "receipt_pdf_render_failed" });
    return;
  }

  const startedAt = performance.now();
  try {
    const pdf = await renderReceiptPdf({
      snapshot: syntheticReceiptFixtures[1],
      documentCopy: CUSTOMER_RECEIPT_DOCUMENT_COPY,
    });
    res.status(200).json({
      ok: true,
      renderer: "chromium",
      documentCopy: "original",
      byteSize: pdf.byteLength,
      durationMs: Math.round(performance.now() - startedAt),
      templateVersion: RECEIPT_TEMPLATE_VERSION,
    });
  } catch {
    console.error(JSON.stringify({
      level: "error",
      message: "Temporary receipt PDF runtime probe failed",
      stage: "render",
      code: "receipt_pdf_render_failed",
    }));
    res.status(503).json({ ok: false, stage: "render", code: "receipt_pdf_render_failed" });
  }
}

export default receiptPdfRuntimeSmokeHandler;
