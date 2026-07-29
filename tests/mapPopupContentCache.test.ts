import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildMapPopupCacheKey,
  getCachedMapPopupContent,
  invalidateMapPopupContent,
  updateCachedMapPopupContent,
} from "@/lib/mapPopup/contentCache";
import type { MapPopupContent } from "@/types/mapPopup";

const content = {
  storyId: 1,
  type: "country",
  targetId: "brazil",
  lang: "ru",
  rawContent: null,
  title: null,
  googleMapsUrl: null,
  slides: [],
  video: null,
  source: "map_story_slides",
} satisfies MapPopupContent;

afterEach(() => {
  invalidateMapPopupContent();
});

describe("map popup content cache", () => {
  it("uses a stable locale/entity cache key", () => {
    expect(buildMapPopupCacheKey("country", "brazil", "ru")).toBe(
      "ru:country:brazil",
    );
    expect(buildMapPopupCacheKey("river", "amazon", "ru")).not.toBe(
      buildMapPopupCacheKey("river", "nile", "ru"),
    );
    expect(buildMapPopupCacheKey("river", "amazon", "ru")).not.toBe(
      buildMapPopupCacheKey("river", "amazon", "he"),
    );
  });

  it("deduplicates concurrent requests and reuses resolved content", async () => {
    const loader = vi.fn(async () => content);
    const key = buildMapPopupCacheKey("country", "brazil", "ru");

    const [first, second] = await Promise.all([
      getCachedMapPopupContent(key, loader, { now: 100 }),
      getCachedMapPopupContent(key, loader, { now: 100 }),
    ]);
    const third = await getCachedMapPopupContent(key, loader, { now: 101 });

    expect(first).toBe(content);
    expect(second).toBe(content);
    expect(third).toBe(content);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("deduplicates intent prefetch and click consumers for the same entity", async () => {
    let resolveLoader: ((value: MapPopupContent) => void) | undefined;
    const loader = vi.fn(
      () =>
        new Promise<MapPopupContent>((resolve) => {
          resolveLoader = resolve;
        }),
    );
    const key = buildMapPopupCacheKey("river", "amazon", "ru");

    const intentPrefetch = getCachedMapPopupContent(key, loader);
    const clickLoad = getCachedMapPopupContent(key, loader);
    resolveLoader?.({ ...content, type: "river", targetId: "amazon" });

    await expect(Promise.all([intentPrefetch, clickLoad])).resolves.toHaveLength(2);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("expires entries and does not retain failed requests", async () => {
    const key = buildMapPopupCacheKey("country", "brazil", "ru");
    const failedLoader = vi.fn(async () => {
      throw new Error("temporary failure");
    });

    await expect(
      getCachedMapPopupContent(key, failedLoader, { now: 100, ttlMs: 10 }),
    ).rejects.toThrow("temporary failure");

    const loader = vi.fn(async () => content);
    await getCachedMapPopupContent(key, loader, { now: 100, ttlMs: 10 });
    await getCachedMapPopupContent(key, loader, { now: 111, ttlMs: 10 });

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("updates resolved media in the shared popup cache", async () => {
    const key = buildMapPopupCacheKey("country", "brazil", "ru");
    await getCachedMapPopupContent(key, async () => ({
      ...content,
      slides: [{ id: "slide-1", index: 0, text: "Brazil", imageUrl: null }],
    }));

    updateCachedMapPopupContent(key, (cached) =>
      cached
        ? {
            ...cached,
            slides: cached.slides.map((slide) => ({
              ...slide,
              imageUrl: "https://cdn.example/brazil.webp",
            })),
          }
        : cached,
    );

    const loader = vi.fn(async () => null);
    const cached = await getCachedMapPopupContent(key, loader);

    expect(cached?.slides[0].imageUrl).toBe(
      "https://cdn.example/brazil.webp",
    );
    expect(loader).not.toHaveBeenCalled();
  });
});
