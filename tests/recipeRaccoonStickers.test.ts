import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  getRecipeRaccoonStickerPrefix,
  isRaccoonStickerObjectKey,
} from "@/lib/recipeStickerObjects";

describe("recipe raccoon sticker R2 selection", () => {
  it.each([
    "stickers/raccoon-stickers/set/raccoon-01.png",
    "stickers/raccoon-stickers/set/01.png",
    "stickers/raccoon-stickers/set/chef.png",
    "stickers/raccoon-stickers/set/sticker.webp",
    "stickers/raccoon-stickers/set/legacy.jpg",
    "stickers/raccoon-stickers/set/legacy.jpeg",
  ])("includes supported sticker image %s", (key) => {
    expect(isRaccoonStickerObjectKey(key)).toBe(true);
  });

  it.each([
    "stickers/raccoon-stickers/set/source.webp",
    "stickers/raccoon-stickers/set/metadata.json",
    "stickers/raccoon-stickers/set/sticker-pack.zip",
    "stickers/raccoon-stickers/set/.hidden.png",
    "stickers/raccoon-stickers/set/",
  ])("excludes source and non-image object %s", (key) => {
    expect(isRaccoonStickerObjectKey(key)).toBe(false);
  });

  it("builds the specialized prefix from sticker_set_key", () => {
    expect(getRecipeRaccoonStickerPrefix(" karelian-kalitki ")).toBe(
      "stickers/raccoon-stickers/karelian-kalitki/",
    );
  });

  it("keeps shared loader ownership for gallery fallback and ZIP download", async () => {
    const [recipeSource, pageSource, zipSource] = await Promise.all([
      readFile(new URL("../lib/recipes.ts", import.meta.url), "utf8"),
      readFile(new URL("../pages/raccoons/kitchen/[slug].tsx", import.meta.url), "utf8"),
      readFile(new URL("../pages/api/recipes/[slug]/raccoon-stickers.ts", import.meta.url), "utf8"),
    ]);

    expect(recipeSource).toMatch(/return urls\.length > 0 \? urls : fallbackUrls/);
    expect(pageSource).toMatch(/const stickerUrls = await loadRecipeRaccoonStickerUrls\(recipe\)/);
    expect(pageSource).toMatch(/const raccoonImages = stickerUrls\.length > 0 \? stickerUrls : getRecipeRaccoonImages\(recipe\)/);
    expect(pageSource).toMatch(/raccoonImages\.map/);
    expect(zipSource).toMatch(/const urls = await loadRecipeRaccoonStickerUrls\(recipe\)/);
  });
});
