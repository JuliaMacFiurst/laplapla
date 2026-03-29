import type { NextApiRequest, NextApiResponse } from "next";
import { getMapPopupContent } from "@/lib/server/mapPopup/getMapPopupContent";
import type { MapPopupContent, MapPopupType } from "@/types/mapPopup";

function isMapPopupType(value: string): value is MapPopupType {
  return [
    "country",
    "river",
    "sea",
    "physic",
    "flag",
    "animal",
    "culture",
    "weather",
    "food",
  ].includes(value);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MapPopupContent | { error: string }>,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const type = Array.isArray(req.query.type) ? req.query.type[0] : req.query.type;
  const targetId = Array.isArray(req.query.target_id) ? req.query.target_id[0] : req.query.target_id;
  const lang = Array.isArray(req.query.lang) ? req.query.lang[0] : req.query.lang;

  if (!type || !isMapPopupType(type)) {
    return res.status(400).json({ error: "Invalid or missing type" });
  }

  if (!targetId || typeof targetId !== "string") {
    return res.status(400).json({ error: "Invalid or missing target_id" });
  }

  try {
    const payload = await getMapPopupContent({
      type,
      targetId,
      lang: typeof lang === "string" && lang ? lang : "ru",
    });

    if (!payload) {
      return res.status(404).json({ error: "Popup content not found" });
    }

    return res.status(200).json(payload);
  } catch (error) {
    console.error("[/api/map-popup-content] failed", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
