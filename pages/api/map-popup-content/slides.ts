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

const ROUTE = "/api/map-popup-content/slides";

function logApi(status: number, startedAt: number) {
  console.log("[API]", {
    route: ROUTE,
    status,
    duration: Date.now() - startedAt,
  });
}

function logApiError(error: unknown) {
  console.error("[API ERROR]", {
    route: ROUTE,
    error: error instanceof Error ? error.message : "Unknown error",
  });
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PersistSlidesResponse>,
) {
  const startedAt = Date.now();

  if (
    !applyApiGuard(req, res, {
      methods: ["POST"],
      limit: 30,
      windowMs: 60_000,
      maxBodyBytes: 8 * 1024,
      keyPrefix: "map-popup-content-slides",
    })
  ) {
    logApi(res.statusCode, startedAt);
    return;
  }

  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    res.status(400).json({ error: "Invalid payload" });
    logApi(res.statusCode, startedAt);
    return;
  }

  const { storyId } = req.body ?? {};

  const normalizedStoryId =
    typeof storyId === "number" || (typeof storyId === "string" && storyId.trim())
      ? storyId
      : null;

  if (normalizedStoryId == null) {
    res.status(400).json({ error: "Invalid or missing storyId" });
    logApi(res.statusCode, startedAt);
    return;
  }

  try {
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

    res.status(200).json({ ok: true, slidesCount: slides.length });
    logApi(res.statusCode, startedAt);
    return;
  } catch (error) {
    logApiError(error);
    throw error;
  }
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
