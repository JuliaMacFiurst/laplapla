import { readFile } from "node:fs/promises";
import path from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { renderReceiptHtml, type ReceiptDocumentSnapshot } from "./documentTemplate";
import type { ReceiptDocumentCopy } from "./documentConfig";

export function normalizeReceiptPdfMetadata(pdf: Buffer, issuedAt: string) {
  const date = new Date(issuedAt);
  if (Number.isNaN(date.getTime())) throw new Error("invalid_receipt_issued_at");
  const timestamp = date.toISOString().replace(/[-:T]/gu, "").slice(0, 14);
  const replacement = `D:${timestamp}+00'00'`;
  const source = pdf.toString("latin1");
  let count = 0;
  const normalized = source.replace(/D:\d{14}\+00'00'/gu, () => {
    count += 1;
    return replacement;
  });
  if (count < 2 || normalized.length !== source.length) throw new Error("unexpected_pdf_metadata");
  return Buffer.from(normalized, "latin1");
}

export async function renderReceiptPdf(input: {
  snapshot: ReceiptDocumentSnapshot;
  documentCopy: ReceiptDocumentCopy;
}): Promise<Buffer> {
  const executablePath = process.env.RECEIPT_CHROME_EXECUTABLE_PATH || await chromium.executablePath();
  const browser = await puppeteer.launch({
    executablePath,
    args: process.env.RECEIPT_CHROME_EXECUTABLE_PATH
      ? ["--no-sandbox", "--disable-setuid-sandbox"]
      : chromium.args,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    const [hebrewFont, globalFont] = await Promise.all([
      readFile(path.join(process.cwd(), "assets", "fonts", "VarelaRound-Regular.ttf")),
      readFile(path.join(process.cwd(), "assets", "fonts", "Nunito-VariableFont_wght.ttf")),
    ]);
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const url = request.url();
      if (url.startsWith("data:") || url === "about:blank") request.continue();
      else request.abort();
    });
    const html = renderReceiptHtml({
      snapshots: [input.snapshot],
      documentCopy: input.documentCopy,
      fonts: {
        hebrew: `data:font/ttf;base64,${hebrewFont.toString("base64")}`,
        global: `data:font/ttf;base64,${globalFont.toString("base64")}`,
      },
    });
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
    return normalizeReceiptPdfMetadata(Buffer.from(pdf), input.snapshot.issuedAt);
  } finally {
    await browser.close();
  }
}
