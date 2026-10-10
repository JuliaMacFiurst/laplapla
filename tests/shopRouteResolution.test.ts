import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useCustomerSession", () => ({
  useCustomerSession: () => ({ status: "anonymous", session: null, error: null }),
}));

import { getServerSideProps as getShopIndexProps } from "@/pages/shop/index";
import { getServerSideProps as getShopProductProps } from "@/pages/shop/[slug]";
import { getServerSideProps as getShopCreateProps } from "@/pages/shop/[slug]/create";
import { getLanguageRestoreRedirect } from "@/lib/i18n/languageRestore";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";

const locales = ["ru", "en", "he"] as const;

describe("localized shop route resolution", () => {
  it("keeps the shop index routable for every public locale", async () => {
    await expect(
      getShopIndexProps({} as Parameters<typeof getShopIndexProps>[0]),
    ).resolves.toEqual({ props: {} });

    expect(locales.map((lang) => buildLocalizedPublicPath("/shop", lang))).toEqual([
      "/shop",
      "/en/shop",
      "/he/shop",
    ]);
  });

  it.each(locales)("resolves the Sound Case product for %s", async (lang) => {
    const result = await getShopProductProps({
      params: { slug: "sound-case-001" },
    } as unknown as Parameters<typeof getShopProductProps>[0]);

    expect(result).toEqual({ props: { slug: "sound-case-001" } });
    expect(buildLocalizedPublicPath("/shop/sound-case-001", lang)).toBe(
      lang === "ru" ? "/shop/sound-case-001" : `/${lang}/shop/sound-case-001`,
    );
  });

  it.each(locales)("keeps the protected Sound Case create page routable for %s", async (lang) => {
    const result = await getShopCreateProps({
      params: { slug: "sound-case-001" },
    } as unknown as Parameters<typeof getShopCreateProps>[0]);

    expect(result).toEqual({ props: { slug: "sound-case-001" } });
    expect(buildLocalizedPublicPath("/shop/sound-case-001/create", lang)).toBe(
      lang === "ru"
        ? "/shop/sound-case-001/create"
        : `/${lang}/shop/sound-case-001/create`,
    );
  });

  it("returns application 404 only for unsupported product routes", async () => {
    const productResult = await getShopProductProps({
      params: { slug: "missing-product" },
    } as unknown as Parameters<typeof getShopProductProps>[0]);
    const createResult = await getShopCreateProps({
      params: { slug: "missing-product" },
    } as unknown as Parameters<typeof getShopCreateProps>[0]);

    expect(productResult).toEqual({ notFound: true });
    expect(createResult).toEqual({ notFound: true });
  });

  it("restores a saved non-default language without rewriting an explicit locale", () => {
    expect(getLanguageRestoreRedirect("/shop", "en")).toBe("/en/shop");
    expect(getLanguageRestoreRedirect("/shop/sound-case-001/create", "he")).toBe(
      "/he/shop/sound-case-001/create",
    );
    expect(getLanguageRestoreRedirect("/en/shop", "he")).toBeNull();
    expect(getLanguageRestoreRedirect("/he/shop", "en")).toBeNull();
  });
});
