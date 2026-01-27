import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Lang, ABOUT_SECTIONS } from "../../i18n";
import AboutContent from "../../components/AboutContent";

export default function AboutPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("ru");

  useEffect(() => {
    const storedLang = localStorage.getItem("lang") as Lang | null;
    const queryLang = router.query.lang as Lang | undefined;

    setLang(queryLang || storedLang || "ru");
  }, [router.query.lang]);

  return (
    <main className="about-page" dir={lang === "he" ? "rtl" : "ltr"}>
      <div className="home-wrapper">

        <section className="about-list">
          {ABOUT_SECTIONS.map((section) => (
            <article
              key={section}
              className={`about-card about-${section}`}
              onClick={() => router.push(`/about/${section}`)}
            >
              <AboutContent
                mode="preview"
                title={require("../../i18n").dictionaries[lang].about[section].title}
                text={require("../../i18n").dictionaries[lang].about[section].text}
              />
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}