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

  it("allows only official PayPal origins required by the hosted checkout SDK", () => {
    expect(nextConfigSource).toContain('const paypalSources = ["https://*.paypal.com", "https://*.paypalobjects.com"]');
    expect(nextConfigSource).toContain('"script-src \'self\' \'unsafe-inline\' \'wasm-unsafe-eval\' " + paypalSources.join(" ")');
    expect(nextConfigSource).toContain('"frame-src \'self\' https://www.youtube.com https://www.youtube-nocookie.com " + paypalSources.join(" ")');
    expect(nextConfigSource).toContain('"form-action \'self\' " + paypalSources.join(" ")');
  });
});
