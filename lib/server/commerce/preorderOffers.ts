import { createServerSupabaseClient } from "@/lib/server/supabase";
import type { PreorderOfferStatus } from "@/lib/shop/preorders";

export const SOUND_CASE_PREORDER_OFFER = Object.freeze({
  productId: "sound-case-001",
  offerCode: "sound-case-001-preorder",
  priceMinor: 3900,
  currency: "ILS" as const,
  consentVersion: "sound-case-preorder-v1",
});

export async function getSoundCasePreorderOfferStatus(): Promise<PreorderOfferStatus> {
  const supabase = createServerSupabaseClient({ serviceRole: true });
  const { data, error } = await supabase
    .from("product_preorder_offers")
    .select("status")
    .eq("offer_code", SOUND_CASE_PREORDER_OFFER.offerCode)
    .eq("product_id", SOUND_CASE_PREORDER_OFFER.productId)
    .maybeSingle();

  if (error) throw error;
  return data?.status === "open" ? "open" : "closed";
}
