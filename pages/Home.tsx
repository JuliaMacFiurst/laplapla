import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";

import CorePageLinks from "@/components/CorePageLinks";
import SEO from "@/components/SEO";
import { dictionaries, type Lang } from "../i18n";
import { VideoSection } from "../components/video/VideoSection";
import { buildLocalizedPublicPath, getCurrentLang } from "@/lib/i18n/routing";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useResponsiveViewport } from "@/hooks/useResponsiveViewport";
import { BASE_URL } from "@/lib/config";
import { GEO_PROFILES, buildHomeGeoJsonLd } from "@/lib/geo";

const HOME_ALTERNATES = [
  { hrefLang: "ru", href: BASE_URL },
  { hrefLang: "en", href: `${BASE_URL}/en` },
  { hrefLang: "he", href: `${BASE_URL}/he` },
  { hrefLang: "x-default", href: BASE_URL },
];

export default function Home({ lang }: { lang?: Lang }) {
  const router = useRouter();
  const resolvedLang = lang ?? getCurrentLang(router);
  const isMobile = useIsMobile(767);
  const responsiveViewport = useResponsiveViewport();
  const usesTouchHomeLayout = isMobile || responsiveViewport.deviceClass === "tablet";

  const t = useMemo(() => dictionaries[resolvedLang].home, [resolvedLang]);
  const seo = dictionaries[resolvedLang].seo.home;
  const geoJsonLd = useMemo(() => buildHomeGeoJsonLd(resolvedLang), [resolvedLang]);
  const geoProfile = GEO_PROFILES[resolvedLang];
  const localizedHomePath = buildLocalizedPublicPath("/", resolvedLang);
  const homeCanonicalUrl = `${BASE_URL}${localizedHomePath === "/" ? "" : localizedHomePath}`;

  // Optional: set RTL for Hebrew without touching global layout yet
  const dir = resolvedLang === "he" ? "rtl" : "ltr";

  return (
    <>
      <SEO
        title={seo.title}
        description={seo.description}
        path="/"
        lang={resolvedLang}
        canonicalOverride={homeCanonicalUrl}
        alternates={HOME_ALTERNATES}
        jsonLd={geoJsonLd}
      />
      <div className={`home-wrapper ${isMobile ? "home-wrapper-mobile" : ""}`} dir={dir}>
        <div className={isMobile ? "home-mobile-snap-shell" : undefined}>
          <section className={isMobile ? "home-mobile-screen home-mobile-screen-menu" : undefined}>
            <header className="site-header">
              <div className="header-text">
                <h1 className="page-title">{t.title}</h1>
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
                <Image
                  src="/images/cat.webp"
                  alt={t.sections.cats}
                  width={320}
                  height={320}
                  priority
                  loading="eager"
                />
                <div className="label">{t.sections.cats}</div>
              </Link>

              <Link
                className="card"
                href={buildLocalizedPublicPath("/dog", resolvedLang)}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Image src="/images/dog.webp" alt={t.sections.dogs} width={320} height={320} />
                <div className="label">{t.sections.dogs}</div>
              </Link>

              <Link
                className="card"
                href={buildLocalizedPublicPath("/capybara", resolvedLang)}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Image src="/images/capybara.webp" alt={t.sections.capybaras} width={320} height={320} />
                <div className="label">{t.sections.capybaras}</div>
              </Link>

              <Link
                className="card"
                href={buildLocalizedPublicPath("/parrots", resolvedLang)}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Image src="/images/parrot.webp" alt={t.sections.parrots} width={320} height={320} />
                <div className="label">{t.sections.parrots}</div>
              </Link>

              <Link
                className="card"
                href={buildLocalizedPublicPath("/raccoons", resolvedLang)}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Image src="/images/raccoon.webp" alt={t.sections.raccoons} width={320} height={320} />
                <div className="label">{t.sections.raccoons}</div>
              </Link>

              <div className="card mystery-card">
                <div className="mystery-container">
                  <Image src="/images/paw.webp" alt="" className="paw" width={160} height={160} />
                  <Image src="/images/mystery.webp" alt="" className="curtain" width={320} height={320} />
                </div>
                <div className="label">{t.sections.comingSoon}</div>
              </div>
            </div>
          </section>

          <section className="home-brand-overview" aria-labelledby="laplapla-brand-heading">
            <h2 id="laplapla-brand-heading">{t.brand.heading}</h2>
            <p>{t.brand.intro}</p>
            <p>{t.brand.audience}</p>
            <nav className="home-brand-links" aria-label={t.brand.sectionsTitle}>
              {geoProfile.pages.map((page) => (
                <Link key={page.path} href={buildLocalizedPublicPath(page.path, resolvedLang)}>
                  <strong>{page.name}</strong>
                  <span>{page.description}</span>
                </Link>
              ))}
            </nav>
            <div className="home-brand-meta-links">
              <Link href={buildLocalizedPublicPath("/about", resolvedLang)}>
                {t.brand.aboutLink}
              </Link>
            </div>
          </section>

          <section className={isMobile ? "home-mobile-screen home-mobile-screen-video" : undefined}>
            <VideoSection lang={resolvedLang} mobileMode={usesTouchHomeLayout ? "shorts" : undefined} />
          </section>

          {usesTouchHomeLayout ? (
            <section className="home-mobile-screen home-mobile-screen-video home-mobile-screen-video-gallery">
              <VideoSection lang={resolvedLang} mobileMode="videos" />
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
