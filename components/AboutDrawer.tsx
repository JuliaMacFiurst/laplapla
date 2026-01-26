import { Lang, dictionaries } from "../i18n";

export default function AboutDrawer({
  open,
  onClose,
  lang,
}: {
  open: boolean;
  onClose: () => void;
  lang: Lang;
}) {
  if (!open) return null;

  // Let TypeScript infer the correct shape from the real dictionaries object
  const t = dictionaries[lang].about;

  return (
    <div className="about-backdrop" onClick={onClose}>
      <aside
        className="about-drawer"
        onClick={(e) => e.stopPropagation()}
        dir={lang === "he" ? "rtl" : "ltr"}
      >
        <button className="about-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2 className="about-title">{t.title}</h2>

        <section className="about-section">
          <h3>{t.what.title}</h3>
          <p>{t.what.text}</p>
        </section>

        <section className="about-section">
          <h3>{t.forWho.title}</h3>
          <p>{t.forWho.text}</p>
        </section>

        <section className="about-section">
          <h3>{t.author.title}</h3>
          <p>{t.author.text}</p>
        </section>

        <section className="about-section">
          <h3>{t.access.title}</h3>
          <p>{t.access.text}</p>
        </section>

        <section className="about-section">
          <h3>{t.language.title}</h3>
          <p>{t.language.text}</p>
        </section>
      </aside>
    </div>
  );
}
