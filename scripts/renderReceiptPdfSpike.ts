import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, stat, unlink, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import type { ReceiptDocumentCopy } from "@/lib/server/commerce/receipts/documentConfig";
import { renderReceiptHtml } from "@/lib/server/commerce/receipts/documentTemplate";
import type { ReceiptDocumentSnapshot } from "@/lib/server/commerce/receipts/documentTemplate";
import { syntheticReceiptFixtures } from "@/lib/server/commerce/receipts/syntheticFixtures";

const repositoryRoot = process.cwd();
const originalOutputPath = "/tmp/receipt-rendering-spike-original.pdf";
const copyOutputPath = "/tmp/receipt-rendering-spike-copy.pdf";
const chromePath = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function fontDataUrl(relativePath: string) {
  const data = await readFile(path.join(repositoryRoot, relativePath));
  return `data:font/ttf;base64,${data.toString("base64")}`;
}

async function removeIfPresent(filePath: string) {
  await unlink(filePath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
}

async function renderWithLocalChrome(htmlPath: string, pdfPath: string, chromeProfile: string) {
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    `--user-data-dir=${chromeProfile}`,
    `--print-to-pdf=${pdfPath}`,
    pathToFileURL(htmlPath).href,
  ], { stdio: "ignore" });
  const closed = new Promise<void>((resolve) => chrome.once("close", () => resolve()));
  const startedAt = Date.now();
  let previousSize = -1;
  let stableChecks = 0;
  try {
    while (Date.now() - startedAt < 20_000) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const size = await stat(pdfPath).then((value) => value.size).catch(() => 0);
      stableChecks = size > 0 && size === previousSize ? stableChecks + 1 : 0;
      if (stableChecks >= 8) return;
      previousSize = size;
    }
    throw new Error("Local Chrome did not finish the PDF within 20 seconds");
  } finally {
    chrome.kill("SIGKILL");
    await closed;
  }
}

async function renderVariant(input: {
  documentCopy: ReceiptDocumentCopy;
  snapshots: ReceiptDocumentSnapshot[];
  outputPath: string;
  fonts: { hebrew: string; global: string };
}) {
  const pagePaths: string[] = [];
  for (const [index, snapshot] of input.snapshots.entries()) {
    const htmlPath = `/tmp/receipt-rendering-spike-${input.documentCopy}-${index + 1}.html`;
    const pagePath = `/tmp/receipt-rendering-spike-${input.documentCopy}-${index + 1}.pdf`;
    const html = renderReceiptHtml({
      snapshots: [snapshot],
      fonts: input.fonts,
      documentCopy: input.documentCopy,
      syntheticLabel: "SYNTHETIC RENDERING SPIKE - NOT AN ISSUED RECEIPT",
    });
    await writeFile(htmlPath, html, "utf8");
    await removeIfPresent(pagePath);
    const chromeProfile = await mkdtemp("/tmp/receipt-pdf-chrome-");
    try {
      await renderWithLocalChrome(htmlPath, pagePath, chromeProfile);
    } finally {
      await rm(chromeProfile, { recursive: true, force: true });
    }
    pagePaths.push(pagePath);
  }
  await removeIfPresent(input.outputPath);
  const pdfunite = spawn("pdfunite", [...pagePaths, input.outputPath], { stdio: "inherit" });
  const exitCode = await new Promise<number | null>((resolve) => pdfunite.once("close", resolve));
  if (exitCode !== 0) throw new Error("pdfunite failed to assemble the synthetic fixture PDF");
}

async function main() {
  const fonts = {
    hebrew: await fontDataUrl("assets/fonts/VarelaRound-Regular.ttf"),
    global: await fontDataUrl("assets/fonts/Nunito-VariableFont_wght.ttf"),
  };
  await renderVariant({
    documentCopy: "original",
    snapshots: syntheticReceiptFixtures,
    outputPath: originalOutputPath,
    fonts,
  });
  await renderVariant({
    documentCopy: "copy",
    snapshots: [syntheticReceiptFixtures[0]],
    outputPath: copyOutputPath,
    fonts,
  });
  process.stdout.write(`${originalOutputPath}\n${copyOutputPath}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Receipt rendering spike failed");
  process.exitCode = 1;
});
