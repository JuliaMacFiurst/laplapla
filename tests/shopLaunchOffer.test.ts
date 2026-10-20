import { describe, expect, it } from "vitest";
import { getProductById } from "@/lib/shop/catalog";
import { getProductPrice, getQuotedLaunchOffer, LAUNCH_OFFER_COPY, SOUND_CASE_LAUNCH_OFFER_ENABLED } from "@/lib/shop/launchOffer";
import { buildProductJsonLd } from "@/lib/shop/productSeo";

describe("Sound Case launch offer", () => {
  const product = getProductById("sound-case-001")!;

  it("keeps the regular catalog price while charging 39 ILS when enabled", () => {
    expect(product.status).toBe("active");
    expect(product.price).toBe(4900);
    expect(SOUND_CASE_LAUNCH_OFFER_ENABLED).toBe(true);
    expect(getProductPrice(product)).toEqual({ regularMinor: 4900, currentMinor: 3900, savingsMinor: 1000, promotional: true });
    expect(buildProductJsonLd(product, "en")?.offers).toMatchObject({ price: "39.00", priceCurrency: "ILS" });
  });

  it("restores 49 ILS and removes promotional presentation when the one switch is disabled", () => {
    expect(getProductPrice(product, false)).toEqual({ regularMinor: 4900, currentMinor: 4900, savingsMinor: 0, promotional: false });
    expect(getQuotedLaunchOffer(product, { amountMinor: 4900, currency: "ILS" }, false)).toBeNull();
  });

  it("only presents the launch discount when it matches the server quote", () => {
    expect(getQuotedLaunchOffer(product, { amountMinor: 3900, currency: "ILS" })).toMatchObject({ savingsMinor: 1000 });
    expect(getQuotedLaunchOffer(product, { amountMinor: 4900, currency: "ILS" })).toBeNull();
    expect(getQuotedLaunchOffer(product, { amountMinor: 3900, currency: "USD" })).toBeNull();
  });

  it("has equivalent purchase and offer copy for RU, EN and HE", () => {
    expect(LAUNCH_OFFER_COPY.ru.buy).toBe("Купить");
    expect(LAUNCH_OFFER_COPY.en.buy).toBe("Buy");
    expect(LAUNCH_OFFER_COPY.he.buy).toBe("לקנייה");
  });
});
