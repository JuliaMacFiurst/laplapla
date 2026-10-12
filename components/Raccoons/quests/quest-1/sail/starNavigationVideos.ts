import type { Lang } from "@/i18n";
import { getQuestYoutubeEmbedUrl } from "../videoEmbeds";

const navigationVideos: Record<Lang, string | null> = {
  ru: "CWf0_sdJOJI",
  en: "4DlNhbkPiYY",
  he: "rfotY1iZ6o8",
};

export function getStarNavigationVideoId(lang: Lang) {
  return navigationVideos[lang];
}

export function getStarNavigationVideoEmbedUrl(lang: Lang) {
  const id = getStarNavigationVideoId(lang);
  return id ? getQuestYoutubeEmbedUrl(id) : null;
}
