import Link from "next/link";
import { useRouter } from "next/router";
import SEO from "@/components/SEO";
import { dictionaries, type Lang } from "@/i18n";
import { BASE_URL } from "@/lib/config";
import { buildLocalizedPublicPath, getCurrentLang } from "@/lib/i18n/routing";
import {
  AUTHOR_GITHUB_URL,
  AUTHOR_LINKEDIN_URL,
  AUTHOR_NAME,
  ENTITY_IDS,
  LAPLAPLA_YOUTUBE_URL,
  SITE_NAME,
} from "@/lib/identity";

const PROFILE_LINKS = [
  { key: "github", href: AUTHOR_GITHUB_URL },
  { key: "linkedin", href: AUTHOR_LINKEDIN_URL },
  { key: "youtube", href: LAPLAPLA_YOUTUBE_URL },
] as const;

export default function AuthorPage() {
  const router = useRouter();
  const lang = getCurrentLang(router) as Lang;
  const seo = dictionaries[lang].seo.author;
  const t = dictionaries[lang].identity.authorPage;
  const authorUrl = `${BASE_URL}${buildLocalizedPublicPath("/author", lang)}`;
  const aboutUrl = `${BASE_URL}${buildLocalizedPublicPath("/about", lang)}`;

  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${authorUrl}#profile-page`,
    url: authorUrl,
    name: seo.title,
    description: seo.description,
    inLanguage: lang,
    isPartOf: { "@id": ENTITY_IDS.website },
    about: { "@id": ENTITY_IDS.author },
    mainEntity: {
      "@id": ENTITY_IDS.author,
      "@type": "Person",
      name: AUTHOR_NAME,
      worksFor: { "@id": ENTITY_IDS.organization },
      sameAs: PROFILE_LINKS.map((link) => link.href),
    },
  };

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": `${aboutUrl}#about-laplapla`,
    url: aboutUrl,
    name: dictionaries[lang].seo.about.index.title,
    about: { "@id": ENTITY_IDS.organization },
    author: { "@id": ENTITY_IDS.author },
    creator: { "@id": ENTITY_IDS.author },
    publisher: { "@id": ENTITY_IDS.organization },
  };

  return (
    <>
      <SEO title={seo.title} description={seo.description} path="/author" type="profile" jsonLd={[pageJsonLd, webPageJsonLd]} />
      <main className="about-page author-identity-page" dir={lang === "he" ? "rtl" : "ltr"}>
        <div className="home-wrapper">
          <section className="author-identity-hero" itemScope itemType="https://schema.org/Person">
            <p className="author-identity-eyebrow">{t.eyebrow}</p>
            <h1 itemProp="name">{t.title}</h1>
            <div className="author-identity-intro" itemProp="description">
              {t.intro.split("\n\n").map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <Link className="author-identity-about-link" href={buildLocalizedPublicPath("/about", lang)}>
              {t.aboutProjectLink}
            </Link>
            <meta itemProp="url" content={authorUrl} />
            <meta itemProp="jobTitle" content="Creator, founder, developer and author of LapLapLa" />
            <span itemProp="worksFor" itemScope itemType="https://schema.org/Organization">
              <meta itemProp="name" content={SITE_NAME} />
              <meta itemProp="url" content={BASE_URL} />
            </span>
          </section>

          <section className="author-identity-section">
            <h2>{t.whoTitle}</h2>
            {t.whoParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <blockquote>{t.quote}</blockquote>
          </section>

          <section className="author-identity-section">
            <h2>{t.platformTitle}</h2>
            <p>{t.platformIntro}</p>
            <ul>
              {t.platformItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>{t.platformOutro}</p>
          </section>

          <section className="author-identity-section">
            <h2>{t.whyTitle}</h2>
            <p>{t.whyIntro}</p>
            <ul>
              {t.whyItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>{t.whyOutro}</p>
          </section>

          <section className="author-identity-section">
            <h2>{t.collaborationTitle}</h2>
            {t.collaborationParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>

          <section className="author-identity-section">
            <h2>{t.profilesTitle}</h2>
            <ul className="author-identity-links">
              {PROFILE_LINKS.map((link) => (
                <li key={link.key}>
                  <a href={link.href} target="_blank" rel="me noopener noreferrer">
                    {t[link.key]}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className="author-identity-section">
            <h2>{t.authorshipTitle}</h2>
            {t.authorshipParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        </div>
      </main>
    </>
  );
}
