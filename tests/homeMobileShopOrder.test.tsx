import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import Home from "@/pages/Home";
import type { Lang } from "@/i18n";

const viewport = vi.hoisted(() => ({ mobile: false }));

vi.mock("@/hooks/useIsMobile", () => ({ useIsMobile: () => viewport.mobile }));
vi.mock("next/router", () => ({ useRouter: () => ({ pathname: "/", locale: "ru" }) }));
vi.mock("@/components/SEO", () => ({ default: () => null }));

const sectionIndex = (html: string, className: string) => html.indexOf(`class="${className}`);

describe("home section order", () => {
  for (const lang of ["ru", "en", "he"] as Lang[]) {
    it(`places the one shop section after the preorder banner on ${lang} mobile`, () => {
      viewport.mobile = true;
      const html = renderToStaticMarkup(<Home lang={lang} retention={null} />);
      const banner = sectionIndex(html, "sound-case-home-promo");
      const shop = sectionIndex(html, "home-shop-spotlight");
      const latest = sectionIndex(html, "home-retention-section");

      expect(banner).toBeGreaterThan(0);
      expect(shop).toBeGreaterThan(banner);
      expect(latest).toBeGreaterThan(shop);
      expect(html.match(/class="home-shop-spotlight"/g)).toHaveLength(1);
      expect(html).toContain(`href="${lang === "ru" ? "" : `/${lang}`}/shop"`);
      expect(html).toContain(`dir="${lang === "he" ? "rtl" : "ltr"}"`);
    });

    it(`preserves the desktop banner, cards, latest, shop order on ${lang}`, () => {
      viewport.mobile = false;
      const html = renderToStaticMarkup(<Home lang={lang} retention={null} />);
      const banner = sectionIndex(html, "sound-case-home-promo");
      const cards = sectionIndex(html, "grid");
      const latest = sectionIndex(html, "home-retention-section");
      const shop = sectionIndex(html, "home-shop-spotlight");

      expect(banner).toBeGreaterThan(0);
      expect(cards).toBeGreaterThan(banner);
      expect(latest).toBeGreaterThan(cards);
      expect(shop).toBeGreaterThan(latest);
      expect(html.match(/class="home-shop-spotlight"/g)).toHaveLength(1);
    });
  }
});
