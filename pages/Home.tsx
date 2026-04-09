import { useMemo } from "react";
import { useRouter } from "next/router";

import SEO from "@/components/SEO";
import { dictionaries, type Lang } from "../i18n";
import { VideoSection } from "../components/video/VideoSection";
import { buildLocalizedQuery, getCurrentLang } from "@/lib/i18n/routing";

export default function Home({ lang }: { lang?: Lang }) {
  const router = useRouter();
  const resolvedLang = lang ?? getCurrentLang(router);

  const t = useMemo(() => dictionaries[resolvedLang].home, [resolvedLang]);
  const seo = dictionaries[resolvedLang].seo.home;
  const seoPath = router.asPath.split("#")[0]?.split("?")[0] || "/";

  // Optional: set RTL for Hebrew without touching global layout yet
  const dir = resolvedLang === "he" ? "rtl" : "ltr";

  return (
    <>
      <SEO title={seo.title} description={seo.description} path={seoPath} />
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
              <img src="/images/paw.webp" alt="" className="paw" />
              <img src="/images/mystery.webp" alt="" className="curtain" />
            </div>
            <div className="label">{t.sections.comingSoon}</div>
          </div>
        </div>

        <VideoSection lang={resolvedLang} />
      </div>
    </>
  );
}
