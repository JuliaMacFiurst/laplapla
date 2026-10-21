import type { NextApiRequest, NextApiResponse } from "next";
import { classifyOriginHost } from "@/lib/runtime/originMode";

export function requireWebCommerceOrigin(req: NextApiRequest, res: NextApiResponse): boolean {
  if (classifyOriginHost(req.headers.host, req.headers["x-forwarded-host"]) === "WEB") return true;
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.status(403).json({ ok: false, code: "unavailable" });
  return false;
}
