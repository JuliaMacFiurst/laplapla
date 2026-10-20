import Link from "next/link";
import { useRouter } from "next/router";
import SEO from "@/components/SEO";
import { getCurrentLang, buildLocalizedPublicPath } from "@/lib/i18n/routing";
import { shopPolicyCopy, shopPolicyPaths, type ShopPolicyKind } from "@/lib/legal/shopPolicies";
import { supportCopy } from "@/lib/support/copy";

export function ShopPolicyPage({ kind }: { kind: ShopPolicyKind }) {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const content = shopPolicyCopy[lang][kind];

  return <>
    <SEO title={`${content.title} | LapLapLa`} description={content.intro} path={buildLocalizedPublicPath(shopPolicyPaths[kind], lang)} noindex />
    <main className="legal-page" dir={lang === "he" ? "rtl" : "ltr"} lang={lang} style={{ maxWidth: 900, margin: "0 auto", padding: "60px 20px" }}>
      <h1>{content.title}</h1>
      <p style={{ lineHeight: 1.7 }}>{content.intro}</p>
      {content.sections.map((section) => <section key={section.heading} style={{ marginTop: 32 }}>
        <h2>{section.heading}</h2>
        {section.paragraphs.map((paragraph) => <p key={paragraph} style={{ lineHeight: 1.7 }}>{paragraph}</p>)}
      </section>)}
      <p style={{ marginTop: 36 }}><Link href={buildLocalizedPublicPath("/support", lang)}>{supportCopy[lang].footerLink}</Link></p>
    </main>
  </>;
}
