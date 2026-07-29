import { describe, expect, it, vi } from "vitest";
import {
  loadMapPopupContent,
  parseRetryAfterMs,
} from "@/lib/mapPopup/client";

describe("map popup client", () => {
  it("parses Retry-After seconds and caps excessive delays", () => {
    expect(parseRetryAfterMs("3")).toBe(3_000);
    expect(parseRetryAfterMs("600")).toBe(60_000);
    expect(parseRetryAfterMs("invalid")).toBeNull();
  });

  it("returns null for missing popup content", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 404 }));
    await expect(
      loadMapPopupContent("river", "amazon", "ru", fetcher),
    ).resolves.toBeNull();
  });

  it("exposes a bounded retry delay for 429 without retrying internally", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: "Too many requests" }), {
          status: 429,
          headers: { "Retry-After": "4" },
        }),
    );

    await expect(
      loadMapPopupContent("river", "amazon", "ru", fetcher),
    ).rejects.toMatchObject({
      status: 429,
      retryAfterMs: 4_000,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("keeps type, entity and language in the request URL", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        storyId: null,
        type: "river",
        targetId: "rio grande",
        lang: "he",
        rawContent: null,
        title: null,
        googleMapsUrl: null,
        slides: [],
        video: null,
        source: "map_story_slides",
      }),
    );

    await loadMapPopupContent("river", "rio grande", "he", fetcher);

    expect(fetcher).toHaveBeenCalledWith(
      "/api/map-popup-content?type=river&target_id=rio%20grande&lang=he",
    );
  });
});
