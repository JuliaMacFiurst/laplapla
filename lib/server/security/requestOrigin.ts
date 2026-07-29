import type { NextApiRequest, NextApiResponse } from "next";

function isAllowedLocalOrigin(url: URL) {
  return (
    process.env.NODE_ENV !== "production" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1")
  );
}

export function isAllowedSameOriginRequest(req: NextApiRequest) {
  const origin = req.headers.origin;
  if (!origin) {
    return true;
  }

  try {
    const url = new URL(Array.isArray(origin) ? origin[0] || "" : origin);
    if (isAllowedLocalOrigin(url)) {
      return true;
    }

    return url.protocol === "https:" && url.hostname === "www.laplapla.com";
  } catch {
    return false;
  }
}

export function enforceSameOrigin(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (isAllowedSameOriginRequest(req)) {
    return true;
  }

  res.status(403).json({ error: "Forbidden" });
  return false;
}
