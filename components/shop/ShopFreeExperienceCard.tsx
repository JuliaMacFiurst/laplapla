import Image from "next/image";
import Link from "next/link";
import type { Lang } from "@/i18n";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";
import {
  getLocalizedFreeExperience,
  type ShopFreeExperience,
} from "@/lib/shop/freeExperiences";

export function ShopFreeExperienceCard({
  experience,
  lang,
}: {
  experience: ShopFreeExperience;
  lang: Lang;
}) {
  const copy = getLocalizedFreeExperience(experience, lang);

  return (
    <article
      className="shop-free-experience"
      data-experience-id={experience.id}
      data-category={experience.category}
      dir={lang === "he" ? "rtl" : "ltr"}
    >
      <div className="shop-free-experience__visual">
        <Image
          src={experience.image}
          alt=""
          fill
          sizes="(max-width: 760px) calc(100vw - 26px), 360px"
          unoptimized
        />
        <span>{copy.label}</span>
      </div>
      <div className="shop-free-experience__copy">
        <h2>{copy.title}</h2>
        <p>{copy.description}</p>
        <Link href={buildLocalizedPublicPath(experience.href, lang)}>
          {copy.cta}
        </Link>
      </div>
    </article>
  );
}
