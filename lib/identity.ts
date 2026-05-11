import { BASE_URL } from "@/lib/config";
import type { Lang } from "@/i18n";

export const SITE_NAME = "LapLapLa";
export const AUTHOR_NAME = "Julia Noah Makhlin";
export const AUTHOR_GITHUB_URL = "https://github.com/JuliaMacFiurst";
export const AUTHOR_LINKEDIN_URL = "https://www.linkedin.com/in/julia-noah-makhlin-491998237/";
export const LAPLAPLA_YOUTUBE_URL = "https://www.youtube.com/@LapLapLa-studio";
export const SITE_LOGO_PATH = "/laplapla-logo.webp";
export const SITE_SOCIAL_IMAGE_PATH = "/laplapla-logo-letters.webp";

export const ENTITY_IDS = {
  organization: `${BASE_URL}/#organization`,
  website: `${BASE_URL}/#website`,
  author: `${BASE_URL}/author#julia-noah-makhlin`,
  logo: `${BASE_URL}${SITE_LOGO_PATH}#logo`,
} as const;

export const AUTHOR_SAME_AS = [
  AUTHOR_GITHUB_URL,
  AUTHOR_LINKEDIN_URL,
  LAPLAPLA_YOUTUBE_URL,
] as const;

const AUTHOR_JOB_TITLES: Record<Lang, string> = {
  ru: "Создатель, основатель и разработчик LapLapLa",
  en: "Creator, founder, and developer of LapLapLa",
  he: "יוצרת, מייסדת ומפתחת LapLapLa",
};

const ORGANIZATION_DESCRIPTIONS: Record<Lang, string> = {
  ru: "LapLapLa — авторская образовательная платформа для детей и взрослых, созданная Julia Noah Makhlin.",
  en: "LapLapLa is an author-led learning platform for children and grown-ups created by Julia Noah Makhlin.",
  he: "LapLapLa היא פלטפורמת למידה לילדים ולמבוגרים שנוצרה על ידי Julia Noah Makhlin.",
};

export function getAuthorJobTitle(lang: Lang) {
  return AUTHOR_JOB_TITLES[lang];
}

export function getOrganizationDescription(lang: Lang) {
  return ORGANIZATION_DESCRIPTIONS[lang];
}

export function buildCoreIdentityJsonLd(lang: Lang) {
  const organizationDescription = getOrganizationDescription(lang);
  const authorJobTitle = getAuthorJobTitle(lang);

  const authorReference = {
    "@id": ENTITY_IDS.author,
    "@type": "Person",
    name: AUTHOR_NAME,
  };

  const organizationReference = {
    "@id": ENTITY_IDS.organization,
    "@type": "Organization",
    name: SITE_NAME,
  };

  return [
    {
      "@context": "https://schema.org",
      "@type": "Person",
      "@id": ENTITY_IDS.author,
      name: AUTHOR_NAME,
      url: `${BASE_URL}/author`,
      jobTitle: authorJobTitle,
      sameAs: AUTHOR_SAME_AS,
      worksFor: organizationReference,
      owns: organizationReference,
      affiliation: organizationReference,
      knowsAbout: [
        "children's education",
        "creative learning",
        "AI-assisted learning",
        "web development",
        "interactive storytelling",
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": ENTITY_IDS.organization,
      name: SITE_NAME,
      legalName: SITE_NAME,
      url: BASE_URL,
      description: organizationDescription,
      logo: {
        "@type": "ImageObject",
        "@id": ENTITY_IDS.logo,
        url: `${BASE_URL}${SITE_LOGO_PATH}`,
      },
      sameAs: [LAPLAPLA_YOUTUBE_URL, AUTHOR_GITHUB_URL, AUTHOR_LINKEDIN_URL],
      founder: authorReference,
      creator: authorReference,
      publisher: authorReference,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": ENTITY_IDS.website,
      name: SITE_NAME,
      url: BASE_URL,
      inLanguage: lang,
      publisher: organizationReference,
      creator: authorReference,
      author: authorReference,
      about: organizationReference,
    },
  ];
}
