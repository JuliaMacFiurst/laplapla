
import Link from "next/link";
import { useRouter } from "next/router";
import { buildLocalizedPublicPath, getCurrentLang } from "@/lib/i18n/routing";
import { dictionaries } from "@/i18n";

export function ShopComingSoon() {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const dict = dictionaries[lang].shop;

  return (
    <div className="ShopComingSoon" dir={lang === "he" ? "rtl" : "ltr"}>
      <header className="ShopComingSoon-header">
        <h1 className="ShopComingSoon-title">{dict.hubTitle}</h1>
        <p className="ShopComingSoon-text">{dict.hubDescription}</p>
      </header>

      <section className="shop-interest" aria-labelledby="shop-interest-title">
        <h2 id="shop-interest-title">{dict.interest.title}</h2>
        <p>{dict.interest.intro}</p>
        <p>{dict.interest.formats}</p>
        <p className="shop-interest-manifesto">{dict.interest.manifesto}</p>
        <ul className="shop-interest-examples">
          {dict.interest.examples.map(({ from, to }) => (
            <li key={from}>
              <span>{from}</span>
              <span className="shop-interest-arrow" aria-hidden="true">{lang === "he" ? "←" : "→"}</span>
              <span>{to}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="shop-concept-grid">
        <div className="shop-concept-card">
          <h3>{dict.conceptCards.solve.title}</h3>
          <p>{dict.conceptCards.solve.desc}</p>
        </div>
        <div className="shop-concept-card">
          <h3>{dict.conceptCards.create.title}</h3>
          <p>{dict.conceptCards.create.desc}</p>
        </div>
        <div className="shop-concept-card">
          <h3>{dict.conceptCards.explore.title}</h3>
          <p>{dict.conceptCards.explore.desc}</p>
        </div>
        <div className="shop-concept-card">
          <h3>{dict.conceptCards.together.title}</h3>
          <p>{dict.conceptCards.together.desc}</p>
        </div>
      </section>

      <section className="ShopComingSoon-how">
        <h2>{dict.howItWorks.title}</h2>
        <ol className="ShopComingSoon-steps">
          <li>{dict.howItWorks.step1}</li>
          <li>{dict.howItWorks.step2}</li>
          <li>{dict.howItWorks.step3}</li>
        </ol>
      </section>

      <section className="ShopComingSoon-try">
        <h2>{dict.tryNow}</h2>
        <div className="ShopComingSoon-links">
          <Link href={buildLocalizedPublicPath("/cats", lang)} className="ShopComingSoon-action ShopComingSoon-action--cats">
            <span className="ShopComingSoon-action-icon" aria-hidden="true">🐈</span>
            <span>{dictionaries[lang].home.sections.cats}</span>
          </Link>
          <Link href={buildLocalizedPublicPath("/dog", lang)} className="ShopComingSoon-action ShopComingSoon-action--dogs">
            <span className="ShopComingSoon-action-icon" aria-hidden="true">🐶</span>
            <span>{dictionaries[lang].home.sections.dogs}</span>
          </Link>
          <Link href={buildLocalizedPublicPath("/raccoons", lang)} className="ShopComingSoon-action ShopComingSoon-action--raccoons">
            <span className="ShopComingSoon-action-icon" aria-hidden="true">🦝</span>
            <span>{dictionaries[lang].home.sections.raccoons}</span>
          </Link>
          <Link href={buildLocalizedPublicPath("/quests/quest-1", lang)} className="ShopComingSoon-action ShopComingSoon-action--quest">
            <span className="ShopComingSoon-action-icon" aria-hidden="true">🧭</span>
            <span className="ShopComingSoon-action-copy">
              <span className="ShopComingSoon-action-eyebrow">{dict.freeQuest}</span>
              <strong>{dictionaries[lang].raccoons.quests.featuredTitle}</strong>
              <span className="ShopComingSoon-action-detail">{dict.questDestination}</span>
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
