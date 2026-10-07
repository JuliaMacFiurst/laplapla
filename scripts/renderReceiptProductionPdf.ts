import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderReceiptPdf } from "../lib/server/commerce/receipts/pdfRenderer";
import { syntheticReceiptFixtures } from "../lib/server/commerce/receipts/syntheticFixtures";

async function main() {
  const outputDirectory = process.env.RECEIPT_SPIKE_OUTPUT_DIR || "/tmp/laplapla-receipt-production-spike";
  await mkdir(outputDirectory, { recursive: true });
  const snapshot = syntheticReceiptFixtures[1];
  for (const documentCopy of ["original", "copy"] as const) {
    const pdf = await renderReceiptPdf({ snapshot, documentCopy });
    const target = path.join(outputDirectory, `synthetic-${documentCopy}.pdf`);
    await writeFile(target, pdf);
    process.stdout.write(`${target}\n`);
  }
}

main().catch((error) => {
  process.stderr.write(`Receipt production rendering spike failed: ${error instanceof Error ? error.message : "unknown error"}\n`);
  process.exitCode = 1;
});
