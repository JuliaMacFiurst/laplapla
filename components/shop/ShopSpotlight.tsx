
import Link from "next/link";
import { dictionaries, type Lang } from "@/i18n";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";

export function ShopSpotlight({ lang }: { lang: Lang }) {
  const dict = dictionaries[lang].shop;

  return (
    <section className="home-shop-spotlight" aria-labelledby="home-shop-title">
      <div className="home-shop-spotlight-content">
        <h2 id="home-shop-title" className="page-title home-shop-title">
          {dict.hubTitle}
        </h2>
        <p className="home-shop-desc">{dict.hubDescription}</p>
        
        <div className="shop-concept-grid">
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
        </div>

        <Link 
          href={buildLocalizedPublicPath("/shop", lang)} 
          className="home-shop-action"
        >
          <span aria-hidden="true" style={{ marginRight: lang === "he" ? 0 : "0.5rem", marginLeft: lang === "he" ? "0.5rem" : 0 }}>🛍️</span>
          {dict.seeStore}
        </Link>
      </div>
    </section>
  );
}
