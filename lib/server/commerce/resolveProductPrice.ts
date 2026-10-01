import type { User } from "@supabase/supabase-js";
import { getProductById } from "@/lib/shop/catalog";
import { createServerSupabaseClient } from "@/lib/server/supabase";
import { normalizePreorderEmail } from "@/lib/server/productPreorders";
import { SOUND_CASE_PREORDER_OFFER } from "@/lib/server/commerce/preorderOffers";

export type VerifiedCustomer = Pick<User, "id" | "email" | "email_confirmed_at">;

export type ResolvedProductPrice =
  | { status: "already_owned"; productId: string }
  | {
      status: "priced";
      productId: string;
      priceMinor: number;
      currency: string;
      source: "catalog" | "preorder";
    };

export async function resolveProductPrice(input: {
  verifiedCustomer: VerifiedCustomer;
  productId: string;
}): Promise<ResolvedProductPrice> {
  const product = getProductById(input.productId);
  if (!product) throw new Error("Unknown product");

  const supabase = createServerSupabaseClient({ serviceRole: true });
  const { data: entitlement, error: entitlementError } = await supabase
    .from("product_entitlements")
    .select("id")
    .eq("user_id", input.verifiedCustomer.id)
    .eq("product_id", product.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (entitlementError) throw entitlementError;
  if (entitlement) {
    return { status: "already_owned", productId: product.id };
  }

  const canonicalPrice = {
    status: "priced" as const,
    productId: product.id,
    priceMinor: product.price,
    currency: product.currency,
    source: "catalog" as const,
  };

  if (
    product.id !== SOUND_CASE_PREORDER_OFFER.productId ||
    !input.verifiedCustomer.email ||
    !input.verifiedCustomer.email_confirmed_at
  ) {
    return canonicalPrice;
  }

  const emailNormalized = normalizePreorderEmail(input.verifiedCustomer.email);
  const { data: preorder, error: preorderError } = await supabase
    .from("product_preorders")
    .select("eligible_price_minor, currency")
    .eq("product_id", product.id)
    .eq("offer_code", SOUND_CASE_PREORDER_OFFER.offerCode)
    .eq("email_normalized", emailNormalized)
    .limit(1)
    .maybeSingle();

  if (preorderError) throw preorderError;
  if (!preorder) return canonicalPrice;

  return {
    status: "priced",
    productId: product.id,
    priceMinor: preorder.eligible_price_minor as number,
    currency: preorder.currency as string,
    source: "preorder",
  };
}
