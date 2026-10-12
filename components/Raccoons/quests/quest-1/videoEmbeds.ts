import type { Lang } from "@/i18n";

const DAY7_VIDEO_IDS: Record<Lang, string> = {
  ru: "sE2jxOVG8kU",
  en: "2rGcFyxn5rM",
  he: "2rGcFyxn5rM",
};

export function getQuestYoutubeEmbedUrl(videoId: string) {
  return `https://www.youtube-nocookie.com/embed/${videoId}?controls=1&playsinline=1`;
}

export function getDay7VideoEmbedUrl(locale: Lang) {
  return getQuestYoutubeEmbedUrl(DAY7_VIDEO_IDS[locale]);
}
