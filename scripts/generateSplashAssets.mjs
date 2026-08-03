import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(root, "public/pwa/splash/generated");
const sourcePath = path.join(root, "public/pwa/splash/app-splash-logo-640.webp");
const relativeOutputPath = "web/app-splash-logo-640.webp";
const outputPath = path.join(outputRoot, relativeOutputPath);
const canvasSize = 640;
const artworkSize = 353;

const source = await readFile(sourcePath);
const metadata = await sharp(source).metadata();
if (metadata.format !== "webp" || metadata.width !== canvasSize || metadata.height !== canvasSize || !metadata.hasAlpha) {
  throw new Error("Splash source must be a transparent 640x640 WebP.");
}

const resized = await sharp(source)
  .resize({ width: artworkSize, height: artworkSize, fit: "fill", kernel: sharp.kernel.lanczos3 })
  .png()
  .toBuffer();
const inset = Math.round((canvasSize - artworkSize) / 2);

await mkdir(path.dirname(outputPath), { recursive: true });
await sharp({
  create: {
    width: canvasSize,
    height: canvasSize,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([{ input: resized, left: inset, top: inset }])
  .webp({ lossless: true })
  .toFile(outputPath);

const report = {
  source: path.relative(root, sourcePath),
  sourceFormat: metadata.format,
  sourceSha256: createHash("sha256").update(source).digest("hex"),
  sourceWidth: metadata.width,
  sourceHeight: metadata.height,
  generated: [{
    platform: "web",
    density: "responsive",
    path: relativeOutputPath,
    width: canvasSize,
    height: canvasSize,
    logoWidth: artworkSize,
    logoHeight: artworkSize,
    logoCenterX: canvasSize / 2,
    logoCenterY: canvasSize / 2,
  }],
};

await writeFile(
  path.join(outputRoot, "splash-assets.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(`Generated ${relativeOutputPath} from ${report.source}.`);
