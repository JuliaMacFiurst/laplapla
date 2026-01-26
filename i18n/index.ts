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
      text: string;
    };
    forWho: {
      title: string;
      text: string;
    };
    author: {
      title: string;
      text: string;
    };
    access: {
      title: string;
      text: string;
    };
    language: {
      title: string;
      text: string;
    };
  };
};

export const dictionaries: Record<Lang, DictionaryShape> = {
  ru,
  he,
  en,
};