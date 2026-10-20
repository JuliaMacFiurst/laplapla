import { trackEvent } from "@/lib/analytics/client";
import type {
  AnalyticsLang,
  ProductInterestEntryPoint,
  ProductInterestProperties,
} from "@/lib/analytics/events";

export function trackProductInterest(input: {
  productId: string;
  contentSlug: string;
  language: AnalyticsLang;
  entryPoint: ProductInterestEntryPoint;
}) {
  const properties: ProductInterestProperties = {
    section: "shop",
    content_type: "shop_product",
    content_id: input.productId,
    product_id: input.productId,
    content_slug: input.contentSlug,
    language: input.language,
    entry_point: input.entryPoint,
    destination: "checkout",
  };
  trackEvent("product_interest", properties);
}
