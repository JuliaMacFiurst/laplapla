import type { StudioSticker, StudioStickerAnimationType } from "@/types/studio";

export function createStudioStickerId() {
  if (typeof globalThis !== "undefined" && typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `sticker-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function inferStickerAnimationType(url: string): StudioStickerAnimationType {
  const lower = url.split("?")[0]?.toLowerCase() ?? "";

  if (lower.endsWith(".png")) {
    return "apng";
  }

  if (lower.endsWith(".gif")) {
    return "gif";
  }

  if (lower.endsWith(".mp4") || lower.endsWith(".webm")) {
    return "video";
  }

  return "webp";
}

export function createStudioSticker(
  url: string,
  options: Partial<Pick<StudioSticker, "source" | "previewUrl" | "animationType" | "tags">> = {},
): StudioSticker {
  return {
    id: createStudioStickerId(),
    sourceUrl: url,
    previewUrl: options.previewUrl,
    source: options.source ?? "giphy",
    animationType: options.animationType ?? inferStickerAnimationType(url),
    x: 50,
    y: 48,
    width: 28,
    height: 28,
    rotation: 0,
    opacity: 1,
    zIndex: 1,
    visible: true,
    timing: {
      startMs: 0,
    },
    tags: options.tags,
  };
}
