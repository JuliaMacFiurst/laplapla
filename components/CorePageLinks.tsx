import Link from "next/link";

import type { Lang } from "@/i18n";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";

export type CorePageKey = "home" | "cats" | "dog" | "book" | "parrots" | "raccoons";

const CORE_PAGE_PATHS: Record<CorePageKey, string> = {
  home: "/",
  cats: "/cats",
  dog: "/dog",
  book: "/books/kladbishenskaya-kniga",
  parrots: "/parrots",
  raccoons: "/raccoons",
};

const CORE_PAGE_LABELS: Record<Lang, Record<CorePageKey, string>> = {
  ru: {
    home: "Главная LapLapLa",
    cats: "Котики объяснят",
    dog: "Пёсики нарисуют",
    book: "Кладбищенская книга",
    parrots: "Попугайчики поют",
    raccoons: "Енотики найдут",
  },
  en: {
    home: "LapLapLa Home",
    cats: "Cats Explain",
    dog: "Dogs Draw",
    book: "The Graveyard Book",
    parrots: "Parrots Sing",
    raccoons: "Raccoons Explore",
  },
  he: {
    home: "דף הבית של LapLapLa",
    cats: "חתולים מסבירים",
    dog: "כלבלבים מציירים",
    book: "ספר בית הקברות",
    parrots: "תוכונים שרים",
    raccoons: "דביבונים חוקרים",
  },
};

const NAV_LABELS: Record<Lang, string> = {
  ru: "Основные разделы LapLapLa",
  en: "LapLapLa core sections",
  he: "העמודים הראשיים של LapLapLa",
};

type CorePageLinksProps = {
  current: CorePageKey;
  lang: Lang;
  related: CorePageKey[];
};

export default function CorePageLinks({ current, lang, related }: CorePageLinksProps) {
  const labels = CORE_PAGE_LABELS[lang];
  const uniqueKeys = Array.from(new Set(["home", ...related])).filter((key) => key !== current) as CorePageKey[];

  return (
    <nav
      aria-label={NAV_LABELS[lang]}
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.75rem",
        margin: "1rem 0 1.25rem",
      }}
    >
      {uniqueKeys.map((key) => (
        <Link
          key={key}
          href={buildLocalizedPublicPath(CORE_PAGE_PATHS[key], lang)}
          style={{
            color: "#0b5fff",
            textDecoration: "underline",
            textUnderlineOffset: "0.2em",
          }}
        >
          {labels[key]}
        </Link>
      ))}
    </nav>
  );
}
