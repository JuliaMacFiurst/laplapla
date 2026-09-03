import { describe, expect, it } from "vitest";
import { buildGoogleSearchUrl, buildYouTubeSearchUrl } from "@/lib/parrots/externalSearchUrls";

describe("Parrot external search URLs", () => {
  it("builds a direct YouTube results URL with encoded special characters", () => {
    const url = new URL(buildYouTubeSearchUrl("Daft Punk House & Disco"));
    expect(url.hostname).toBe("www.youtube.com");
    expect(url.pathname).toBe("/results");
    expect(url.searchParams.get("search_query")).toBe("Daft Punk House & Disco");
    expect(url.hostname).not.toContain("google");
  });

  it("keeps Google searches on Google", () => {
    const url = new URL(buildGoogleSearchUrl("House & Jazz"));
    expect(url.hostname).toBe("www.google.com");
    expect(url.pathname).toBe("/search");
    expect(url.searchParams.get("q")).toBe("House & Jazz");
  });
});
