import { ABOUT_SECTIONS, AboutSectionKey, Lang, dictionaries } from "../i18n";

interface AboutContentProps {
  lang: Lang;
  mode: "list" | "section";
  section?: AboutSectionKey;
}

export default function AboutContent({
  lang,
  mode,
  section,
}: AboutContentProps) {
  const t = dictionaries[lang].about;

  // Рендер списка всех секций (для /about)
  if (mode === "list") {
    return (
      <div className="about-content">
        {ABOUT_SECTIONS.map((key) => (
          <section key={key} className="about-section">
            <h2>{t[key].title}</h2>
            <p>{t[key].text}</p>
          </section>
        ))}
      </div>
    );
  }

  // Рендер одной секции (для /about/[section])
  if (mode === "section" && section) {
    return (
      <div className="about-content">
        <section className="about-section">
          <h2>{t[section].title}</h2>
          <p>{t[section].text}</p>
        </section>
      </div>
    );
  }

  return null;
}
