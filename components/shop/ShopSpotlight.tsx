
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
        
        <Link 
          href={buildLocalizedPublicPath("/shop", lang)} 
          className="home-shop-action"
        >
          <span aria-hidden="true" style={{ marginRight: lang === "he" ? 0 : "0.5rem", marginLeft: lang === "he" ? "0.5rem" : 0 }}>🛍️</span>
          {dict.navTitle}
        </Link>
      </div>
    </section>
  );
}
