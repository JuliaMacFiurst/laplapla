import type { NextApiRequest, NextApiResponse } from "next";
import { Readable } from "node:stream";

const ALLOWED_HOSTS = new Set([
  "images.pexels.com",
  "player.vimeo.com",
  "media.giphy.com",
  "media0.giphy.com",
  "media1.giphy.com",
  "media2.giphy.com",
  "media3.giphy.com",
  "media4.giphy.com",
  "i.giphy.com",
]);

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

function isAllowedRemote(url: string) {
  try {
    const parsed = new URL(url);
    return /^https?:$/i.test(parsed.protocol) && ALLOWED_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  const rawUrl = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
  if (typeof rawUrl !== "string" || !isAllowedRemote(rawUrl)) {
    return res.status(400).end("Invalid media URL");
  }

  try {
    const upstream = await fetch(rawUrl, {
      headers: req.headers.range ? { Range: req.headers.range } : undefined,
    });

    if (!upstream.ok && upstream.status !== 206) {
      return res.status(upstream.status).end("Failed to fetch media");
    }

    const contentType = upstream.headers.get("content-type");
    const contentLength = upstream.headers.get("content-length");
    const acceptRanges = upstream.headers.get("accept-ranges");
    const contentRange = upstream.headers.get("content-range");
    const cacheControl = upstream.headers.get("cache-control");

    if (contentType) res.setHeader("Content-Type", contentType);
    if (contentLength) res.setHeader("Content-Length", contentLength);
    if (acceptRanges) res.setHeader("Accept-Ranges", acceptRanges);
    if (contentRange) res.setHeader("Content-Range", contentRange);
    res.setHeader("Cache-Control", cacheControl || "public, max-age=3600, s-maxage=3600");
    res.status(upstream.status);

    if (!upstream.body) {
      return res.end();
    }

    Readable.fromWeb(upstream.body as any).pipe(res);
  } catch (error) {
    console.error("[/api/media-proxy] request failed", error);
    return res.status(502).end("Media proxy failed");
  }
}
