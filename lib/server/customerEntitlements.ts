import { createServerSupabaseClient } from "@/lib/server/supabase";
import type { CustomerProfile, ProductEntitlement } from "@/lib/customer/types";
import { getCustomerPurchases } from "@/lib/server/customerPurchases";

export async function getCustomerAccountData(accessToken: string, userId: string) {
  const supabase = createServerSupabaseClient({ accessToken });
  const [profileResult, entitlementResult] = await Promise.all([
    supabase
      .from("customer_profiles")
      .select("user_id, created_at, updated_at, billing_name")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("product_entitlements")
      .select("id, user_id, product_id, source, status, granted_at, created_at, updated_at")
      .eq("user_id", userId)
      .order("granted_at", { ascending: false }),
  ]);

  if (profileResult.error) {
    throw profileResult.error;
  }
  if (entitlementResult.error) {
    throw entitlementResult.error;
  }

  const entitlements = (entitlementResult.data ?? []) as ProductEntitlement[];
  const commerce = await getCustomerPurchases(userId, entitlements);
  return {
    profile: (profileResult.data ?? null) as CustomerProfile | null,
    entitlements,
    ...commerce,
  };
}

export async function customerHasActiveProductEntitlement(
  accessToken: string,
  userId: string,
  productId: string,
) {
  const supabase = createServerSupabaseClient({ accessToken });
  const { data, error } = await supabase
    .from("product_entitlements")
    .select("id")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}
