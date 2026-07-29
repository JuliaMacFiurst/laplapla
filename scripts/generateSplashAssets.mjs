import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await readFile(path.join(root, "config/pwa.json"), "utf8"));
const outputRoot = path.join(root, "public/pwa/splash/generated");
const background = config.backgroundColor;

const androidTargets = [
  { density: "mdpi", size: 320 },
  { density: "hdpi", size: 480 },
  { density: "xhdpi", size: 640 },
  { density: "xxhdpi", size: 960 },
  { density: "xxxhdpi", size: 1280 },
];

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

const vectorSource = path.join(root, config.splashVectorPath);
const rasterSource = path.join(root, config.splashMasterPath);
const sourcePath = (await exists(vectorSource)) ? vectorSource : rasterSource;

if (!(await exists(sourcePath))) {
  throw new Error(
    `Splash master not found. Expected ${config.splashVectorPath} or ${config.splashMasterPath}.`,
  );
}

const sourceBuffer = await readFile(sourcePath);
const metadata = await sharp(sourceBuffer).metadata();
if (!metadata.width || !metadata.height) {
  throw new Error(`Unable to read splash dimensions from ${sourcePath}.`);
}
if (metadata.width !== metadata.height) {
  throw new Error(`Splash master must be square; received ${metadata.width}x${metadata.height}.`);
}

const trimmed = await sharp(sourceBuffer)
  .flatten({ background })
  .trim({ background, threshold: 10 })
  .png()
  .toBuffer({ resolveWithObject: true });

if (!trimmed.info.width || !trimmed.info.height) {
  throw new Error("Splash master contains no visible logo.");
}

await rm(outputRoot, { recursive: true, force: true });

async function renderCenteredSquare(size, logoScale, destination) {
  const logoBox = Math.max(1, Math.round(size * logoScale));
  const logo = await sharp(trimmed.data)
    .resize({
      width: logoBox,
      height: logoBox,
      fit: "inside",
      withoutEnlargement: false,
    })
    .png()
    .toBuffer({ resolveWithObject: true });
  const left = Math.round((size - logo.info.width) / 2);
  const top = Math.round((size - logo.info.height) / 2);

  await mkdir(path.dirname(destination), { recursive: true });
  const canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  }).composite([{ input: logo.data, left, top }]);

  if (path.extname(destination) === ".webp") {
    await canvas.webp({ quality: 90, smartSubsample: true }).toFile(destination);
  } else {
    await canvas.png({ compressionLevel: 9 }).toFile(destination);
  }

  return {
    width: size,
    height: size,
    logoWidth: logo.info.width,
    logoHeight: logo.info.height,
    logoCenterX: left + logo.info.width / 2,
    logoCenterY: top + logo.info.height / 2,
  };
}

const generated = [];
for (const target of androidTargets) {
  const relativePath = `android/drawable-${target.density}/splash.png`;
  const metrics = await renderCenteredSquare(
    target.size,
    config.splashLogoScale,
    path.join(outputRoot, relativePath),
  );
  generated.push({ platform: "android", density: target.density, path: relativePath, ...metrics });
}

const webRelativePath = "web/app-splash-logo-640.webp";
const webMetrics = await renderCenteredSquare(
  640,
  0.9,
  path.join(outputRoot, webRelativePath),
);
generated.push({ platform: "web", density: "responsive", path: webRelativePath, ...webMetrics });

const report = {
  source: path.relative(root, sourcePath),
  sourceFormat: path.extname(sourcePath).slice(1),
  sourceSha256: createHash("sha256").update(sourceBuffer).digest("hex"),
  sourceWidth: metadata.width,
  sourceHeight: metadata.height,
  trimmedLogoWidth: trimmed.info.width,
  trimmedLogoHeight: trimmed.info.height,
  backgroundColor: background,
  generated,
};

await writeFile(
  path.join(outputRoot, "splash-assets.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(
  `Generated ${generated.length} centered splash assets from ${report.source} (${metadata.width}x${metadata.height}).`,
);
