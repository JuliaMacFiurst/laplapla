import type { NextApiRequest, NextApiResponse } from "next";
import {
  getRecipeAssetName,
  getRecipeStickerPackFileName,
  loadRecipeBySlug,
  loadRecipeRaccoonStickerUrls,
} from "@/lib/recipes";
import { createStoredZip } from "@/lib/zip";

const getExtension = (url: string, contentType: string | null) => {
  const pathname = (() => {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  })();
  const fromPath = pathname.match(/\.([a-z0-9]+)$/i)?.[1];
  if (fromPath) {
    return fromPath.toLowerCase();
  }

  if (contentType?.includes("png")) {
    return "png";
  }
  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) {
    return "jpg";
  }
  if (contentType?.includes("webp")) {
    return "webp";
  }
  return "png";
};

const sanitizeFileName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const slug = typeof req.query.slug === "string" ? req.query.slug : "";
  const recipe = await loadRecipeBySlug(slug, "ru");

  if (!recipe) {
    res.status(404).json({ error: "Recipe not found" });
    return;
  }

  const urls = await loadRecipeRaccoonStickerUrls(recipe);

  if (urls.length === 0) {
    res.status(404).json({ error: "Raccoon stickers not found" });
    return;
  }

  const files = await Promise.all(
    urls.map(async (url, index) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch sticker ${url}: ${response.status}`);
      }

      const data = new Uint8Array(await response.arrayBuffer());
      const contentType = response.headers.get("content-type");
      const extension = getExtension(url, contentType);
      const baseName = sanitizeFileName(getRecipeAssetName({ url })) || `raccoon-${index + 1}`;

      return {
        name: `${String(index + 1).padStart(2, "0")}-${baseName}.${extension}`,
        data,
      };
    }),
  );

  const zip = createStoredZip(files);
  const fileName = `${getRecipeStickerPackFileName(recipe)}.zip`;

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.setHeader("Content-Length", String(zip.byteLength));
  res.status(200).send(Buffer.from(zip));
}
