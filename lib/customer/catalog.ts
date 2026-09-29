import type { Lang } from "@/i18n";
import { getLocalizedShortDescription, getLocalizedTitle, getProductById } from "@/lib/shop/catalog";
import type { ProductEntitlement } from "./types";

export type CustomerProduct = {
  entitlement: ProductEntitlement;
  product: NonNullable<ReturnType<typeof getProductById>>;
  title: string;
  description: string;
};

export function resolveEntitledCatalogProducts(
  entitlements: readonly ProductEntitlement[],
  lang: Lang,
): CustomerProduct[] {
  return entitlements.flatMap((entitlement) => {
    const product = getProductById(entitlement.product_id);
    if (!product) {
      return [];
    }

    return [{
      entitlement,
      product,
      title: getLocalizedTitle(product, lang),
      description: getLocalizedShortDescription(product, lang),
    }];
  });
}

export function hasActiveEntitlement(
  entitlements: readonly Pick<ProductEntitlement, "product_id" | "status">[],
  productId: string,
) {
  return entitlements.some(
    (entitlement) => entitlement.product_id === productId && entitlement.status === "active",
  );
}
