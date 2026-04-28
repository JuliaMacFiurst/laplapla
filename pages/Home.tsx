import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

import CorePageLinks from "@/components/CorePageLinks";
import SEO from "@/components/SEO";
import { dictionaries, type Lang } from "../i18n";
import { VideoSection } from "../components/video/VideoSection";
import { buildLocalizedPublicPath, getCurrentLang } from "@/lib/i18n/routing";
import { useIsMobile } from "@/hooks/useIsMobile";
import { BASE_URL } from "@/lib/config";

const HOME_CANONICAL_URL = `${BASE_URL}/`;

const HOME_ALTERNATES = [
  { hrefLang: "ru", href: `${BASE_URL}/` },
  { hrefLang: "en", href: `${BASE_URL}/en` },
  { hrefLang: "he", href: `${BASE_URL}/he` },
  { hrefLang: "x-default", href: `${BASE_URL}/` },
];

const visuallyHiddenStyle = {
  position: "absolute" as const,
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap" as const,
  border: 0,
};

export default function Home({ lang }: { lang?: Lang }) {
  const router = useRouter();
  const resolvedLang = lang ?? getCurrentLang(router);
  const isMobile = useIsMobile(767);

  const t = useMemo(() => dictionaries[resolvedLang].home, [resolvedLang]);
  const seo = dictionaries[resolvedLang].seo.home;

  // Optional: set RTL for Hebrew without touching global layout yet
  const dir = resolvedLang === "he" ? "rtl" : "ltr";

  return (
    <>
      <SEO
        title={seo.title}
        description={seo.description}
        path="/"
        lang={resolvedLang}
        canonicalOverride={HOME_CANONICAL_URL}
        alternates={HOME_ALTERNATES}
      />
      <div className={`home-wrapper ${isMobile ? "home-wrapper-mobile" : ""}`} dir={dir}>
        <div className={isMobile ? "home-mobile-snap-shell" : undefined}>
          <section className={isMobile ? "home-mobile-screen home-mobile-screen-menu" : undefined}>
            <header className="site-header">
              <div className="header-text">
                <h1 style={visuallyHiddenStyle}>{seo.title}</h1>
                <div className="page-title">{t.title}</div>
                <p style={visuallyHiddenStyle}>{seo.description}</p>
                <h2 className="page-subtitle">
                  {isMobile ? t.mobileHelper : t.subtitle}
                </h2>
                <CorePageLinks
                  current="home"
                  lang={resolvedLang}
                  related={["cats", "dog", "book", "parrots", "raccoons"]}
                />
              </div>
            </header>

            <div className={`grid ${isMobile ? "grid-mobile-menu" : ""}`}>
              <Link
                className="card"
                href={buildLocalizedPublicPath("/cats", resolvedLang)}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <img src="/images/cat.webp" alt={t.sections.cats} />
                <div className="label">{t.sections.cats}</div>
              </Link>

              <Link
                className="card"
                href={buildLocalizedPublicPath("/dog", resolvedLang)}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <img src="/images/dog.webp" alt={t.sections.dogs} />
                <div className="label">{t.sections.dogs}</div>
              </Link>

              <Link
                className="card"
                href={buildLocalizedPublicPath("/books/kladbishenskaya-kniga", resolvedLang)}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <img src="/images/capybara.webp" alt={t.sections.capybaras} />
                <div className="label">{t.sections.capybaras}</div>
              </Link>

              <Link
                className="card"
                href={buildLocalizedPublicPath("/parrots", resolvedLang)}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <img src="/images/parrot.webp" alt={t.sections.parrots} />
                <div className="label">{t.sections.parrots}</div>
              </Link>

              <Link
                className="card"
                href={buildLocalizedPublicPath("/raccoons", resolvedLang)}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <img src="/images/raccoon.webp" alt={t.sections.raccoons} />
                <div className="label">{t.sections.raccoons}</div>
              </Link>

              <div className="card mystery-card">
                <div className="mystery-container">
                  <img src="/images/paw.webp" alt="" className="paw" />
                  <img src="/images/mystery.webp" alt="" className="curtain" />
                </div>
                <div className="label">{t.sections.comingSoon}</div>
              </div>
            </div>
          </section>

          <section className={isMobile ? "home-mobile-screen home-mobile-screen-video" : undefined}>
            <VideoSection lang={resolvedLang} mobileMode={isMobile ? "shorts" : undefined} />
          </section>

          {isMobile ? (
            <section className="home-mobile-screen home-mobile-screen-video home-mobile-screen-video-gallery">
              <VideoSection lang={resolvedLang} mobileMode="videos" />
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
