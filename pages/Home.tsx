import { useMemo } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

import { dictionaries, type Lang } from "../i18n";
import { VideoSection } from "../components/video/VideoSection";
import { buildLocalizedQuery, getCurrentLang } from "@/lib/i18n/routing";

const DEFAULT_SITE_URL = "https://laplapla.com";

const HOME_SEO: Record<Lang, { title: string; description: string; ogDescription: string }> = {
  ru: {
    title: "LapLapLa — интерактивные истории и карты для детей",
    description: "Изучай страны, книги и мир через интерактивные истории. Обучение через игру для детей.",
    ogDescription: "Интерактивные истории, карты и обучение для детей",
  },
  en: {
    title: "LapLapLa — interactive stories and maps for kids",
    description: "Explore countries, books, and the world through interactive stories. Play-based learning for kids.",
    ogDescription: "Interactive stories, maps, and learning for kids",
  },
  he: {
    title: "LapLapLa — סיפורים ומפות אינטראקטיביים לילדים",
    description: "לומדים על מדינות, ספרים והעולם דרך סיפורים אינטראקטיביים. למידה דרך משחק לילדים.",
    ogDescription: "סיפורים אינטראקטיביים, מפות ולמידה לילדים",
  },
};

export default function Home({ lang }: { lang?: Lang }) {
  const router = useRouter();
  const resolvedLang = lang ?? getCurrentLang(router);

  const t = useMemo(() => dictionaries[resolvedLang].home, [resolvedLang]);
  const seo = HOME_SEO[resolvedLang];
  const siteUrl = (process.env["NEXT_PUBLIC_SITE_URL"] || DEFAULT_SITE_URL).replace(/\/+$/, "") || DEFAULT_SITE_URL;
  const homeUrl = `${siteUrl}${router.asPath ? router.asPath.split("#")[0] : ""}`;

  // Optional: set RTL for Hebrew without touching global layout yet
  const dir = resolvedLang === "he" ? "rtl" : "ltr";

  return (
    <>
      <Head>
        <title key="title">{seo.title}</title>
        <meta key="description" name="description" content={seo.description} />
        <meta key="og:title" property="og:title" content="LapLapLa" />
        <meta key="og:description" property="og:description" content={seo.ogDescription} />
        <meta key="og:url" property="og:url" content={homeUrl || siteUrl} />
      </Head>
      <div className="home-wrapper" dir={dir}>
        <header className="site-header">
          {/*
          <img
            src="/laplapla-logo.webp"
            alt={t.title}
            className="site-logo"
          />
          */}
          <div className="header-text">
            <h1 className="page-title">{t.title}</h1>
            <h2 className="page-subtitle">{t.subtitle}</h2>
          </div>
        </header>

        <div className="grid">
          <div
            className="card"
            onClick={() =>
              router.push(
                { pathname: "/cats", query: buildLocalizedQuery(resolvedLang) },
                undefined,
                { locale: resolvedLang },
              )
            }
          >
            <img src="/images/cat.webp" alt={t.sections.cats} />
            <div className="label">{t.sections.cats}</div>
          </div>

          <div
            className="card"
            onClick={() =>
              router.push(
                { pathname: "/dog", query: buildLocalizedQuery(resolvedLang) },
                undefined,
                { locale: resolvedLang },
              )
            }
          >
            <img src="/images/dog.webp" alt={t.sections.dogs} />
            <div className="label">{t.sections.dogs}</div>
          </div>

          <div
            className="card"
            onClick={() =>
              router.push(
                { pathname: "/capybara", query: buildLocalizedQuery(resolvedLang) },
                undefined,
                { locale: resolvedLang },
              )
            }
          >
            <img src="/images/capybara.webp" alt={t.sections.capybaras} />
            <div className="label">{t.sections.capybaras}</div>
          </div>

          <div
            className="card"
            onClick={() =>
              router.push(
                { pathname: "/parrots", query: buildLocalizedQuery(resolvedLang) },
                undefined,
                { locale: resolvedLang },
              )
            }
          >
            <img src="/images/parrot.webp" alt={t.sections.parrots} />
            <div className="label">{t.sections.parrots}</div>
          </div>

          <div
            className="card"
            onClick={() =>
              router.push(
                { pathname: "/raccoons", query: buildLocalizedQuery(resolvedLang) },
                undefined,
                { locale: resolvedLang },
              )
            }
          >
            <img src="/images/raccoon.webp" alt={t.sections.raccoons} />
            <div className="label">{t.sections.raccoons}</div>
          </div>

          <div className="card mystery-card">
            <div className="mystery-container">
              <img src="/images/paw.webp" alt="paw" className="paw" />
              <img src="/images/mystery.webp" alt="curtain" className="curtain" />
            </div>
            <div className="label">{t.sections.comingSoon}</div>
          </div>
        </div>

        <VideoSection lang={resolvedLang} />
      </div>
    </>
  );
}
