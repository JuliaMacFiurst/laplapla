import { afterEach, describe, expect, it, vi } from "vitest";

import { searchImgflip } from "../lib/server/memes/providers/imgflip";

const mockImgflipTemplates = [
  {
    id: "181913649",
    name: "Drake Hotline Bling",
    url: "https://i.imgflip.com/30b1gx.jpg",
    width: 1200,
    height: 1200,
    box_count: 2,
  },
  {
    id: "112126428",
    name: "Distracted Boyfriend",
    url: "https://i.imgflip.com/1ur9b0.jpg",
    width: 1200,
    height: 800,
    box_count: 3,
  },
];

function stubImgflipFetch() {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
    success: true,
    data: { memes: mockImgflipTemplates },
  }))));
}

describe("Imgflip meme provider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("matches meaningful query terms instead of requiring the full phrase", async () => {
    stubImgflipFetch();

    const items = await searchImgflip({
      query: "drake meme",
      limit: 10,
      offset: 0,
      lang: "en",
      types: ["image"],
    });

    expect(items.map((item) => item.providerId)).toContain("181913649");
  });

  it("returns popular templates for generic meme searches", async () => {
    stubImgflipFetch();

    const items = await searchImgflip({
      query: "funny meme",
      limit: 10,
      offset: 0,
      lang: "en",
      types: ["image"],
    });

    expect(items).toHaveLength(2);
    expect(items.map((item) => item.provider)).toEqual(["imgflip", "imgflip"]);
  });
});
