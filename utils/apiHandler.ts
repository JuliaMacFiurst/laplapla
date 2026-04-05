import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
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
  onError?: (error: unknown, req: NextApiRequest, res: NextApiResponse) => void;
};

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
      if (options.onError) {
        options.onError(error, req, res);
        return;
      }

      console.error(`[${req.url || "api"}] request failed`, error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  };
}
