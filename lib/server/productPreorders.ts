import { createServerSupabaseClient } from "@/lib/server/supabase";
import { SOUND_CASE_PREORDER_OFFER } from "@/lib/server/commerce/preorderOffers";
import {
  MAX_PREORDER_EMAIL_LENGTH,
  type PreorderOfferStatus,
} from "@/lib/shop/preorders";
import type { Lang } from "@/i18n";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export function normalizePreorderEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidPreorderEmail(value: string) {
  const normalized = normalizePreorderEmail(value);
  return (
    normalized.length >= 3 &&
    normalized.length <= MAX_PREORDER_EMAIL_LENGTH &&
    EMAIL_PATTERN.test(normalized) &&
    !/[<>\u0000-\u001f\u007f]/u.test(normalized)
  );
}

type RegisterPreorderResult = {
  status: PreorderOfferStatus | "registered";
  created: boolean;
};

export async function registerSoundCasePreorder(input: {
  email: string;
  locale: Lang;
}): Promise<RegisterPreorderResult> {
  const emailNormalized = normalizePreorderEmail(input.email);
  const supabase = createServerSupabaseClient({ serviceRole: true });
  const { data, error } = await supabase.rpc("register_product_preorder", {
    target_product_id: SOUND_CASE_PREORDER_OFFER.productId,
    target_offer_code: SOUND_CASE_PREORDER_OFFER.offerCode,
    target_email_normalized: emailNormalized,
    target_preferred_locale: input.locale,
    target_eligible_price_minor: SOUND_CASE_PREORDER_OFFER.priceMinor,
    target_currency: SOUND_CASE_PREORDER_OFFER.currency,
    target_consent_version: SOUND_CASE_PREORDER_OFFER.consentVersion,
  });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") {
    throw new Error("Preorder registration returned no result");
  }

  const result = (row as { result?: unknown }).result;
  const created = (row as { created?: unknown }).created === true;
  if (result === "closed") return { status: "closed", created: false };
  if (result !== "registered") {
    throw new Error("Preorder registration returned an invalid result");
  }

  return { status: "registered", created };
}
