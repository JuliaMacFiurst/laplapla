import { readFile } from "node:fs/promises";
import path from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export type SandboxPurchaseDocument = {
  orderId: string;
  product: string;
  amountMinor: number;
  currency: string;
  paidAt: string;
};

const MACOS_CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export function sandboxChromeOverride(platform: NodeJS.Platform, configuredPath?: string) {
  return configuredPath || (platform === "darwin" ? MACOS_CHROME_PATH : null);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/gu, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

export function renderSandboxPurchaseHtml(input: SandboxPurchaseDocument, fonts: { global: string; hebrew: string }) {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0 || Number.isNaN(Date.parse(input.paidAt))) {
    throw new Error("invalid_sandbox_document_data");
  }
  const amount = `${(input.amountMinor / 100).toFixed(2)} ${escapeHtml(input.currency)}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
    @font-face{font-family:Nunito;src:url(${fonts.global}) format('truetype')}
    @font-face{font-family:Varela;src:url(${fonts.hebrew}) format('truetype')}
    @page{size:A4;margin:0}
    *{box-sizing:border-box}body{margin:0;color:#252238;background:#fff;font-family:Nunito,Arial,sans-serif}
    main{min-height:280mm;padding:12mm 14mm;border:7mm solid #f1d563;background:repeating-linear-gradient(135deg,#fffef5 0,#fffef5 18px,#fff9df 18px,#fff9df 36px)}
    .stamp{display:block;width:100%;padding:5mm 4mm;border:3px solid #9b3054;border-radius:8mm;background:#fff;color:#842648;text-align:center}
    .stamp strong{display:block;font-size:23pt;line-height:1.2}.stamp .he{font-family:Varela,Arial,sans-serif;direction:rtl}
    h1{margin:8mm 0 3mm;font-size:26pt;color:#513764}p{font-size:13pt;line-height:1.4}
    .warning{margin:5mm 0;padding:4mm;border:3px solid #9b3054;background:#fff0f3;color:#842648;text-align:center;font-size:17pt;font-weight:800;line-height:1.3}
    .warning .he{font-family:Varela,Arial,sans-serif;direction:rtl}
    dl{display:grid;grid-template-columns:44mm 1fr;gap:2mm;padding:4mm;background:#fff;border-radius:5mm;font-size:12pt}
    dt{font-weight:800}dd{margin:0;overflow-wrap:anywhere}.footer{margin-top:5mm;font-size:12pt;font-weight:800;text-align:center;color:#842648}
  </style></head><body><main>
    <div class="stamp"><strong>ТЕСТОВЫЙ ДОКУМЕНТ</strong><strong>TEST DOCUMENT</strong><strong class="he">מסמך לבדיקה בלבד</strong></div>
    <h1>LapLapLa · PayPal Sandbox</h1>
    <p>This document confirms a test purchase only. No real money was charged.</p>
    <div class="warning">НЕ ЯВЛЯЕТСЯ КВИТАНЦИЕЙ<br>NOT A TAX RECEIPT<br><span class="he">אינו קבלה לצורכי מס</span></div>
    <dl><dt>Product</dt><dd>${escapeHtml(input.product)}</dd>
      <dt>Test amount</dt><dd>${amount}</dd>
      <dt>Test date</dt><dd>${escapeHtml(new Date(input.paidAt).toISOString())}</dd>
      <dt>Sandbox Order ID</dt><dd>${escapeHtml(input.orderId)}</dd></dl>
    <p class="footer">TEST ONLY — NO REAL MONEY — NOT AN ACCOUNTING DOCUMENT</p>
  </main></body></html>`;
}

export async function renderSandboxPurchasePdf(input: SandboxPurchaseDocument): Promise<Buffer> {
  const override = sandboxChromeOverride(process.platform, process.env.RECEIPT_CHROME_EXECUTABLE_PATH);
  const executablePath = override || await chromium.executablePath();
  const browser = await puppeteer.launch({
    executablePath,
    args: override
      ? ["--no-sandbox", "--disable-setuid-sandbox"]
      : chromium.args,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    const [global, hebrew] = await Promise.all([
      readFile(path.join(process.cwd(), "assets", "fonts", "Nunito-VariableFont_wght.ttf")),
      readFile(path.join(process.cwd(), "assets", "fonts", "VarelaRound-Regular.ttf")),
    ]);
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (request.url().startsWith("data:") || request.url() === "about:blank") request.continue();
      else request.abort();
    });
    await page.setContent(renderSandboxPurchaseHtml(input, {
      global: `data:font/ttf;base64,${global.toString("base64")}`,
      hebrew: `data:font/ttf;base64,${hebrew.toString("base64")}`,
    }), { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    return Buffer.from(await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true }));
  } finally {
    await browser.close();
  }
}
