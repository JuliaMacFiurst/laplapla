import Link from "next/link";
import type { Lang } from "@/i18n";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";
import { shopLegalDisclosure, shopPolicyPaths } from "@/lib/legal/shopPolicies";

export function ShopLegalDisclosure({ lang }: { lang: Lang }) {
  const copy = shopLegalDisclosure[lang];
  return <aside className="shop-legal-disclosure" aria-label={copy.sale} dir={lang === "he" ? "rtl" : "ltr"}>
    <p>{copy.summary}</p>
    <nav aria-label={copy.sale}>
      <Link href={buildLocalizedPublicPath(shopPolicyPaths.sale, lang)}>{copy.sale}</Link>
      <Link href={buildLocalizedPublicPath(shopPolicyPaths.refund, lang)}>{copy.refund}</Link>
      <Link href={buildLocalizedPublicPath(shopPolicyPaths.printable, lang)}>{copy.printable}</Link>
    </nav>
  </aside>;
}
