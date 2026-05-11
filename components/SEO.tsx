import Head from "next/head";
import { useRouter } from "next/router";
import { BASE_URL } from "@/lib/config";
import type { Lang } from "@/i18n";
import { buildLocalizedPublicPath, getCurrentLang } from "@/lib/i18n/routing";
import {
  SITE_NAME,
  SITE_SOCIAL_IMAGE_PATH,
  buildCoreIdentityJsonLd,
} from "@/lib/identity";

export type SEOProps = {
  title: string;
  description: string;
  path: string;
  type?: string;
  lang?: Lang;
  canonicalOverride?: string;
  alternates?: Array<{
    hrefLang: string;
    href: string;
  }>;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
};

function normalizePath(path: string) {
  const cleanPath = path.split("#")[0]?.split("?")[0] || "/";

  if (!cleanPath || cleanPath === "/") {
    return "/";
  }

  return cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
}

function buildAlternateLinks(path: string) {
  const normalizedPath = normalizePath(path);

  return [
    { hrefLang: "ru", href: `${BASE_URL}${buildLocalizedPublicPath(normalizedPath, "ru")}` },
    { hrefLang: "en", href: `${BASE_URL}${buildLocalizedPublicPath(normalizedPath, "en")}` },
    { hrefLang: "he", href: `${BASE_URL}${buildLocalizedPublicPath(normalizedPath, "he")}` },
    { hrefLang: "x-default", href: `${BASE_URL}${buildLocalizedPublicPath(normalizedPath, "ru")}` },
  ];
}

export default function SEO({
  title,
  description,
  path,
  type = "website",
  lang,
  canonicalOverride,
  alternates,
  jsonLd,
}: SEOProps) {
  const router = useRouter();
  const resolvedLang = lang ?? getCurrentLang(router);
  const normalizedPath = buildLocalizedPublicPath(normalizePath(path), resolvedLang);
  const canonical = canonicalOverride ?? `${BASE_URL}${normalizedPath === "/" ? "" : normalizedPath}`;
  const alternateLinks = alternates ?? buildAlternateLinks(path);
  const identityJsonLd = buildCoreIdentityJsonLd(resolvedLang);
  const pageJsonLd = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  const mergedJsonLd = [...identityJsonLd, ...pageJsonLd];
  const socialImage = `${BASE_URL}${SITE_SOCIAL_IMAGE_PATH}`;
  const locale = resolvedLang === "he" ? "he_IL" : resolvedLang === "en" ? "en_US" : "ru_RU";

  return (
    <Head>
      <title key="title">{title}</title>
      <meta key="description" name="description" content={description} />
      <link key="canonical" rel="canonical" href={canonical} />
      {alternateLinks.map((alternate) => (
        <link
          key={`alternate-${alternate.hrefLang}`}
          rel="alternate"
          hrefLang={alternate.hrefLang}
          href={alternate.href}
        />
      ))}
      <meta key="og:title" property="og:title" content={title} />
      <meta key="og:description" property="og:description" content={description} />
      <meta key="og:type" property="og:type" content={type} />
      <meta key="og:url" property="og:url" content={canonical} />
      <meta key="og:site_name" property="og:site_name" content={SITE_NAME} />
      <meta key="og:locale" property="og:locale" content={locale} />
      <meta key="og:image" property="og:image" content={socialImage} />
      <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
      <meta key="twitter:title" name="twitter:title" content={title} />
      <meta key="twitter:description" name="twitter:description" content={description} />
      <meta key="twitter:image" name="twitter:image" content={socialImage} />
      <script
        key="identity-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(mergedJsonLd) }}
      />
    </Head>
  );
}
