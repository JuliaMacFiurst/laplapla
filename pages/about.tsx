

import { useRouter } from "next/router";
import { dictionaries, Lang } from "../i18n";

export default function AboutPage() {
  const router = useRouter();

  const lang = (router.query.lang as Lang) || "ru";
  const t = dictionaries[lang].about;

  return (
    <main
      className="about-page"
      dir={lang === "he" ? "rtl" : "ltr"}
    >
      <h1 className="about-title">{t.title}</h1>

      <section className="about-section">
        <h2>{t.what.title}</h2>
        <p>{t.what.text}</p>
      </section>

      <section className="about-section">
        <h2>{t.forWho.title}</h2>
        <p>{t.forWho.text}</p>
      </section>

      <section className="about-section">
        <h2>{t.author.title}</h2>
        <p>{t.author.text}</p>
      </section>

      <section className="about-section">
        <h2>{t.access.title}</h2>
        <p>{t.access.text}</p>
      </section>

      <section className="about-section">
        <h2>{t.language.title}</h2>
        <p>{t.language.text}</p>
      </section>
    </main>
  );
}