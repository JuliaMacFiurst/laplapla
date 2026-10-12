
import Link from "next/link";
import Image from "next/image";
import { dictionaries, type Lang } from "@/i18n";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";

const SHOWCASE_IMAGE = "/images/shop/laplapla-adventures-showcase.webp";

export function ShopSpotlight({ lang }: { lang: Lang }) {
  const dict = dictionaries[lang].shop;
  const copy = dict.homeShowcase;

  return (
    <section className="home-shop-spotlight" aria-labelledby="home-shop-title">
      <div className="home-shop-spotlight-content">
        <div className="home-shop-spotlight-hero">
          <div className="home-shop-spotlight-visual">
            <Image
              src={SHOWCASE_IMAGE}
              alt={copy.imageAlt}
              width={1774}
              height={887}
              sizes="(max-width: 767px) calc(100vw - 28px), (max-width: 1100px) 48vw, 620px"
            />
          </div>
          <div className="home-shop-spotlight-copy">
            <h2 id="home-shop-title" className="home-shop-title" dir={lang === "he" ? "rtl" : "ltr"}>
              {copy.title}
            </h2>
            <p className="home-shop-desc">{copy.description}</p>
            <Link href={buildLocalizedPublicPath("/shop", lang)} className="home-shop-action">
              <span aria-hidden="true">🎁</span>
              {copy.action}
            </Link>
          </div>
        </div>
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
      </div>
    </section>
  );
}
