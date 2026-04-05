import type { NextApiRequest, NextApiResponse } from "next";
import { withApiHandler } from "@/utils/apiHandler";
import { ensurePersistedSlidesByStoryId } from "@/lib/server/mapPopup/persistence";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "8kb",
    },
  },
};

type PersistSlidesResponse =
  | {
      ok: true;
      slidesCount: number;
    }
  | { error: string };

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PersistSlidesResponse>,
) {
  const { storyId } = req.body ?? {};

  const normalizedStoryId =
    typeof storyId === "number" || (typeof storyId === "string" && storyId.trim())
      ? storyId
      : null;

  if (normalizedStoryId == null) {
    return res.status(400).json({ error: "Invalid or missing storyId" });
  }

  const slides = await ensurePersistedSlidesByStoryId(normalizedStoryId);
  return res.status(200).json({ ok: true, slidesCount: slides.length });
}

export default withApiHandler(
  {
    guard: {
      methods: ["POST"],
      limit: 15,
      maxBodyBytes: 8 * 1024,
      keyPrefix: "map-popup-content-slides",
    },
  },
  handler,
);
