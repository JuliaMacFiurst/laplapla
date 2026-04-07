import type { NextApiRequest, NextApiResponse } from "next";
import { resolveAdminAccess } from "@/lib/server/auth/adminAccess";
import { withApiHandler } from "@/utils/apiHandler";
import {
  buildResolvedSlideMediaPreview,
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
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json({ error: "Invalid payload" });
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
    return res.status(400).json({ error: "Invalid or missing storyId" });
  }

  if (!normalizedSlideId && !Number.isFinite(normalizedSlideOrder)) {
    return res.status(400).json({ error: "Invalid or missing slide reference" });
  }

  if (!normalizedImageUrl || !isAllowedImageUrl(normalizedImageUrl)) {
    return res.status(400).json({ error: "Invalid or missing imageUrl" });
  }

  const [adminAccess, storyTarget] = await Promise.all([
    resolveAdminAccess(req),
    loadStoryPersistenceTarget(normalizedStoryId),
  ]);
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
    const persistenceResult = adminAccess.isAdmin
      ? await persistResolvedSlideMediaWithStatus(persistParams)
      : null;
    const slide = adminAccess.isAdmin
      ? persistenceResult?.slide ?? null
      : await buildResolvedSlideMediaPreview(persistParams);

    const action =
      adminAccess.isAdmin
        ? slide
          ? "success"
          : "error"
        : "skipped";

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

    if (adminAccess.isAdmin && !slide) {
      setPersistenceHeaders(res, {
        action: "error",
        isAdmin: true,
        writeState: "error",
      });
      return res.status(500).json({ error: "Failed to persist media" });
    }

    setPersistenceHeaders(res, {
      action,
      isAdmin: adminAccess.isAdmin,
      writeState: adminAccess.isAdmin
        ? persistenceResult?.writeState ?? "error"
        : "skipped",
    });
    return res.status(200).json({ ok: true, slide });
  } catch (error) {
    console.error("[map-popup-content/media] write failed", {
      target_id: storyTarget?.target_id ?? null,
      slide_id: normalizedSlideId,
      slide_order: Number.isFinite(normalizedSlideOrder) ? normalizedSlideOrder : null,
      code: (error as { code?: string } | null)?.code ?? null,
      message: error instanceof Error ? error.message : "Unknown error",
      isAdmin: adminAccess.isAdmin,
      timestamp,
    });

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
      limit: 120,
      windowMs: 60_000,
      maxBodyBytes: 12 * 1024,
      keyPrefix: "map-popup-content-media",
    },
  },
  handler,
);
