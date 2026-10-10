import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { dictionaries, type Lang } from "@/i18n";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";
import { formatPrice } from "@/lib/shop/commerce";
import { requireQuestAssetUrl } from "@/lib/shop/questAssets";
import { SOUND_CASE_001_ASSET_MANIFEST } from "@/lib/shop/quests/sound-case-001/assets";
import { SOUND_CASE_PRODUCT_INCLUDED_MEDIA } from "@/lib/shop/soundCasePromoMedia";
import { SOUND_CASE_PRODUCT_DETAIL_COPY } from "@/lib/shop/soundCaseProductDetail";
import type { ShopProduct } from "@/lib/shop/types";

import { SoundCaseVideoPresentation } from "./SoundCaseVideoPresentation";

const localizedVibrationCard = (lang: Lang) => {
  const id = lang === "ru"
    ? "stage-2-vibration-card-ru-01-vi"
    : lang === "he"
      ? "stage-2-vibration-card-he-01-t"
      : "stage-2-vibration-card-en-vi";

  return requireQuestAssetUrl(SOUND_CASE_001_ASSET_MANIFEST.assets[id]);
};

const soundCaseReuseIllustration = requireQuestAssetUrl(
  SOUND_CASE_001_ASSET_MANIFEST.assets["collectible-parrot-way"],
);

export function ShopProductDetail({ product, lang }: { product: ShopProduct; lang: Lang }) {
  const productText = dictionaries[lang].shop.soundCase;
  const detail = SOUND_CASE_PRODUCT_DETAIL_COPY[lang];
  const isSoundCasePreorder = product.id === "sound-case-001" && product.status === "coming-soon";
  const ctaHref = buildLocalizedPublicPath(
    isSoundCasePreorder ? `/shop/${product.slug}/preorder` : `/shop/${product.slug}/create`,
    lang,
  );
  const previewPages = product.previewPages.map((url, index) =>
    index === 1 ? localizedVibrationCard(lang) : url,
  );
  const [selectedPreview, setSelectedPreview] = useState(0);
  const selectedPreviewUrl = previewPages[selectedPreview] ?? previewPages[0];
  const selectedPreviewLabel = detail.galleryLabels[selectedPreview] ?? detail.galleryLabels[0];

  return (
    <main className="sound-case-product" dir={lang === "he" ? "rtl" : "ltr"} lang={lang}>
      <section className="sound-case-product__hero" aria-labelledby="sound-case-product-title">
        <div className="sound-case-product__hero-media">
          <Image src={product.heroImage} alt={productText.preorder.posterAlt} fill sizes="(max-width: 760px) 100vw, 54vw" priority unoptimized />
        </div>
        <div className="sound-case-product__hero-copy">
          <span className="sound-case-product__availability">{detail.availability}</span>
          <p className="sound-case-product__eyebrow">{productText.eyebrow}</p>
          <h1 id="sound-case-product-title">{product.title[lang]}</h1>
          <p className="sound-case-product__subtitle">{product.subtitle[lang]}</p>
          <p className="sound-case-product__value">{detail.heroValue}</p>
          <div className="sound-case-product__purchase-summary">
            <div><span>{detail.priceLabel}</span><strong><bdi>{formatPrice(product.price, product.currency, lang)}</bdi></strong></div>
            <Link className="sound-case-product__primary-cta" href={ctaHref}>{isSoundCasePreorder ? productText.preorder.productCta : productText.createCta}</Link>
          </div>
          <p className="sound-case-product__availability-note">{productText.preparationNote}</p>
        </div>
      </section>

      <SoundCaseVideoPresentation lang={lang} copy={detail.videoPresentation} />

      <section className="sound-case-product__intro sound-case-product__section" aria-labelledby="sound-case-what-title">
        <p className="sound-case-product__section-kicker">Sound Case #001</p>
        <h2 id="sound-case-what-title">{detail.whatIsTitle}</h2>
        <p>{detail.whatIsBody}</p>
      </section>

      <section className="sound-case-product__section" aria-labelledby="sound-case-included-title">
        <div className="sound-case-product__section-heading"><h2 id="sound-case-included-title">{detail.includedTitle}</h2><p>{detail.includedIntro}</p></div>
        <ul className="sound-case-product__included">
          {product.includedItems.map((item, index) => {
            const imageUrl = product.id === "sound-case-001" ? SOUND_CASE_PRODUCT_INCLUDED_MEDIA[index] : undefined;
            return <li key={item[lang]}>
              <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              {imageUrl ? <div className="sound-case-product__included-media">
                <Image
                  src={imageUrl}
                  alt={detail.includedImageAlts[index] ?? item[lang]}
                  fill
                  sizes="(max-width: 640px) calc(100vw - 4.7rem), (max-width: 900px) 44vw, 340px"
                  loading="lazy"
                  unoptimized
                />
              </div> : null}
              <div className="sound-case-product__included-title">{item[lang]}</div>
            </li>;
          })}
        </ul>
      </section>

      <section className="sound-case-product__flow sound-case-product__section" aria-labelledby="sound-case-flow-title">
        <h2 id="sound-case-flow-title">{detail.flowTitle}</h2>
        <ol>{detail.flow.map((step, index) => <li key={step.title}><span aria-hidden="true">{index + 1}</span><h3>{step.title}</h3><p>{step.body}</p></li>)}</ol>
      </section>

      <section className="sound-case-product__gallery sound-case-product__section" aria-labelledby="sound-case-gallery-title">
        <div className="sound-case-product__section-heading"><h2 id="sound-case-gallery-title">{detail.galleryTitle}</h2><p>{detail.galleryIntro}</p></div>
        <div className="sound-case-product__gallery-layout">
          <figure className="sound-case-product__gallery-stage" aria-live="polite">
            {selectedPreviewUrl ? <Image src={selectedPreviewUrl} alt={selectedPreviewLabel} fill sizes="(max-width: 760px) calc(100vw - 40px), 660px" unoptimized /> : null}
            <figcaption>{selectedPreviewLabel}</figcaption>
          </figure>
          <div className="sound-case-product__gallery-thumbs" role="group" aria-label={detail.galleryTitle}>
            {previewPages.map((url, index) => (
              <button type="button" key={url} className={index === selectedPreview ? "is-selected" : undefined} aria-pressed={index === selectedPreview} aria-label={detail.galleryLabels[index]} onClick={() => setSelectedPreview(index)}>
                <Image src={url} alt="" fill sizes="120px" unoptimized /><span>{String(index + 1).padStart(2, "0")}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="sound-case-product__personalization sound-case-product__section" aria-labelledby="sound-case-personalization-title">
        <div><p className="sound-case-product__section-kicker">{productText.eyebrow}</p><h2 id="sound-case-personalization-title">{detail.personalizationTitle}</h2><p>{detail.personalizationBody}</p></div>
        <ul>{detail.personalizationItems.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>

      <section className="sound-case-product__reuse sound-case-product__section" aria-labelledby="sound-case-reuse-title">
        <div className="sound-case-product__reuse-media" aria-hidden="true">
          <Image
            src={soundCaseReuseIllustration}
            alt=""
            width={1536}
            height={1024}
            sizes="(max-width: 640px) 72vw, 280px"
            loading="lazy"
            unoptimized
          />
        </div>
        <div><h2 id="sound-case-reuse-title">{detail.reuseTitle}</h2><p>{detail.reuseBody}</p></div>
      </section>

      <section className="sound-case-product__details sound-case-product__section" aria-labelledby="sound-case-details-title">
        <h2 id="sound-case-details-title">{detail.detailsTitle}</h2>
        <dl>
          {product.recommendedAge ? <div><dt>{detail.ageLabel}</dt><dd>{product.recommendedAge[lang]}</dd></div> : null}
          {product.duration ? <div><dt>{detail.durationLabel}</dt><dd>{product.duration[lang]}</dd></div> : null}
          {detail.details.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
        </dl>
      </section>

      <section className="sound-case-product__trust sound-case-product__section" aria-labelledby="sound-case-trust-title">
        <div><p className="sound-case-product__section-kicker">LapLapLa</p><h2 id="sound-case-trust-title">{detail.trustTitle}</h2><p>{detail.sellerLabel}</p></div>
        <ul>{detail.trustItems.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>

      <section className="sound-case-product__final-cta" aria-labelledby="sound-case-final-title">
        <div><h2 id="sound-case-final-title">{detail.finalTitle}</h2><p>{detail.finalBody}</p></div>
        <div><strong><bdi>{formatPrice(product.price, product.currency, lang)}</bdi></strong><Link className="sound-case-product__primary-cta" href={ctaHref}>{isSoundCasePreorder ? productText.preorder.productCta : productText.createCta}</Link></div>
      </section>
    </main>
  );
}
