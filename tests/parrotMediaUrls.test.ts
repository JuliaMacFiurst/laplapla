import { afterEach, describe, expect, it } from "vitest";
import { getParrotAudioUrl, getParrotStyleMediaUrl } from "../lib/parrotMediaUrls";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("parrot R2 media URLs", () => {
  it("does not throw when R2 public media origin is missing", () => {
    delete process.env.NEXT_PUBLIC_R2_MEDIA_URL;
    delete process.env.R2_PUBLIC_URL;

    expect(getParrotAudioUrl("parrots/example.mp3")).toBe("");
    expect(getParrotStyleMediaUrl("slides/example.webp")).toBe("");
  });

  it("builds encoded URLs from the configured origin", () => {
    process.env.NEXT_PUBLIC_R2_MEDIA_URL = "https://media.example.com/";
    delete process.env.R2_PUBLIC_URL;

    expect(getParrotAudioUrl("parrots/hello world.mp3")).toBe(
      "https://media.example.com/parrot-audio/parrots/hello%20world.mp3",
    );
  });
});
