import type { Lang } from "@/i18n";
import { CHECKOUT_CONSENT_VERSIONS } from "@/lib/legal/checkoutConsent";
import { createServerSupabaseClient } from "@/lib/server/supabase";

type CheckoutConsentRow = {
  order_id: string;
  user_id: string;
  locale: Lang;
  terms_of_sale_version: string;
  refund_policy_version: string;
  printable_license_version: string;
  electronic_receipt_consent_version: string;
};

export async function recordCheckoutConsents(input: { orderId: string; userId: string; lang: Lang }) {
  const db = createServerSupabaseClient({ serviceRole: true });
  const row: CheckoutConsentRow = {
    order_id: input.orderId,
    user_id: input.userId,
    locale: input.lang,
    terms_of_sale_version: CHECKOUT_CONSENT_VERSIONS.termsOfSale,
    refund_policy_version: CHECKOUT_CONSENT_VERSIONS.refundPolicy,
    printable_license_version: CHECKOUT_CONSENT_VERSIONS.printableLicense,
    electronic_receipt_consent_version: CHECKOUT_CONSENT_VERSIONS.electronicReceipt,
  };
  const readExisting = async () => {
    const existing = await db.from("checkout_consents")
      .select("order_id,user_id,locale,terms_of_sale_version,refund_policy_version,printable_license_version,electronic_receipt_consent_version")
      .eq("order_id", input.orderId).maybeSingle();
    if (existing.error) throw existing.error;
    return existing.data;
  };
  const verifyExisting = (existing: CheckoutConsentRow) => {
    // The first accepted locale remains the evidence even if a retry changes UI language.
    if (Object.entries(row).some(([key, value]) =>
      key !== "locale" && existing[key as keyof CheckoutConsentRow] !== value)) {
      throw new Error("Checkout consent version mismatch");
    }
  };

  const existing = await readExisting();
  if (existing) {
    verifyExisting(existing);
    return;
  }

  const { error } = await db.from("checkout_consents").insert(row);
  if (!error) return;

  // Two requests can both read an empty row. The first may advance the order to
  // capture_pending before the second INSERT trigger runs, so that trigger can
  // reject the INSERT before PostgreSQL reaches the primary-key check.
  const concurrentConsent = await readExisting();
  if (!concurrentConsent) throw error;
  verifyExisting(concurrentConsent);
}
