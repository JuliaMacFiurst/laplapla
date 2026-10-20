import type { QuestAssetManifest } from "@/lib/shop/questAssets";

const AUDIO_BASE = "https://pub-90c38f7454e44f0eaba7a2cdd9030ee6.r2.dev/quests/sound-case-001/mini-games/wake-the-dune/audio";
const DEVELOPMENT_AUDIO_BASE = "/wake-the-dune-audio";

export type WakeTheDuneStemId =
  | "stem-01"
  | "stem-02"
  | "stem-03"
  | "stem-04"
  | "stem-05"
  | "stem-06"
  | "stem-07"
  | "stem-08";

export type WakeTheDuneAudioAssetId = WakeTheDuneStemId;

const audioAsset = <TId extends WakeTheDuneAudioAssetId>(id: TId, url: string) => ({
  id,
  kind: "audio" as const,
  source: { status: "external" as const, url },
});

export const WAKE_THE_DUNE_ASSET_MANIFEST = {
  questId: "sound-case-001",
  assets: {
    "stem-01": audioAsset("stem-01", `${AUDIO_BASE}/music/01-wake-the-dune-melody.mp3`),
    "stem-02": audioAsset("stem-02", `${AUDIO_BASE}/music/02-wake-the-dune-guitar-and-flute-main.mp3`),
    "stem-03": audioAsset("stem-03", `${AUDIO_BASE}/music/03-wake-the-dune-bass.mp3`),
    "stem-04": audioAsset("stem-04", `${AUDIO_BASE}/music/04-wake-the-dune-guitar-and-flute-additional.mp3`),
    "stem-05": audioAsset("stem-05", `${AUDIO_BASE}/music/05-wake-the-dune-drums.mp3`),
    "stem-06": audioAsset("stem-06", `${AUDIO_BASE}/music/06-wake-the-dune-drums-low.mp3`),
    "stem-07": audioAsset("stem-07", `${AUDIO_BASE}/music/07-wake-the-dune-fx-and-bass.mp3`),
    "stem-08": audioAsset("stem-08", `${AUDIO_BASE}/music/08-wake-the-dune-vocal.mp3`),
  },
} as const satisfies QuestAssetManifest<"sound-case-001", Record<WakeTheDuneAudioAssetId, ReturnType<typeof audioAsset>>>;

export const WAKE_THE_DUNE_STEM_ORDER = [
  "stem-01", "stem-02", "stem-03", "stem-04",
  "stem-05", "stem-06", "stem-07", "stem-08",
] as const satisfies readonly WakeTheDuneStemId[];

export function getWakeTheDuneAudioUrl(id: WakeTheDuneAudioAssetId): string {
  const canonicalUrl = WAKE_THE_DUNE_ASSET_MANIFEST.assets[id].source.url;
  if (process.env.NODE_ENV !== "development") return canonicalUrl;
  return canonicalUrl.replace(AUDIO_BASE, DEVELOPMENT_AUDIO_BASE);
}

/**
 * Audited 2026-09-28. This is the shared composition-pass duration. Individual
 * stems retain their decoded duration and stop naturally before this boundary
 * when their source file is shorter.
 */
export const WAKE_THE_DUNE_LOOP_DURATION_SECONDS = 174.28898;
export const WAKE_THE_DUNE_STEM_FADE_SECONDS = 1.75;
