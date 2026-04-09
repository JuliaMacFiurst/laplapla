import { useRouter } from "next/router";
import SEO from "@/components/SEO";
import { Lang, ABOUT_SECTIONS, dictionaries } from "../../i18n";
import AboutContent from "../../components/AboutContent";
import { buildLocalizedQuery, getCurrentLang } from "@/lib/i18n/routing";

const ABOUT_ICONS: Record<string, string> = {
  what: "/icons/about-icons/chicken.webp",
  forWho: "/icons/about-icons/bears.webp",
  author: "/icons/about-icons/mum.webp",
  access: "/icons/about-icons/chest.webp",
  language: "/icons/about-icons/lang.webp",
  collaboration: "/icons/about-icons/paws.webp",
};

export default function AboutPage() {
  const router = useRouter();
  const lang = getCurrentLang(router) as Lang;
  const seo = dictionaries[lang].seo.about.index;
  const seoPath = router.asPath.split("#")[0]?.split("?")[0] || "/about";

  return (
    <>
      <SEO title={seo.title} description={seo.description} path={seoPath} />
      <main className="about-page" dir={lang === "he" ? "rtl" : "ltr"}>
        <div className="home-wrapper">

          <section className="about-list">
            {ABOUT_SECTIONS.map((section) => (
              <article
                key={section}
                className={`about-card about-${section}`}
                onClick={() =>
                  router.push(
                    {
                      pathname: `/about/${section}`,
                      query: buildLocalizedQuery(lang),
                    },
                    undefined,
                    { locale: lang },
                  )
                }
              >
                <AboutContent
                  mode="preview"
                  title={require("../../i18n").dictionaries[lang].about[section].title}
                  preview={require("../../i18n").dictionaries[lang].about[section].preview}
                  icon={ABOUT_ICONS[section]}
                />
              </article>
            ))}
          </section>
        </div>
      </main>
    </>
  );
}
