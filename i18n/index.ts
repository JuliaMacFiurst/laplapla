import { ru } from "./ru";
import { he } from "./he";
import { en } from "./en";

export type Lang = "ru" | "he" | "en";

// Describe ONLY the SHAPE of the dictionary, not literal string values
type DictionaryShape = {
  home: {
    title: string;
    subtitle: string;
    sections: {
      cats: string;
      dogs: string;
      capybaras: string;
      parrots: string;
      raccoons: string;
      comingSoon: string;
    };
    cta: string;
  };

  about: {
    title: string;
    what: {
      title: string;
      preview: string;
      full: string;
    };
    forWho: {
      title: string;
      preview: string;
      full: string;
    };
    author: {
      title: string;
      preview: string;
      full: string;
      image?: "/images/about/my-photo.webp";
    };
    access: {
      title: string;
      preview: string;
      full: string;
    };
    language: {
      title: string;
      preview: string;
      full: string;
    };
    collaboration: {
      title: string;
      preview: string;
      full: string;
    };
  };
};

export const ABOUT_SECTIONS = [
  "what",
  "forWho",
  "author",
  "access",
  "language",
  "collaboration",
] as const;

export type AboutSectionKey = typeof ABOUT_SECTIONS[number];

export const dictionaries: Record<Lang, DictionaryShape> = {
  ru: ru as DictionaryShape,
  he: he as DictionaryShape,
  en: en as DictionaryShape,
};

