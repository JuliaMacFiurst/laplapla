import type { NextApiRequest, NextApiResponse } from "next";
import { resolveAdminAccess } from "@/lib/server/auth/adminAccess";
import {
  ensurePersistedSlidesByStoryId,
  loadStoryPersistenceTarget,
  resolveStorySlides,
} from "@/lib/server/mapPopup/persistence";
import { withApiHandler } from "@/utils/apiHandler";
import { applyApiGuard } from "@/utils/rateLimit";

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
  if (
    !applyApiGuard(req, res, {
      methods: ["POST"],
      limit: 30,
      windowMs: 60_000,
      maxBodyBytes: 8 * 1024,
      keyPrefix: "map-popup-content-slides",
    })
  ) {
    return;
  }

  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const { storyId } = req.body ?? {};

  const normalizedStoryId =
    typeof storyId === "number" || (typeof storyId === "string" && storyId.trim())
      ? storyId
      : null;

  if (normalizedStoryId == null) {
    return res.status(400).json({ error: "Invalid or missing storyId" });
  }

  const [adminAccess, storyTarget] = await Promise.all([
    resolveAdminAccess(req),
    loadStoryPersistenceTarget(normalizedStoryId),
  ]);
  const slides = adminAccess.isAdmin
    ? await ensurePersistedSlidesByStoryId(normalizedStoryId)
    : await resolveStorySlides(normalizedStoryId);

  console.info("[map-popup-content/slides] write attempt", {
    action: adminAccess.isAdmin ? "success" : "skipped",
    target_id: storyTarget?.target_id ?? null,
    isAdmin: adminAccess.isAdmin,
    timestamp: new Date().toISOString(),
  });

  return res.status(200).json({ ok: true, slidesCount: slides.length });
}

export default withApiHandler(
  {
    guard: {
      methods: ["POST"],
      maxBodyBytes: 8 * 1024,
      keyPrefix: "map-popup-content-slides",
    },
  },
  handler,
);
