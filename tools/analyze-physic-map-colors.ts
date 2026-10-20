/** Offline diagnostic only. Never imported by the map runtime.
 * Run with --input path/to/sanitized.svg or --url https://host/api/map-svg?...
 * Use --help for examples; --check verifies previously generated outputs.
 */
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  boxesNearWithWrap, colorDistance, colorGraph, dilatePeriodicX, PALETTE, shortHash, validateGraph,
  type Box, type Graph,
} from "./physicMapColorCore";

const OUTPUT_DIR = "generated";
const RASTER_SCALE = 2;
// 3/800 of map width: roughly 2.4–3.8 CSS px at common 640–1024 px map widths.
// A near-sea gap should count; larger gaps should not become graph edges.
const NEIGHBOR_MARGIN = 3;
const COLOR_DISTANCE_THRESHOLD = 0.055; // Euclidean OKLab; desired, not guaranteed.
const ALPHA_THRESHOLD = 1; // Include even tiny antialiased islands.

type PathRecord = {
  index: number; id: string; d: string; fill: string; fillRule: string;
  bbox: Box; moveCount: number; category: string; compound: boolean;
  continent: boolean; island: boolean; islandGroup: boolean; instanceKey: string;
};
type Mask = { bits: Uint32Array; expanded: Uint32Array };

const USAGE = `Usage:
  node --import tsx tools/analyze-physic-map-colors.ts --input ./map.svg [--check]
  node --import tsx tools/analyze-physic-map-colors.ts --url 'http://localhost:3000/api/map-svg?path=physic%2Fwonders_colored.svg&policy=2' [--check]

Provide exactly one input source. --url makes an HTTP(S) request; no network request
occurs with --input. --check compares results with existing generated outputs.
The input SVG is hashed in memory and is never saved as a source snapshot.`;

function parseInputArgs(args: string[]): { input?: string; url?: string; check: boolean; help: boolean } {
  let input: string | undefined;
  let url: string | undefined;
  let check = false;
  let help = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") help = true;
    else if (arg === "--check") check = true;
    else if (arg === "--input" || arg === "--url") {
      const value = args[++i];
      if (!value || value.startsWith("--")) throw new Error(`${arg} requires a value.\n\n${USAGE}`);
      if (arg === "--input") {
        if (input) throw new Error(`--input may only be provided once.\n\n${USAGE}`);
        input = value;
      } else {
        if (url) throw new Error(`--url may only be provided once.\n\n${USAGE}`);
        url = value;
      }
    } else throw new Error(`Unknown argument: ${arg}.\n\n${USAGE}`);
  }
  if (!help && Number(Boolean(input)) + Number(Boolean(url)) !== 1) {
    throw new Error(`Provide exactly one of --input or --url.\n\n${USAGE}`);
  }
  return { input, url, check, help };
}

async function readSource(args: ReturnType<typeof parseInputArgs>): Promise<{ bytes: Buffer; source: string }> {
  if (args.input) {
    const source = path.resolve(args.input);
    return { bytes: await readFile(source), source };
  }
  const source = new URL(args.url!);
  if (source.protocol !== "http:" && source.protocol !== "https:") {
    throw new Error("--url must use HTTP or HTTPS");
  }
  const response = await fetch(source);
  if (!response.ok) throw new Error(`SVG download failed: HTTP ${response.status} ${response.statusText}`);
  return { bytes: Buffer.from(await response.arrayBuffer()), source: source.toString() };
}

function xmlDecode(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity: string) => {
    if (entity[0] === "#") return String.fromCodePoint(
      entity[1]?.toLowerCase() === "x" ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10),
    );
    return ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" } as Record<string, string>)[entity] ?? _;
  });
}

function xmlEscape(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function attributes(tag: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)) {
    result[match[1]] = xmlDecode(match[3]);
  }
  return result;
}

function categoryFor(id: string): string {
  if (id.startsWith("Island group ")) return "island-group";
  if (id.startsWith("Island ")) return "island";
  if (id.startsWith("Continent ")) return "continent";
  if (id.startsWith("Range/mtn ")) return "range";
  if (id.startsWith("Desert ")) return "desert";
  if (id.startsWith("Geoarea ")) return "geoarea";
  if (id.startsWith("Peninsula ")) return "peninsula";
  if (id.startsWith("Isthmus ")) return "isthmus";
  if (id.startsWith("Lake ")) return "lake";
  if (id.startsWith("Depression ")) return "depression";
  return "other";
}

function parseSvg(svg: string): { records: PathRecord[]; viewBox: Box; pathTags: string[] } {
  const svgTag = svg.match(/<svg\b[^>]*>/)?.[0];
  if (!svgTag) throw new Error("Missing SVG root");
  const values = attributes(svgTag).viewBox?.trim().split(/[\s,]+/).map(Number);
  if (!values || values.length !== 4 || values.some((n) => !Number.isFinite(n))) {
    throw new Error("Missing or invalid viewBox");
  }
  const viewBox: Box = { x: values[0], y: values[1], width: values[2], height: values[3] };
  if (viewBox.x !== 0 || viewBox.y !== 0 || viewBox.width <= 0 || viewBox.height <= 0) {
    throw new Error("Tool expects a positive viewBox starting at 0,0");
  }
  const pathTags = [...svg.matchAll(/<path\b[^>]*\/?\s*>/g)].map((match) => match[0]);
  if (!pathTags.length) throw new Error("No path elements found");
  const records = pathTags.map((tag, index): PathRecord => {
    const attr = attributes(tag);
    if (!attr.id || !attr.d || !attr.fill) throw new Error(`Path ${index}: missing id/d/fill`);
    const category = categoryFor(attr.id);
    const moveCount = (attr.d.match(/[Mm](?=\s*[-+.]?\d)/g) ?? []).length;
    if (!moveCount) throw new Error(`Path ${index}: no moveto`);
    return {
      index, id: attr.id, d: attr.d, fill: attr.fill, fillRule: attr["fill-rule"] ?? "nonzero",
      bbox: { x: 0, y: 0, width: 0, height: 0 }, moveCount, category,
      compound: moveCount > 1, continent: category === "continent",
      island: category === "island", islandGroup: category === "island-group",
      instanceKey: `${attr.id}::${shortHash(attr.d)}`,
    };
  });
  if (new Set(records.map((record) => record.instanceKey)).size !== records.length) {
    throw new Error("Duplicate instanceKey (full hash collision or identical id+d)");
  }
  return { records, viewBox, pathTags };
}

function setBit(bits: Uint32Array, position: number): void {
  bits[position >>> 5] |= 1 << (position & 31);
}

function packMask(binary: Uint8Array): Uint32Array {
  const bits = new Uint32Array(Math.ceil(binary.length / 32));
  for (let i = 0; i < binary.length; i++) if (binary[i]) setBit(bits, i);
  return bits;
}

function masksOverlap(a: Uint32Array, b: Uint32Array): boolean {
  for (let i = 0; i < a.length; i++) if (a[i] & b[i]) return true;
  return false;
}

async function rasterize(record: PathRecord, viewBox: Box): Promise<{ bbox: Box; mask?: Mask; pixelCount: number }> {
  const width = Math.round(viewBox.width * RASTER_SCALE);
  const height = Math.round(viewBox.height * RASTER_SCALE);
  const radius = Math.round(NEIGHBOR_MARGIN * RASTER_SCALE);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${viewBox.width} ${viewBox.height}"><path d="${xmlEscape(record.d)}" fill="white" fill-rule="${record.fillRule}"/></svg>`;
  const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const binary = new Uint8Array(width * height);
  let minX = width, minY = height, maxX = -1, maxY = -1, pixelCount = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const position = y * width + x;
    if (data[position * info.channels + info.channels - 1] < ALPHA_THRESHOLD) continue;
    binary[position] = 255;
    pixelCount++;
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  if (!pixelCount) throw new Error(`Path not visible at ${RASTER_SCALE}x: ${record.instanceKey}`);
  const bbox = {
    x: minX / RASTER_SCALE, y: minY / RASTER_SCALE,
    width: (maxX - minX + 1) / RASTER_SCALE, height: (maxY - minY + 1) / RASTER_SCALE,
  };
  if (!record.island && !record.islandGroup) return { bbox, pixelCount };

  const expanded = dilatePeriodicX(binary, width, height, radius);
  return { bbox, mask: { bits: packMask(binary), expanded: packMask(expanded) }, pixelCount };
}

function components(graph: Graph): number {
  const seen = new Set<string>();
  let count = 0;
  for (const key of graph.keys()) {
    if (seen.has(key)) continue;
    count++;
    const pending = [key];
    seen.add(key);
    while (pending.length) for (const neighbor of graph.get(pending.pop()!) ?? []) {
      if (!seen.has(neighbor)) { seen.add(neighbor); pending.push(neighbor); }
    }
  }
  return count;
}

function markdownRows(records: PathRecord[], select: (record: PathRecord) => boolean, limit = 60): string {
  const rows = records.filter(select).slice(0, limit).map((record) =>
    `| ${record.index} | ${record.id.replaceAll("|", "\\|")} | \`${record.instanceKey}\` | ${record.bbox.width.toFixed(1)}×${record.bbox.height.toFixed(1)} | ${record.moveCount} |`,
  );
  return rows.join("\n") || "| — | — | — | — | — |";
}

function previewHtml(svg: string, svgSha256: string, records: PathRecord[], colors: Map<string, string>, graph: Graph, conflictKeys: Set<string>): string {
  let index = 0;
  const decorated = svg.replace(/<path\b[^>]*\/?\s*>/g, (tag) => {
    const record = records[index++];
    const color = colors.get(record.instanceKey);
    if (!color) return tag;
    return tag.replace(/\sfill=(["']).*?\1/s, ` fill="${color}"`).replace(/\s*\/?>$/, "") +
      ` data-instance-key="${xmlEscape(record.instanceKey)}" data-conflict="${conflictKeys.has(record.instanceKey) ? "true" : "false"}">`;
  });
  const data = Object.fromEntries(records.filter((record) => colors.has(record.instanceKey)).map((record) => [
    record.instanceKey, { id: record.id, color: colors.get(record.instanceKey), neighbors: graph.get(record.instanceKey)?.size ?? 0 },
  ]));
  const json = JSON.stringify(data).replaceAll("<", "\\u003c");
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="svg-sha256" content="${svgSha256}"><title>Physic map color preview</title>
<style>body{margin:0;background:#eee9dc;color:#352c20;font:14px system-ui}header{position:sticky;top:0;z-index:2;background:#fff8e9;padding:12px 18px;box-shadow:0 1px 5px #888}main{padding:20px;overflow:auto}svg{display:block;width:min(100%,1400px);height:auto;background:#e6f2f1;margin:auto}svg path:not([data-instance-key]){pointer-events:none}svg path[data-instance-key]{cursor:pointer}svg path.hovered{stroke:#1a3540!important;stroke-width:1.5!important}body.show-conflicts svg path[data-conflict="true"]{stroke:#d00000!important;stroke-width:1.6!important}#details{min-height:2.5em;overflow-wrap:anywhere}label{margin-left:15px}</style>
<header><strong>Physical map · offline diagnostic</strong><label><input id="conflicts" type="checkbox"> Show graph conflicts</label><small style="display:block">SVG SHA-256: ${svgSha256}</small><div id="details">Hover an island or island group.</div></header><main>${decorated}</main>
<script>const info=${json};let previous=null;document.getElementById('conflicts').addEventListener('change',e=>document.body.classList.toggle('show-conflicts',e.target.checked));document.querySelector('svg').addEventListener('pointermove',e=>{const p=e.target.closest?.('path[data-instance-key]');if(previous!==p){previous?.classList.remove('hovered');previous=p;p?.classList.add('hovered')}const key=p?.getAttribute('data-instance-key');const v=key&&info[key];document.getElementById('details').textContent=v?v.id+' · '+key+' · '+v.color+' · neighbors: '+v.neighbors:'Hover an island or island group.'});document.querySelector('svg').addEventListener('pointerleave',()=>{previous?.classList.remove('hovered');previous=null;document.getElementById('details').textContent='Hover an island or island group.'});</script></html>\n`;
}

async function main(): Promise<void> {
  const args = parseInputArgs(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE);
    return;
  }
  const { bytes: svgBytes, source } = await readSource(args);
  const svg = svgBytes.toString("utf8");
  const svgSha256 = createHash("sha256").update(svgBytes).digest("hex");
  const { records, viewBox } = parseSvg(svg);
  const targets = records.filter((record) => record.island || record.islandGroup);
  const masks = new Map<string, Mask>();
  for (const record of records) {
    const raster = await rasterize(record, viewBox);
    record.bbox = raster.bbox;
    if (raster.mask) masks.set(record.instanceKey, raster.mask);
  }
  const graph: Graph = new Map(targets.map((record) => [record.instanceKey, new Set<string>()]));
  let bboxCandidates = 0;
  for (let a = 0; a < targets.length; a++) for (let b = a + 1; b < targets.length; b++) {
    const left = targets[a], right = targets[b];
    if (!boxesNearWithWrap(left.bbox, right.bbox, NEIGHBOR_MARGIN, viewBox.width)) continue;
    bboxCandidates++;
    const leftMask = masks.get(left.instanceKey)!;
    const rightMask = masks.get(right.instanceKey)!;
    if (!masksOverlap(leftMask.expanded, rightMask.bits) && !masksOverlap(rightMask.expanded, leftMask.bits)) continue;
    graph.get(left.instanceKey)!.add(right.instanceKey);
    graph.get(right.instanceKey)!.add(left.instanceKey);
  }
  validateGraph(graph);
  const colors = colorGraph(graph, PALETTE, COLOR_DISTANCE_THRESHOLD);
  if (colors.size !== targets.length || targets.some((record) => !colors.has(record.instanceKey))) {
    throw new Error("Some targets have no color");
  }
  const edges = [...graph].flatMap(([key, neighbors]) => [...neighbors].filter((neighbor) => key < neighbor).map((neighbor) => [key, neighbor] as const));
  const same = edges.filter(([a, b]) => colors.get(a) === colors.get(b));
  const close = edges.filter(([a, b]) => colorDistance(colors.get(a)!, colors.get(b)!) < COLOR_DISTANCE_THRESHOLD);
  const conflictKeys = new Set(close.flat());
  const paletteShortage = targets.filter((record) => {
    if (!conflictKeys.has(record.instanceKey)) return false;
    const neighborColors = [...graph.get(record.instanceKey)!].map((key) => colors.get(key)!);
    return PALETTE.every((candidate) => neighborColors.some(
      (other) => colorDistance(candidate, other) < COLOR_DISTANCE_THRESHOLD,
    ));
  });
  const degree = (key: string) => graph.get(key)?.size ?? 0;
  const maxDegree = Math.max(...targets.map((record) => degree(record.instanceKey)));
  const highDegree = targets.filter((record) => degree(record.instanceKey) >= Math.max(10, Math.ceil(maxDegree * 0.7)))
    .sort((a, b) => degree(b.instanceKey) - degree(a.instanceKey) || a.instanceKey.localeCompare(b.instanceKey, "en"));
  const giant = records.filter((record) => record.bbox.width > viewBox.width / 4 || record.bbox.height > viewBox.height / 2);
  const compound = records.filter((record) => record.moveCount >= 5).sort((a, b) => b.moveCount - a.moveCount);
  const byId = new Map<string, PathRecord[]>();
  for (const record of records) byId.set(record.id, [...(byId.get(record.id) ?? []), record]);
  const duplicates = [...byId.entries()].filter(([, list]) => list.length > 1).sort(([a], [b]) => a.localeCompare(b, "en"));
  const colorCounts = Object.fromEntries(PALETTE.map((color) => [color, [...colors.values()].filter((value) => value === color).length]));
  const output = {
    svgSha256, source, viewBox, palette: PALETTE,
    config: { neighborMargin: NEIGHBOR_MARGIN, rasterScale: RASTER_SCALE, alphaThreshold: ALPHA_THRESHOLD, colorSpace: "OKLab", colorDistanceThreshold: COLOR_DISTANCE_THRESHOLD },
    stats: { totalPaths: records.length, targetPaths: targets.length, island: targets.filter((p) => p.island).length,
      islandGroup: targets.filter((p) => p.islandGroup).length, vertices: graph.size, edges: edges.length,
      averageDegree: 2 * edges.length / graph.size, maxDegree, connectedComponents: components(graph),
      bboxCandidates, identicalColorEdges: same.length, tooCloseEdges: close.length,
      conflictVertices: conflictKeys.size, locallyPaletteLimitedVertices: paletteShortage.length },
    paths: Object.fromEntries(targets.map((record) => [record.instanceKey, {
      id: record.id, index: record.index, category: record.category, sourceFill: record.fill,
      fillRule: record.fillRule, bbox: record.bbox, moveCount: record.moveCount,
      compound: record.compound, color: colors.get(record.instanceKey), neighbors: [...graph.get(record.instanceKey)!].sort(),
    }])),
    excludedPaths: records.filter((record) => !graph.has(record.instanceKey)).map((record) => ({
      instanceKey: record.instanceKey, id: record.id, index: record.index, category: record.category,
      sourceFill: record.fill, fillRule: record.fillRule, bbox: record.bbox, moveCount: record.moveCount,
      compound: record.compound, continent: record.continent,
    })),
  };
  const report = `# Physical map color analysis\n\nSVG SHA-256: \`${svgSha256}\`  \nSource: \`${source}\`\n\n` +
    `## Graph\n\n| Metric | Value |\n|---|---:|\n| All paths | ${records.length} |\n| Target paths | ${targets.length} |\n| Island | ${output.stats.island} |\n| Island group | ${output.stats.islandGroup} |\n| Excluded paths | ${output.excludedPaths.length} |\n| Vertices | ${graph.size} |\n| Bbox candidates | ${bboxCandidates} |\n| Geometry-confirmed edges | ${edges.length} |\n| Average degree | ${output.stats.averageDegree.toFixed(2)} |\n| Maximum degree | ${maxDegree} |\n| Connected components | ${output.stats.connectedComponents} |\n\n` +
    `Neighbor margin: ${NEIGHBOR_MARGIN} viewBox units (${(100 * NEIGHBOR_MARGIN / viewBox.width).toFixed(3)}% of width); raster: ${RASTER_SCALE}×; transparent-pixel threshold: ${ALPHA_THRESHOLD}; horizontal wrap: enabled. Bboxes only prefilter; dilated filled pixels confirm edges. One complete path is one vertex, including all its evenodd subpaths.\n\n` +
    `## Palette usage\n\n| HEX | Paths |\n|---|---:|\n${PALETTE.map((color) => `| ${color} | ${colorCounts[color]} |`).join("\n")}\n\n` +
    `## Conflicts\n\nDesired OKLab distance: ≥ ${COLOR_DISTANCE_THRESHOLD}. Exact-color neighbor edges: **${same.length}**. Too-close neighbor edges (including exact): **${close.length}**. Vertices incident to a conflict: **${conflictKeys.size}**. Locally palette-limited conflict vertices (every available color is too close to at least one currently colored neighbor): **${paletteShortage.length}**. This is a local diagnostic, not a proof that the graph cannot be recolored globally.\n\n` +
    `### Locally palette-limited vertices\n\n${paletteShortage.map((p) => `- \`${p.instanceKey}\` (${degree(p.instanceKey)} neighbors)`).join("\n") || "None."}\n\n` +
    `### Exact-color edges\n\n${same.map(([a, b]) => `- \`${a}\` ↔ \`${b}\``).join("\n") || "None."}\n\n` +
    `### Too-close edges\n\n${close.map(([a, b]) => `- \`${a}\` (${colors.get(a)}) ↔ \`${b}\` (${colors.get(b)}): ${colorDistance(colors.get(a)!, colors.get(b)!).toFixed(4)}`).join("\n") || "None."}\n\n` +
    `## High-degree targets\n\n${highDegree.map((p) => `- ${degree(p.instanceKey)} neighbors: \`${p.instanceKey}\``).join("\n") || "None."}\n\n` +
    `## Giant bboxes (>¼ map width or >½ map height)\n\n| Index | ID | Instance key | Bbox W×H | M/m |\n|---:|---|---|---:|---:|\n${markdownRows(giant, () => true)}\n\n` +
    `## Compound paths with ≥5 subpaths\n\n| Index | ID | Instance key | Bbox W×H | M/m |\n|---:|---|---|---:|---:|\n${markdownRows(compound, () => true)}\n\n` +
    `## Duplicate IDs\n\n${duplicates.map(([id, list]) => `- **${id}**: ${list.map((record) => `\`${record.instanceKey}\` (index ${record.index})`).join("; ")}`).join("\n") || "None."}\n\n` +
    `## Excluded categories\n\n${[...new Set(output.excludedPaths.map((p) => p.category))].sort().map((category) => `- ${category}: ${output.excludedPaths.filter((p) => p.category === category).length}`).join("\n")}\n\n` +
    `## Limitations\n\nAdjacency is a raster approximation at ${RASTER_SCALE}× the source viewBox. Thin features and antialiasing may change a few edges. Bounding boxes of compound paths can be huge; filled-pixel refinement prevents bbox-only false edges. Filled shapes that geometrically overlap still create an edge even where a later path hides one of them. Overlaid continents remain visually present in the preview but are excluded from this graph. The source SVG is a sanitized API snapshot and may change in Storage.\n`;
  await mkdir(OUTPUT_DIR, { recursive: true });
  const jsonText = JSON.stringify(output, null, 2) + "\n";
  const htmlText = previewHtml(svg, svgSha256, records, colors, graph, conflictKeys);
  const files = [
    ["physic-map-colors.json", jsonText],
    ["physic-map-color-report.md", report],
    ["physic-map-color-preview.html", htmlText],
  ] as const;
  if (args.check) {
    for (const [name, expected] of files) {
      const actual = await readFile(path.join(OUTPUT_DIR, name), "utf8");
      if (actual !== expected) throw new Error(`Non-deterministic or stale output: ${name}`);
    }
  } else {
    for (const [name, content] of files) await writeFile(path.join(OUTPUT_DIR, name), content);
  }
  console.log(JSON.stringify({ svgSha256, ...output.stats, colorCounts, outputDir: OUTPUT_DIR,
    mode: args.check ? "verified" : "generated" }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
