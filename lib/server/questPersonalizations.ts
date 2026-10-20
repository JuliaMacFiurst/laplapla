import { createServerSupabaseClient } from "@/lib/server/supabase";
import type { ProductEntitlement } from "@/lib/customer/types";
import type { QuestPersonalization } from "@/lib/shop/questPersonalization";

type ActiveEntitlement = Pick<ProductEntitlement, "id" | "user_id" | "product_id" | "status">;

export async function getActiveCustomerProductEntitlement(
  accessToken: string,
  userId: string,
  productId: string,
): Promise<ActiveEntitlement | null> {
  const supabase = createServerSupabaseClient({ accessToken });
  const { data, error } = await supabase
    .from("product_entitlements")
    .select("id, user_id, product_id, status")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .eq("status", "active")
    .order("granted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as ActiveEntitlement | null;
}

export async function loadQuestPersonalization(
  accessToken: string,
  entitlement: ActiveEntitlement,
) {
  const supabase = createServerSupabaseClient({ accessToken });
  const { data, error } = await supabase
    .from("quest_personalizations")
    .select("payload, updated_at")
    .eq("entitlement_id", entitlement.id)
    .eq("user_id", entitlement.user_id)
    .eq("product_id", entitlement.product_id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return {
    personalization: data.payload as QuestPersonalization,
    updatedAt: data.updated_at as string,
  };
}

export async function saveQuestPersonalization(
  entitlement: ActiveEntitlement,
  personalization: QuestPersonalization,
) {
  const supabase = createServerSupabaseClient({ serviceRole: true });
  const { data, error } = await supabase
    .from("quest_personalizations")
    .upsert({
      entitlement_id: entitlement.id,
      user_id: entitlement.user_id,
      product_id: entitlement.product_id,
      payload: personalization,
    }, { onConflict: "entitlement_id" })
    .select("payload, updated_at")
    .single();

  if (error) throw error;
  return {
    personalization: data.payload as QuestPersonalization,
    updatedAt: data.updated_at as string,
  };
}
