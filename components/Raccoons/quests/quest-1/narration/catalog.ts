import manifest from "@/docs/production/svalbard-audio-v1/manifest.json";
import type { Lang } from "@/i18n";

export type NarrationBlockId = (typeof manifest.blocks)[number]["id"];

const blocksById = new Map(manifest.blocks.map((block) => [block.id, block]));

const configuredBaseUrl = process.env.NEXT_PUBLIC_QUEST_1_AUDIO_BASE_URL?.trim().replace(/\/+$/, "");

export const isQuest1NarrationEnabled =
  process.env.NEXT_PUBLIC_QUEST_1_AUDIO_ENABLED === "true" && Boolean(configuredBaseUrl);

export function isNarrationBlockId(value: string): value is NarrationBlockId {
  return blocksById.has(value);
}

export function resolveQuest1NarrationUrl(blockId: NarrationBlockId, locale: Lang) {
  if (!isQuest1NarrationEnabled || !configuredBaseUrl) return null;

  const relativePath = blocksById.get(blockId)?.audio[locale];
  if (!relativePath) return null;

  return `${configuredBaseUrl}/${manifest.delivery.productionObjectPrefix}/${relativePath}`;
}

export function hasNarrationLocale(blockId: NarrationBlockId, locale: Lang) {
  return Boolean(blocksById.get(blockId)?.audio[locale]);
}

export const QUEST_1_NARRATION_BLOCK_COUNT = manifest.blocks.length;
