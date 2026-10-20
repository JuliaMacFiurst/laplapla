import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ShopLegalDisclosure } from "@/components/legal/ShopLegalDisclosure";
import { shopLegalDisclosure, shopPolicyCopy, shopPolicyPaths } from "@/lib/legal/shopPolicies";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";
import { PRIVACY_CONTENT } from "@/pages/privacy";

const langs = ["ru", "en", "he"] as const;
const kinds = ["sale", "refund", "printable"] as const;

describe("digital shop terms", () => {
  it.each(langs)("keeps the three policies and support path available in %s", (lang) => {
    for (const kind of kinds) {
      const policy = shopPolicyCopy[lang][kind];
      expect(policy.title).toBeTruthy();
      expect(policy.sections.length).toBe(kind === "printable" ? 5 : 6);
      expect(policy.sections.flatMap((section) => section.paragraphs).join(" ")).toContain("omanchikim@gmail.com");
      expect(buildLocalizedPublicPath(shopPolicyPaths[kind], lang)).toBe(
        `${lang === "ru" ? "" : `/${lang}`}${shopPolicyPaths[kind]}`,
      );
    }
    expect(shopLegalDisclosure[lang].summary).toBeTruthy();
    const markup = renderToStaticMarkup(createElement(ShopLegalDisclosure, { lang }));
    expect(markup).toContain(`dir="${lang === "he" ? "rtl" : "ltr"}"`);
    for (const kind of kinds) expect(markup).toContain(buildLocalizedPublicPath(shopPolicyPaths[kind], lang));
  });

  it("distinguishes payment, access and use without waiving mandatory rights", () => {
    expect(shopPolicyCopy.en.refund.sections[0].paragraphs.join(" ")).toContain("not the same as actual use");
    expect(shopPolicyCopy.en.refund.sections[1].paragraphs.join(" ")).toContain("applicable law");
    expect(shopPolicyCopy.en.refund.sections.at(-1)?.paragraphs.join(" ")).toContain("mandatory rights");
    expect(shopPolicyCopy.en.printable.sections[1].paragraphs.join(" ")).toContain("no numerical limit");
    expect(shopPolicyCopy.en.printable.sections[3].paragraphs.join(" ")).toContain("not currently offered");
  });

  it("keeps the seller's street address out of public sale terms", () => {
    for (const lang of langs) {
      const seller = shopPolicyCopy[lang].sale.sections[0].paragraphs.join(" ");
      expect(seller).not.toMatch(/(?:адрес|address|כתובת):/iu);
    }
  });

  it("makes terms visible before PayPal and corrects the obsolete privacy claim", () => {
    const checkout = readFileSync(`${process.cwd()}/components/shop/PayPalCheckout.tsx`, "utf8");
    expect(checkout.indexOf("<ShopLegalDisclosure lang={lang} />")).toBeLessThan(checkout.indexOf('className="paypal-checkout__paypal-button"'));
    const product = readFileSync(`${process.cwd()}/components/shop/ShopProductDetail.tsx`, "utf8");
    expect(product).toContain("<ShopLegalDisclosure lang={lang} />");
    for (const lang of langs) {
      const privacy = PRIVACY_CONTENT[lang].sections.flatMap((section) => section.paragraphs).join(" ");
      expect(privacy).toContain("PayPal");
      expect(privacy).not.toContain("does not currently process payments through PayPal");
    }
  });
});
