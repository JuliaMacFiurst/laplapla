import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { sendDiscordErrorAlert } from "@/lib/monitoring/discordAlert";
import { sentryEnvironment } from "@/sentry.shared";
import { applyApiGuard } from "@/utils/rateLimit";

type ApiGuardOptions = {
  methods: string[];
  limit?: number;
  windowMs?: number;
  maxBodyBytes?: number;
  keyPrefix?: string;
};

type ApiHandlerOptions = {
  guard: ApiGuardOptions;
  cacheControl?: string;
  onError?: (error: unknown, req: NextApiRequest, res: NextApiResponse) => void | Promise<void>;
};

const SENSITIVE_QUERY_KEY_PATTERN = /token|auth|key/i;

function hasSentryDsn() {
  return Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);
}

function getErrorStatusCode(error: unknown): number | string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const candidate = error as { statusCode?: unknown; status?: unknown };

  if (typeof candidate.statusCode === "number" || typeof candidate.statusCode === "string") {
    return candidate.statusCode;
  }

  if (typeof candidate.status === "number" || typeof candidate.status === "string") {
    return candidate.status;
  }

  return null;
}

function sanitizeQuery(query: NextApiRequest["query"]): unknown {
  try {
    return JSON.parse(
      JSON.stringify(query, (key, value: unknown) => {
        if (key && SENSITIVE_QUERY_KEY_PATTERN.test(key)) {
          return "[FILTERED]";
        }

        return value;
      }),
    ) as unknown;
  } catch {
    return "[UNSERIALIZABLE_QUERY]";
  }
}

function setCacheControl(req: NextApiRequest, res: NextApiResponse, cacheControl?: string) {
  if (!cacheControl) {
    return;
  }

  if (req.method?.toUpperCase() === "GET") {
    res.setHeader("Cache-Control", cacheControl);
  }
}

function resolveGuardResult(
  req: NextApiRequest,
  res: NextApiResponse,
  guard: ApiGuardOptions,
) {
  if (typeof guard.limit === "number" && guard.limit > 0) {
    return applyApiGuard(req, res, {
      methods: guard.methods,
      limit: guard.limit,
      windowMs: guard.windowMs,
      maxBodyBytes: guard.maxBodyBytes,
      keyPrefix: guard.keyPrefix,
    });
  }

  const normalizedMethods = guard.methods.map((method) => method.toUpperCase());
  const requestMethod = req.method?.toUpperCase();

  if (!requestMethod || !normalizedMethods.includes(requestMethod)) {
    res.setHeader("Allow", normalizedMethods.join(", "));
    res.status(405).json({ error: "Method not allowed" });
    return false;
  }

  return true;
}

export function withApiHandler<T = unknown>(
  options: ApiHandlerOptions,
  handler: NextApiHandler<T>,
): NextApiHandler<T | { error: string }> {
  return async function wrappedHandler(
    req: NextApiRequest,
    res: NextApiResponse<T | { error: string }>,
  ) {
    if (!resolveGuardResult(req, res, options.guard)) {
      return;
    }

    setCacheControl(req, res, options.cacheControl);

    try {
      await handler(req, res);
    } catch (error) {
      if (hasSentryDsn()) {
        try {
          Sentry.captureException(error, {
            tags: {
              route: req.url || "api",
              method: req.method || "UNKNOWN",
              runtime: "server",
            },
            extra: {
              query: sanitizeQuery(req.query),
            },
          });
        } catch {
          // Keep API error handling unchanged even if Sentry capture fails.
        }
      }

      console.error(`[${req.url || "api"}] request failed`, error);

      if (options.onError) {
        await options.onError(error, req, res);
      }

      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }

      const status = Number(res.statusCode || getErrorStatusCode(error) || 500);
      if (Number.isFinite(status) && status >= 500) {
        await sendDiscordErrorAlert({
          title: error instanceof Error ? error.message : "Unknown server error",
          level: "error",
          route: req.url || "api",
          method: req.method || "UNKNOWN",
          runtime: "server",
          environment: sentryEnvironment || process.env.NODE_ENV || "unknown",
          statusCode: status,
        });
      }
    }
  };
}
