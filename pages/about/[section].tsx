import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Lang, AboutSectionKey, ABOUT_SECTIONS, dictionaries } from "../../i18n";
import AboutContent from "../../components/AboutContent";
import BackButton from "../../components/BackButton";

export default function AboutSectionPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("ru");

  useEffect(() => {
    const storedLang = localStorage.getItem("lang") as Lang | null;
    const queryLang = router.query.lang as Lang | undefined;

    setLang(queryLang || storedLang || "ru");
  }, [router.query.lang]);

  const section = router.query.section as AboutSectionKey | undefined;

  // защита от некорректного URL
  if (!section || !ABOUT_SECTIONS.includes(section)) {
    return null;
  }

  const sectionData = dictionaries[lang].about[section];

  const image =
    typeof sectionData === "object" && "image" in sectionData
      ? (sectionData as { image?: string }).image
      : undefined;

  return (
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
  );
}
