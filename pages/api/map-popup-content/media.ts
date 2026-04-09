import type { NextApiRequest, NextApiResponse } from "next";
import { resolveAdminAccess } from "@/lib/server/auth/adminAccess";
import { withApiHandler } from "@/utils/apiHandler";
import { applyApiGuard } from "@/utils/rateLimit";
import {
  loadStoryPersistenceTarget,
  persistResolvedSlideMediaWithStatus,
} from "@/lib/server/mapPopup/persistence";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "12kb",
    },
  },
};

type PersistMediaResponse =
  | {
      ok: true;
      slide: {
        id?: string | number | null;
        story_id?: string | number | null;
        slide_order?: number | null;
        text?: string | null;
        image_url?: string | null;
        image_credit_line?: string | null;
      } | null;
    }
  | { error: string };

const ROUTE = "/api/map-popup-content/media";
const isDebugLogging = process.env.NODE_ENV !== "production";

function logApi(status: number, startedAt: number) {
  if (!isDebugLogging) {
    return;
  }

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

function isAllowedImageUrl(value: string) {
  return /^https?:\/\//i.test(value) || value.startsWith("/supabase-storage/");
}

function setPersistenceHeaders(
  res: NextApiResponse,
  {
    action,
    isAdmin,
    writeState,
  }: {
    action: "success" | "skipped" | "error";
    isAdmin: boolean;
    writeState: "saved" | "updated" | "error" | "skipped";
  },
) {
  res.setHeader("X-Map-Popup-Media-Action", action);
  res.setHeader("X-Map-Popup-Media-Is-Admin", isAdmin ? "1" : "0");
  res.setHeader("X-Map-Popup-Media-Write-State", writeState);
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PersistMediaResponse>,
) {
  const startedAt = Date.now();

  if (
    !applyApiGuard(req, res, {
      methods: ["POST"],
      limit: 30,
      windowMs: 60_000,
      maxBodyBytes: 12 * 1024,
      keyPrefix: "map-popup-content-media",
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

  const { storyId, slideId, slideOrder, slideText, imageUrl, imageCreditLine } = req.body ?? {};

  const normalizedStoryId =
    typeof storyId === "number" || (typeof storyId === "string" && storyId.trim())
      ? storyId
      : null;
  const normalizedSlideId = typeof slideId === "string" && slideId.trim() ? slideId.trim() : null;
  const normalizedSlideOrder = typeof slideOrder === "number"
    ? slideOrder
    : typeof slideOrder === "string" && slideOrder.trim()
      ? Number(slideOrder)
      : null;
  const normalizedSlideText = typeof slideText === "string" && slideText.trim()
    ? slideText.trim()
    : null;
  const normalizedImageUrl = typeof imageUrl === "string" ? imageUrl.trim() : "";
  const normalizedCreditLine =
    typeof imageCreditLine === "string" && imageCreditLine.trim()
      ? imageCreditLine.trim()
      : null;

  if (normalizedStoryId == null) {
    res.status(400).json({ error: "Invalid or missing storyId" });
    logApi(res.statusCode, startedAt);
    return;
  }

  if (!normalizedSlideId && !Number.isFinite(normalizedSlideOrder)) {
    res.status(400).json({ error: "Invalid or missing slide reference" });
    logApi(res.statusCode, startedAt);
    return;
  }

  if (!normalizedImageUrl || !isAllowedImageUrl(normalizedImageUrl)) {
    res.status(400).json({ error: "Invalid or missing imageUrl" });
    logApi(res.statusCode, startedAt);
    return;
  }

  const adminAccess = await resolveAdminAccess(req);
  if (!adminAccess.isAdmin) {
    setPersistenceHeaders(res, {
      action: "error",
      isAdmin: false,
      writeState: "error",
    });
    res.status(403).json({ error: "Forbidden" });
    logApi(res.statusCode, startedAt);
    return;
  }

  const storyTarget = await loadStoryPersistenceTarget(normalizedStoryId);
  const timestamp = new Date().toISOString();

  const persistParams = {
    storyId: normalizedStoryId,
    slideId: normalizedSlideId,
    slideOrder: Number.isFinite(normalizedSlideOrder) ? normalizedSlideOrder : null,
    slideText: normalizedSlideText,
    imageUrl: normalizedImageUrl,
    imageCreditLine: normalizedCreditLine,
  };

  try {
    const persistenceResult = await persistResolvedSlideMediaWithStatus(persistParams);
    const slide = persistenceResult?.slide ?? null;
    const action = slide ? "success" : "error";

    if (isDebugLogging) {
      console.info("[map-popup-content/media] write attempt", {
        action,
        target_id: storyTarget?.target_id ?? null,
        story_id: slide?.story_id ?? normalizedStoryId,
        slide_id: normalizedSlideId,
        slide_order: Number.isFinite(normalizedSlideOrder) ? normalizedSlideOrder : null,
        image_url: slide?.image_url ?? null,
        reason: persistenceResult?.reason ?? null,
        match_source: persistenceResult?.matchSource ?? null,
        isAdmin: adminAccess.isAdmin,
        timestamp,
      });
    }

    if (!slide) {
      setPersistenceHeaders(res, {
        action: "error",
        isAdmin: true,
        writeState: "error",
      });
      res.status(500).json({ error: "Failed to persist media" });
      logApi(res.statusCode, startedAt);
      return;
    }

    setPersistenceHeaders(res, {
      action,
      isAdmin: true,
      writeState: persistenceResult?.writeState ?? "error",
    });
    res.status(200).json({ ok: true, slide });
    logApi(res.statusCode, startedAt);
    return;
  } catch (error) {
    logApiError(error);
    if (isDebugLogging) {
      console.error("[map-popup-content/media] write failed", {
        target_id: storyTarget?.target_id ?? null,
        slide_id: normalizedSlideId,
        slide_order: Number.isFinite(normalizedSlideOrder) ? normalizedSlideOrder : null,
        code: (error as { code?: string } | null)?.code ?? null,
        message: error instanceof Error ? error.message : "Unknown error",
        isAdmin: adminAccess.isAdmin,
        timestamp,
      });
    }

    setPersistenceHeaders(res, {
      action: "error",
      isAdmin: adminAccess.isAdmin,
      writeState: "error",
    });
    throw error;
  }
}

export default withApiHandler(
  {
    guard: {
      methods: ["POST"],
      maxBodyBytes: 12 * 1024,
      keyPrefix: "map-popup-content-media",
    },
  },
  handler,
);
