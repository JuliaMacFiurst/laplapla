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

async function makeMasterBackgroundTransparent(input) {
  const decoded = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = decoded.data;
  const channels = decoded.info.channels;
  const { width, height } = decoded.info;
  const backgroundPixel = Array.from(pixels.subarray(0, channels));
  const backgroundIsTransparent = (backgroundPixel[3] ?? 255) === 0;

  if (!backgroundIsTransparent) {
    const transparentDistance = 12;
    const opaqueDistance = 64;
    const traversalDistance = 72;
    const pixelCount = width * height;
    const state = new Uint8Array(pixelCount);
    const queue = new Int32Array(pixelCount);
    let queueStart = 0;
    let queueEnd = 0;

    function colorDistance(pixelIndex) {
      const offset = pixelIndex * channels;
      return Math.max(
        Math.abs(pixels[offset] - backgroundPixel[0]),
        Math.abs(pixels[offset + 1] - backgroundPixel[1]),
        Math.abs(pixels[offset + 2] - backgroundPixel[2]),
      );
    }

    function enqueueBackground(pixelIndex) {
      if (state[pixelIndex] !== 0) {
        return;
      }
      if (colorDistance(pixelIndex) > traversalDistance) {
        state[pixelIndex] = 2;
        return;
      }
      state[pixelIndex] = 1;
      queue[queueEnd] = pixelIndex;
      queueEnd += 1;
    }

    for (let x = 0; x < width; x += 1) {
      enqueueBackground(x);
      enqueueBackground((height - 1) * width + x);
    }
    for (let y = 1; y < height - 1; y += 1) {
      enqueueBackground(y * width);
      enqueueBackground(y * width + width - 1);
    }

    while (queueStart < queueEnd) {
      const pixelIndex = queue[queueStart];
      queueStart += 1;
      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);
      if (x > 0) enqueueBackground(pixelIndex - 1);
      if (x + 1 < width) enqueueBackground(pixelIndex + 1);
      if (y > 0) enqueueBackground(pixelIndex - width);
      if (y + 1 < height) enqueueBackground(pixelIndex + width);
    }

    for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
      if (state[pixelIndex] !== 1) {
        continue;
      }
      const offset = pixelIndex * channels;
      const distance = colorDistance(pixelIndex);
      const alphaFactor = Math.max(
        0,
        Math.min(1, (distance - transparentDistance) / (opaqueDistance - transparentDistance)),
      );
      const sourceAlpha = pixels[offset + 3] / 255;
      const outputAlpha = sourceAlpha * alphaFactor;

      if (outputAlpha === 0) {
        pixels[offset] = 0;
        pixels[offset + 1] = 0;
        pixels[offset + 2] = 0;
        pixels[offset + 3] = 0;
        continue;
      }

      for (let channel = 0; channel < 3; channel += 1) {
        const foreground =
          (pixels[offset + channel] - (1 - alphaFactor) * backgroundPixel[channel]) /
          alphaFactor;
        pixels[offset + channel] = Math.round(Math.max(0, Math.min(255, foreground)));
      }
      pixels[offset + 3] = Math.round(outputAlpha * 255);
    }
  }

  return sharp(pixels, {
    raw: {
      width: decoded.info.width,
      height: decoded.info.height,
      channels,
    },
  })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .png()
    .toBuffer({ resolveWithObject: true });
}

const trimmed = await makeMasterBackgroundTransparent(sourceBuffer);

const normalizedLogo = await sharp(trimmed.data)
  .png()
  .toBuffer({ resolveWithObject: true });

if (!normalizedLogo.info.width || !normalizedLogo.info.height) {
  throw new Error("Splash master contains no visible logo.");
}

await rm(outputRoot, { recursive: true, force: true });

async function removeEdgeConnectedResizeFringe(input) {
  const decoded = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = decoded.info;
  const pixels = decoded.data;
  const pixelCount = width * height;
  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let queueStart = 0;
  let queueEnd = 0;

  function isExteriorCandidate(pixelIndex) {
    const offset = pixelIndex * channels;
    const alpha = pixels[offset + 3];
    return (
      alpha === 0 ||
      (alpha <= 64 &&
        pixels[offset] >= 245 &&
        pixels[offset + 1] >= 245 &&
        pixels[offset + 2] >= 245)
    );
  }

  function enqueue(pixelIndex) {
    if (visited[pixelIndex] || !isExteriorCandidate(pixelIndex)) {
      return;
    }
    visited[pixelIndex] = 1;
    queue[queueEnd] = pixelIndex;
    queueEnd += 1;
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (queueStart < queueEnd) {
    const pixelIndex = queue[queueStart];
    queueStart += 1;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const nextX = x + dx;
        const nextY = y + dy;
        if (nextX >= 0 && nextX < width && nextY >= 0 && nextY < height) {
          enqueue(nextY * width + nextX);
        }
      }
    }
  }

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    if (!visited[pixelIndex]) {
      continue;
    }
    const offset = pixelIndex * channels;
    if (pixels[offset + 3] <= 64) {
      pixels[offset] = 0;
      pixels[offset + 1] = 0;
      pixels[offset + 2] = 0;
      pixels[offset + 3] = 0;
    }
  }

  return sharp(pixels, { raw: { width, height, channels } })
    .png()
    .toBuffer({ resolveWithObject: true });
}

async function renderCenteredSquare(size, logoScale, destination) {
  const logoBox = Math.max(1, Math.round(size * logoScale));
  const resizedLogo = await sharp(normalizedLogo.data)
    .resize({
      width: logoBox,
      height: logoBox,
      fit: "inside",
      withoutEnlargement: false,
    })
    .png()
    .toBuffer({ resolveWithObject: true });
  const logo = await removeEdgeConnectedResizeFringe(resizedLogo.data);
  const left = Math.round((size - logo.info.width) / 2);
  const top = Math.round((size - logo.info.height) / 2);

  await mkdir(path.dirname(destination), { recursive: true });
  const canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
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

async function renderHandoffSquare(size, destination) {
  const approvedFallback = path.join(root, "public/pwa/splash/app-splash-logo-640.webp");
  // Matches the measured Browser Helper output to Android's physical system
  // splash size; this is intentionally smaller than the Android mask asset.
  const handoffSize = Math.round(size * 353 / 640);
  const resized = await sharp(approvedFallback)
    .resize({ width: handoffSize, height: handoffSize, fit: "fill", kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
  const left = Math.round((size - handoffSize) / 2);
  const top = Math.round((size - handoffSize) / 2);
  await mkdir(path.dirname(destination), { recursive: true });
  await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: resized, left, top }])
    .webp({ lossless: true })
    .toFile(destination);
  return {
    width: size,
    height: size,
    logoWidth: handoffSize,
    logoHeight: handoffSize,
    logoCenterX: size / 2,
    logoCenterY: size / 2,
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
const webMetrics = await renderHandoffSquare(
  640,
  path.join(outputRoot, webRelativePath),
);
generated.push({ platform: "web", density: "responsive", path: webRelativePath, ...webMetrics });

const report = {
  source: path.relative(root, sourcePath),
  sourceFormat: path.extname(sourcePath).slice(1),
  sourceSha256: createHash("sha256").update(sourceBuffer).digest("hex"),
  sourceWidth: metadata.width,
  sourceHeight: metadata.height,
  trimmedLogoWidth: normalizedLogo.info.width,
  trimmedLogoHeight: normalizedLogo.info.height,
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
