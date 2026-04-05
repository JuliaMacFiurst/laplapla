import type { NextApiRequest, NextApiResponse } from "next";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RouteGuardOptions = {
  methods: string[];
  limit: number;
  windowMs?: number;
  maxBodyBytes?: number;
  keyPrefix?: string;
};

const DEFAULT_WINDOW_MS = 60_000;
const rateLimitStore = new Map<string, RateLimitEntry>();

function cleanupRateLimitStore(now: number) {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

function getClientIp(req: NextApiRequest) {
  const forwardedFor = req.headers["x-forwarded-for"];
  const firstForwardedIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(",")[0];

  return (
    firstForwardedIp?.trim() ||
    req.headers["x-real-ip"]?.toString().trim() ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

function getBodySizeBytes(req: NextApiRequest) {
  const contentLengthHeader = req.headers["content-length"];
  const contentLength = Array.isArray(contentLengthHeader)
    ? Number(contentLengthHeader[0])
    : Number(contentLengthHeader);

  if (Number.isFinite(contentLength) && contentLength > 0) {
    return contentLength;
  }

  if (req.body == null) {
    return 0;
  }

  if (typeof req.body === "string") {
    return Buffer.byteLength(req.body);
  }

  return Buffer.byteLength(JSON.stringify(req.body));
}

export function applyApiGuard(
  req: NextApiRequest,
  res: NextApiResponse,
  {
    methods,
    limit,
    windowMs = DEFAULT_WINDOW_MS,
    maxBodyBytes,
    keyPrefix = "api",
  }: RouteGuardOptions,
) {
  const normalizedMethods = methods.map((method) => method.toUpperCase());
  const requestMethod = req.method?.toUpperCase();

  if (!requestMethod || !normalizedMethods.includes(requestMethod)) {
    res.setHeader("Allow", normalizedMethods.join(", "));
    res.status(405).json({ error: "Method not allowed" });
    return false;
  }

  if (typeof maxBodyBytes === "number" && maxBodyBytes > 0) {
    const bodySizeBytes = getBodySizeBytes(req);
    if (bodySizeBytes > maxBodyBytes) {
      res.status(413).json({ error: "Request body is too large" });
      return false;
    }
  }

  const now = Date.now();
  cleanupRateLimitStore(now);

  const ip = getClientIp(req);
  const routeKey = `${keyPrefix}:${ip}`;
  const existingEntry = rateLimitStore.get(routeKey);

  if (!existingEntry || existingEntry.resetAt <= now) {
    const resetAt = now + windowMs;
    rateLimitStore.set(routeKey, {
      count: 1,
      resetAt,
    });

    res.setHeader("X-RateLimit-Limit", String(limit));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, limit - 1)));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
    return true;
  }

  if (existingEntry.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existingEntry.resetAt - now) / 1000));
    res.setHeader("Retry-After", String(retryAfterSeconds));
    res.setHeader("X-RateLimit-Limit", String(limit));
    res.setHeader("X-RateLimit-Remaining", "0");
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(existingEntry.resetAt / 1000)));
    res.status(429).json({ error: "Too many requests" });
    return false;
  }

  existingEntry.count += 1;
  rateLimitStore.set(routeKey, existingEntry);

  res.setHeader("X-RateLimit-Limit", String(limit));
  res.setHeader("X-RateLimit-Remaining", String(Math.max(0, limit - existingEntry.count)));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(existingEntry.resetAt / 1000)));
  return true;
}
