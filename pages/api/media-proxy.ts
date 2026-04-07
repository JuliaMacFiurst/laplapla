import type { NextApiRequest, NextApiResponse } from "next";
import { Readable, Transform } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { pipeline } from "node:stream/promises";
import { withApiHandler } from "@/utils/apiHandler";
import { applyApiGuard } from "@/utils/rateLimit";

const ALLOWED_HOSTS = new Set([
  "images.pexels.com",
  "pexels.com",
  "media.giphy.com",
  "giphy.com",
  "upload.wikimedia.org",
]);

const FETCH_TIMEOUT_MS = 7_000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const ROUTE = "/api/media-proxy";

export const config = {
  api: {
    bodyParser: false,
  },
};

class ResponseTooLargeError extends Error {
  constructor() {
    super("Upstream response exceeded size limit");
    this.name = "ResponseTooLargeError";
  }
}

function logBlocked(reason: string, url: string | null) {
  console.warn("[media-proxy] blocked", { reason, url });
}

function logApi(status: number, startedAt: number) {
  console.log("[API]", {
    route: ROUTE,
    status,
    duration: Date.now() - startedAt,
  });
}

function logApiError(error: unknown) {
  console.error("[API ERROR]", {
    route: ROUTE,
    error: error instanceof Error ? error.message : "Unknown error",
  });
}

function getRawUrl(req: NextApiRequest) {
  const value = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
  return typeof value === "string" ? value.trim() : "";
}

function parseAllowedUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") {
      return { ok: false as const, reason: "invalid_protocol" };
    }

    if (!ALLOWED_HOSTS.has(parsed.hostname)) {
      return { ok: false as const, reason: "disallowed_host" };
    }

    return { ok: true as const, url: parsed.toString() };
  } catch {
    return { ok: false as const, reason: "invalid_url" };
  }
}

function createSizeLimitStream() {
  let totalBytes = 0;

  return new Transform({
    transform(chunk, _encoding, callback) {
      totalBytes += Buffer.byteLength(chunk);

      if (totalBytes > MAX_RESPONSE_BYTES) {
        callback(new ResponseTooLargeError());
        return;
      }

      callback(null, chunk);
    },
  });
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startedAt = Date.now();
  const rawUrl = getRawUrl(req) || null;

  if (req.method !== "GET") {
    logBlocked("method_not_allowed", rawUrl);
    res.setHeader("Allow", "GET");
    res.status(405).end("Method Not Allowed");
    logApi(res.statusCode, startedAt);
    return;
  }

  if (
    !applyApiGuard(req, res, {
      methods: ["GET"],
      limit: 30,
      windowMs: 60_000,
      keyPrefix: "media-proxy",
    })
  ) {
    logBlocked("rate_limited", rawUrl);
    logApi(res.statusCode, startedAt);
    return;
  }

  if (!rawUrl) {
    logBlocked("missing_url", null);
    res.status(400).end("Invalid media URL");
    logApi(res.statusCode, startedAt);
    return;
  }

  const parsedUrl = parseAllowedUrl(rawUrl);
  if (!parsedUrl.ok) {
    logBlocked(parsedUrl.reason, rawUrl);
    res.status(400).end("Invalid media URL");
    logApi(res.statusCode, startedAt);
    return;
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), FETCH_TIMEOUT_MS);

  try {
    const upstream = await fetch(parsedUrl.url, {
      method: "GET",
      signal: abortController.signal,
    });

    if (!upstream.ok && upstream.status !== 206) {
      throw new Error(`Upstream fetch failed with status ${upstream.status}`);
    }

    const contentLengthHeader = upstream.headers.get("content-length");
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : null;

    if (Number.isFinite(contentLength) && (contentLength as number) > MAX_RESPONSE_BYTES) {
      logBlocked("response_too_large", parsedUrl.url);
      res.status(413).end("Media too large");
      logApi(res.statusCode, startedAt);
      return;
    }

    const contentType = upstream.headers.get("content-type");
    const acceptRanges = upstream.headers.get("accept-ranges");
    const contentRange = upstream.headers.get("content-range");
    const cacheControl = upstream.headers.get("cache-control");

    if (contentType) res.setHeader("Content-Type", contentType);
    if (contentLengthHeader) res.setHeader("Content-Length", contentLengthHeader);
    if (acceptRanges) res.setHeader("Accept-Ranges", acceptRanges);
    if (contentRange) res.setHeader("Content-Range", contentRange);
    res.setHeader("Cache-Control", cacheControl || "public, max-age=3600, s-maxage=3600");
    res.status(upstream.status);

    if (!upstream.body) {
      res.end();
      logApi(res.statusCode, startedAt);
      return;
    }

    await pipeline(
      Readable.fromWeb(upstream.body as NodeReadableStream),
      createSizeLimitStream(),
      res,
    );
    logApi(res.statusCode, startedAt);
  } catch (error) {
    const errorCode = (error as { code?: string } | null)?.code;

    if (error instanceof ResponseTooLargeError) {
      logBlocked("response_too_large", parsedUrl.url);
      if (!res.headersSent) {
        res.status(413).end("Media too large");
        logApi(res.statusCode, startedAt);
      } else {
        res.destroy();
      }
      return;
    }

    if (errorCode === "ERR_STREAM_PREMATURE_CLOSE" || errorCode === "ERR_STREAM_UNABLE_TO_PIPE") {
      if (!res.writableEnded) {
        res.end();
      }
      return;
    }

    logApiError(error);
    console.error("[media-proxy] error", {
      message: error instanceof Error ? error.message : "Unknown error",
      url: parsedUrl.url,
    });

    if (!res.headersSent) {
      const isAbortError =
        error instanceof Error &&
        (error.name === "AbortError" || error.message.toLowerCase().includes("aborted"));

      res.status(isAbortError ? 504 : 502).end("Media proxy failed");
      logApi(res.statusCode, startedAt);
    } else {
      res.end();
    }
  } finally {
    clearTimeout(timeout);
  }
}

export default withApiHandler(
  {
    guard: {
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
      keyPrefix: "media-proxy",
    },
  },
  handler,
);
