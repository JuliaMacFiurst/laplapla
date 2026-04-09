import { useRouter } from "next/router";
import SEO from "@/components/SEO";
import { Lang, AboutSectionKey, ABOUT_SECTIONS, dictionaries } from "../../i18n";
import AboutContent from "../../components/AboutContent";
import BackButton from "../../components/BackButton";
import { getCurrentLang } from "@/lib/i18n/routing";

export default function AboutSectionPage() {
  const router = useRouter();
  const lang = getCurrentLang(router) as Lang;

  const section = router.query.section as AboutSectionKey | undefined;

  // защита от некорректного URL
  if (!section || !ABOUT_SECTIONS.includes(section)) {
    return null;
  }

  const sectionData = dictionaries[lang].about[section];
  const seo = dictionaries[lang].seo.about.section;
  const seoPath = router.asPath.split("#")[0]?.split("?")[0] || `/about/${section}`;
  const seoTitle = `${sectionData.title} — ${seo.titleSuffix}`;
  const seoDescription =
    ("preview" in sectionData && typeof sectionData.preview === "string" && sectionData.preview) ||
    seo.defaultDescription;

  const image =
    typeof sectionData === "object" && "image" in sectionData
      ? (sectionData as { image?: string }).image
      : undefined;

  return (
    <>
      <SEO title={seoTitle} description={seoDescription} path={seoPath} />
      <main className="about-page" dir={lang === "he" ? "rtl" : "ltr"}>
        <div className="home-wrapper">
          <BackButton />

          <AboutContent
            mode="section"
            title={sectionData.title}
            full={sectionData.full}
            image={image}
          />
        </div>
      </main>
    </>
  );
}
