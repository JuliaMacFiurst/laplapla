import type { NextApiRequest, NextApiResponse } from "next";
import { buildLocalizedPublicPath, isLang } from "@/lib/i18n/routing";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const slug = typeof req.query.slug === "string" ? req.query.slug : "";
  const lang = isLang(req.query.lang) ? req.query.lang : "ru";

  if (!slug) {
    res.status(404).json({ error: "Recipe not found" });
    return;
  }

  res.redirect(307, buildLocalizedPublicPath(`/raccoons/kitchen/${encodeURIComponent(slug)}`, lang));
}
