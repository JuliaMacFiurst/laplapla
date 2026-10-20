import type { Lang } from "@/i18n";
import {
  QUEST_1_AUDIO_CDN_ORIGIN,
  QUEST_1_AUDIO_PATHS,
  QUEST_1_AUDIO_PREFIX,
  narrationRelativePath,
  type NarrationBlockId,
} from "./audioPaths";

export type { NarrationBlockId } from "./audioPaths";

const configuredBaseUrl = (
  process.env.NEXT_PUBLIC_QUEST_1_AUDIO_BASE_URL?.trim() || QUEST_1_AUDIO_CDN_ORIGIN
)
  .replace(/\/+$/, "")
  .replace(new RegExp(`/${QUEST_1_AUDIO_PREFIX.replaceAll("/", "\\/")}$`), "");

export const isQuest1NarrationEnabled =
  process.env.NEXT_PUBLIC_QUEST_1_AUDIO_ENABLED === "true";

export function isNarrationBlockId(value: string): value is NarrationBlockId {
  return Object.prototype.hasOwnProperty.call(QUEST_1_AUDIO_PATHS, value);
}

export function resolveQuest1NarrationUrl(blockId: NarrationBlockId, locale: Lang) {
  if (!isQuest1NarrationEnabled || !configuredBaseUrl) return null;

  return `${configuredBaseUrl}/${QUEST_1_AUDIO_PREFIX}/${narrationRelativePath(blockId, locale)}`;
}

export function hasNarrationLocale(blockId: NarrationBlockId, locale: Lang) {
  return Boolean(narrationRelativePath(blockId, locale));
}

export function compareNarrationBlocks(left: NarrationBlockId, right: NarrationBlockId) {
  return QUEST_1_AUDIO_PATHS[left].order - QUEST_1_AUDIO_PATHS[right].order;
}

export const QUEST_1_NARRATION_BLOCK_COUNT = Object.keys(QUEST_1_AUDIO_PATHS).length;
