import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const nextConfigSource = fs.readFileSync(path.join(process.cwd(), "next.config.js"), "utf8");

describe("production Content-Security-Policy", () => {
  it("allows Fetch API connections to the LapLapLa media origin", () => {
    expect(nextConfigSource).toContain('"https://media.laplapla.com"');
    expect(nextConfigSource).toContain('"connect-src " + connectSrc.join(" ")');
  });

  it("keeps HTTPS audio playback allowed by media-src", () => {
    expect(nextConfigSource).toContain("media-src 'self' data: blob: https:");
  });
});
