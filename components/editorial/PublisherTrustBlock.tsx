import Link from "next/link";
import type { Lang } from "@/i18n";
import { AUTHOR_NAME } from "@/lib/identity";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";
import { formatEditorialDate, type EditorialSource } from "@/lib/editorial/trust";
import styles from "./PublisherTrustBlock.module.css";

type Props = {
  lang: Lang;
  updatedAt?: string | null;
  sources?: EditorialSource[];
  aiAssisted?: boolean;
};

const COPY: Record<Lang, {
  heading: string;
  editor: string;
  updated: string;
  sources: string;
  methodology: string;
  aiAssisted: string;
}> = {
  ru: {
    heading: "Материал LapLapLa",
    editor: "Редактура для публикации",
    updated: "Обновлено",
    sources: "Источники",
    methodology: "Как мы создаём материалы",
    aiAssisted: "При подготовке могли использоваться AI-инструменты; публикация и редакционная ответственность остаются за LapLapLa.",
  },
  en: {
    heading: "LapLapLa material",
    editor: "Edited for publication",
    updated: "Updated",
    sources: "Sources",
    methodology: "How we create materials",
    aiAssisted: "AI tools may have assisted preparation; publication and editorial responsibility remain with LapLapLa.",
  },
  he: {
    heading: "תוכן של LapLapLa",
    editor: "נערך לקראת פרסום",
    updated: "עודכן",
    sources: "מקורות",
    methodology: "איך אנחנו יוצרים תכנים",
    aiAssisted: "ייתכן שנעשה שימוש בכלי בינה מלאכותית במהלך ההכנה; האחריות לפרסום ולעריכה נשארת בידי LapLapLa.",
  },
};

export default function PublisherTrustBlock({
  lang,
  updatedAt,
  sources = [],
  aiAssisted = false,
}: Props) {
  const copy = COPY[lang];
  const formattedDate = formatEditorialDate(updatedAt, lang);
  const authorHref = buildLocalizedPublicPath("/author", lang);
  const methodologyHref = buildLocalizedPublicPath("/about/editorial", lang);

  return (
    <footer className={styles.block} dir={lang === "he" ? "rtl" : "ltr"} data-publisher-trust>
      <p className={styles.heading}>{copy.heading}</p>
      <ul className={styles.details}>
        <li>
          {copy.editor}: <Link href={authorHref}>{AUTHOR_NAME}</Link>
        </li>
        {formattedDate ? <li>{copy.updated}: <time dateTime={updatedAt || undefined}>{formattedDate}</time></li> : null}
        <li><Link className={styles.methodology} href={methodologyHref}>{copy.methodology}</Link></li>
      </ul>
      {sources.length > 0 ? (
        <section className={styles.sourcesWrap} aria-label={copy.sources}>
          <p className={styles.sourcesLabel}>{copy.sources}</p>
          <ul className={styles.sources}>
            {sources.map((source) => (
              <li key={`${source.url || ""}:${source.title}`}>
                {source.url ? (
                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                    {source.title}
                  </a>
                ) : source.title}
                {source.publisher ? <span className={styles.sourcePublisher}> · {source.publisher}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {aiAssisted ? <p className={styles.aiNote}>{copy.aiAssisted}</p> : null}
    </footer>
  );
}
