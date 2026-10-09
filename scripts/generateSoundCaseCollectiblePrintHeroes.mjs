import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SOURCE_BASE = "https://pub-90c38f7454e44f0eaba7a2cdd9030ee6.r2.dev/quests/sound-case-001/collectible-cards/assets";
const OUTPUT_DIR = path.resolve("public/quests/sound-case-001/collectible-cards/print-heroes");
const WIDTH = 1200;
const HEIGHT = 1245;

const heroes = [
  ["A01", "sand-burping-bottle.webp", 50, 46],
  ["A02", "grandpa-midnight-fridge.webp", 50, 42],
  ["A03", "parrot-seismologist.webp", 50, 42],
  ["A04", "parrot-sand-studio.webp", 50, 45],
  ["A05", "capybara-expedition-shorts.webp", 50, 42],
  ["A06", "singing-sand-man.webp", 50, 38],
  ["A07", "chicken-vs-booming-dune.webp", 50, 45],
  ["A08", "meditating-fox-dune.webp", 50, 42],
  ["A09", "capybara-desert-trombone.webp", 50, 43],
  ["A10", "elephant-china-shop.webp", 50, 45],
  ["A11", "sand-grain-orchestra.webp", 50, 46],
  ["A12", "dune-recording-session.webp", 50, 43],
];

const gradient = Buffer.from(`<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="rgb(3 31 44)" stop-opacity=".32"/>
    <stop offset=".22" stop-color="black" stop-opacity="0"/>
    <stop offset=".52" stop-color="black" stop-opacity="0"/>
    <stop offset=".62" stop-color="rgb(3 24 32)" stop-opacity=".12"/>
    <stop offset="1" stop-color="rgb(3 24 32)" stop-opacity=".94"/>
  </linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#shade)"/>
</svg>`);

await mkdir(OUTPUT_DIR, { recursive: true });

for (const [id, fileName, positionX, positionY] of heroes) {
  const response = await fetch(`${SOURCE_BASE}/${fileName}`);
  if (!response.ok) throw new Error(`Failed to download ${fileName}: ${response.status}`);
  const source = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(source).metadata();
  if (!metadata.width || !metadata.height) throw new Error(`Missing dimensions for ${fileName}`);

  const scale = Math.max(WIDTH / metadata.width, HEIGHT / metadata.height);
  const resizedWidth = Math.ceil(metadata.width * scale);
  const resizedHeight = Math.ceil(metadata.height * scale);
  const left = Math.max(0, Math.min(resizedWidth - WIDTH, Math.round((resizedWidth - WIDTH) * positionX / 100)));
  const top = Math.max(0, Math.min(resizedHeight - HEIGHT, Math.round((resizedHeight - HEIGHT) * positionY / 100)));

  const opaqueHero = await sharp(source)
    .resize(resizedWidth, resizedHeight, { fit: "fill" })
    .extract({ left, top, width: WIDTH, height: HEIGHT })
    .flatten({ background: "#1784a8" })
    .composite([{ input: gradient, blend: "over" }])
    .jpeg({ quality: 95, chromaSubsampling: "4:4:4", mozjpeg: true })
    .toBuffer();

  await writeFile(path.join(OUTPUT_DIR, `${id.toLowerCase()}.jpg`), opaqueHero);
}

console.log(`Generated ${heroes.length} opaque ${WIDTH}×${HEIGHT} print heroes in ${OUTPUT_DIR}`);
