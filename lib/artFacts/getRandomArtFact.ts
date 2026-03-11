import { artFacts } from "@/content/dogs/artFacts";
import { artFactsByLang, artFactsRU } from "@/i18n/artFacts";
import type { Lang } from "@/i18n";

export const getRandomArtFact = (lang: Lang): string => {
  if (artFacts.length === 0) return "";

  const randomIndex = Math.floor(Math.random() * artFacts.length);
  const randomFactId = artFacts[randomIndex]?.id;

  if (!randomFactId) return "";

  const langFacts = artFactsByLang[lang] ?? artFactsRU;
  return langFacts[randomFactId] ?? artFactsRU[randomFactId] ?? "";
};
