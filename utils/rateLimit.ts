import type { NextApiRequest, NextApiResponse } from "next";
import { createHash } from "node:crypto";

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

function getDistributedRateLimitConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/+$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

function hashRateLimitIdentity(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

const DISTRIBUTED_RATE_LIMIT_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return { current, ttl }
`;

export async function applyDistributedApiGuard(
  req: NextApiRequest,
  res: NextApiResponse,
  {
    limit,
    windowMs = DEFAULT_WINDOW_MS,
    keyPrefix = "api",
  }: Pick<RouteGuardOptions, "limit" | "windowMs" | "keyPrefix">,
) {
  const config = getDistributedRateLimitConfig();
  if (!config) {
    return true;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1_500);

  try {
    const key = `ratelimit:${keyPrefix}:${hashRateLimitIdentity(getClientIp(req))}`;
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        "EVAL",
        DISTRIBUTED_RATE_LIMIT_SCRIPT,
        "1",
        key,
        String(windowMs),
      ]),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error("Distributed rate limit request failed");
    }

    const payload = await response.json() as { result?: [number, number] };
    const count = Number(payload.result?.[0]);
    const ttlMs = Math.max(1, Number(payload.result?.[1]) || windowMs);
    const resetAt = Date.now() + ttlMs;

    res.setHeader("X-RateLimit-Limit", String(limit));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, limit - count)));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));

    if (count > limit) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil(ttlMs / 1000))));
      res.status(429).json({ error: "Too many requests" });
      return false;
    }

    return true;
  } catch {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[rate-limit] distributed store unavailable; using local guard");
    }
    return true;
  } finally {
    clearTimeout(timeout);
  }
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
