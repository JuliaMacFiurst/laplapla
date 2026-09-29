import type { Lang } from "@/i18n";
import type { QuestPersonalization } from "../../questPersonalization";
import { getLongEdgeBackSlot, type SoundCardSheetSlot } from "./soundCards";
import type { SoundCase001CollectibleAssetId } from "./assets";

export const SOUND_CASE_001_COLLECTIBLE_CARD_WIDTH_MM = 63;
export const SOUND_CASE_001_COLLECTIBLE_CARD_HEIGHT_MM = 88;
export const SOUND_CASE_001_COLLECTIBLES_PER_SHEET = 9;
export const SOUND_CASE_001_COLLECTIBLE_DUPLEX_MODE = "flip-long-edge" as const;
export const SOUND_CASE_001_COLLECTIBLE_HUB_QR_ASSET_PATH =
  "/quests/sound-case-001/collectible-cards/investigator-hub-qr.svg";

export type SoundCase001CollectibleHero = {
  id: `A${string}`;
  assetId: SoundCase001CollectibleAssetId;
  objectPosition: string;
};

export const SOUND_CASE_001_COLLECTIBLE_HEROES = [
  { id: "A01", assetId: "collectible-hero-01-sand-burping-bottle", objectPosition: "50% 46%" },
  { id: "A02", assetId: "collectible-hero-02-grandpa-midnight-fridge", objectPosition: "50% 42%" },
  { id: "A03", assetId: "collectible-hero-03-parrot-seismologist", objectPosition: "50% 42%" },
  { id: "A04", assetId: "collectible-hero-04-parrot-sand-studio", objectPosition: "50% 45%" },
  { id: "A05", assetId: "collectible-hero-05-capybara-expedition-shorts", objectPosition: "50% 42%" },
  { id: "A06", assetId: "collectible-hero-06-singing-sand-man", objectPosition: "50% 38%" },
  { id: "A07", assetId: "collectible-hero-07-chicken-vs-booming-dune", objectPosition: "50% 45%" },
  { id: "A08", assetId: "collectible-hero-08-meditating-fox-dune", objectPosition: "50% 42%" },
  { id: "A09", assetId: "collectible-hero-09-capybara-desert-trombone", objectPosition: "50% 43%" },
  { id: "A10", assetId: "collectible-hero-10-elephant-china-shop", objectPosition: "50% 45%" },
  { id: "A11", assetId: "collectible-hero-11-sand-grain-orchestra", objectPosition: "50% 46%" },
  { id: "A12", assetId: "collectible-hero-12-dune-recording-session", objectPosition: "50% 43%" },
] as const satisfies readonly SoundCase001CollectibleHero[];

export type SoundCase001CollectibleCard = {
  participantName: string;
  participantIndex: number;
  art: (typeof SOUND_CASE_001_COLLECTIBLE_HEROES)[number];
  titleIndex: number;
  variantCode: string;
  stats: readonly [number, number, number];
  frontSlot: SoundCardSheetSlot;
  backSlot: SoundCardSheetSlot;
};

const COLLECTIBLE_STAT_PATTERNS = [
  [5, 4, 5],
  [4, 5, 5],
  [5, 5, 4],
] as const;

function comparisonKey(name: string, locale: Lang): string {
  return name.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase(locale);
}

/** Lead is the primary player; participants are additional players in QuestBuilder. */
export function getSoundCase001CollectibleParticipants(
  personalization: Pick<QuestPersonalization, "leadName" | "participants" | "locale">,
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const rawName of [personalization.leadName, ...personalization.participants]) {
    const name = rawName.normalize("NFKC").replace(/\s+/g, " ").trim();
    if (!name) continue;
    const key = comparisonKey(name, personalization.locale);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

export function getSoundCase001CollectibleCards(
  personalization: Pick<QuestPersonalization, "leadName" | "participants" | "locale">,
): SoundCase001CollectibleCard[] {
  return getSoundCase001CollectibleParticipants(personalization).map((participantName, participantIndex) => {
    const artIndex = participantIndex % SOUND_CASE_001_COLLECTIBLE_HEROES.length;
    const titleIndex = (participantIndex * 5 + 2) % 12;
    const art = SOUND_CASE_001_COLLECTIBLE_HEROES[artIndex];
    const stats = COLLECTIBLE_STAT_PATTERNS[participantIndex % COLLECTIBLE_STAT_PATTERNS.length];
    const frontSlot = (participantIndex % SOUND_CASE_001_COLLECTIBLES_PER_SHEET) + 1 as SoundCardSheetSlot;
    return {
      participantName,
      participantIndex,
      art,
      titleIndex,
      variantCode: `SC001 · ${art.id} · T${String(titleIndex + 1).padStart(2, "0")}`,
      stats,
      frontSlot,
      backSlot: getLongEdgeBackSlot(frontSlot),
    };
  });
}

export function getSoundCase001CollectibleSheetCount(cardCount: number): number {
  return Math.ceil(cardCount / SOUND_CASE_001_COLLECTIBLES_PER_SHEET);
}

export function getSoundCase001CollectibleSheetCards(
  cards: readonly SoundCase001CollectibleCard[],
  sheetNumber: number,
): SoundCase001CollectibleCard[] {
  const start = (sheetNumber - 1) * SOUND_CASE_001_COLLECTIBLES_PER_SHEET;
  return cards.slice(start, start + SOUND_CASE_001_COLLECTIBLES_PER_SHEET);
}
