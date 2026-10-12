
import Link from "next/link";
import Image from "next/image";
import { dictionaries, type Lang } from "@/i18n";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";
import { SVALBARD_FREE_EXPERIENCE } from "@/lib/shop/freeExperiences";

export function ShopSpotlight({ lang, mobile = false }: { lang: Lang; mobile?: boolean }) {
  const dict = dictionaries[lang].shop;
  const action = (
    <Link href={buildLocalizedPublicPath("/shop", lang)} className="home-shop-action">
      <span aria-hidden="true" style={{ marginRight: lang === "he" ? 0 : "0.5rem", marginLeft: lang === "he" ? "0.5rem" : 0 }}>🛍️</span>
      {dict.seeStore}
    </Link>
  );

  return (
    <section className="home-shop-spotlight" aria-labelledby="home-shop-title">
      <div className="home-shop-spotlight-content">
        {mobile ? (
          <div className="home-shop-spotlight-preview" aria-hidden="true">
            <Image src={SVALBARD_FREE_EXPERIENCE.image} alt="" fill sizes="(max-width: 767px) 100vw, 1px" unoptimized />
          </div>
        ) : null}
        <h2 id="home-shop-title" className="page-title home-shop-title">
          {dict.hubTitle}
        </h2>
        <p className="home-shop-desc">{dict.hubDescription}</p>
        {mobile ? action : null}
        
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

        {!mobile ? action : null}
      </div>
    </section>
  );
}
