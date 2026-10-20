import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/server/supabase";

const CONTROL_OR_FORMAT = /[\p{Cc}\p{Cf}]/u;
const HAS_LETTER = /\p{L}/u;

export class BillingIdentityError extends Error {
  constructor(public readonly code: "billing_identity_required" | "invalid_billing_name" | "verified_email_required") {
    super(code);
  }
}

export function normalizeBillingName(value: unknown) {
  if (typeof value !== "string") throw new BillingIdentityError("invalid_billing_name");
  if (CONTROL_OR_FORMAT.test(value)) throw new BillingIdentityError("invalid_billing_name");
  const normalized = value.normalize("NFC").trim().replace(/\s+/gu, " ");
  const length = Array.from(normalized).length;
  if (length < 2 || length > 160 || CONTROL_OR_FORMAT.test(normalized) || !HAS_LETTER.test(normalized)) {
    throw new BillingIdentityError("invalid_billing_name");
  }
  return normalized;
}

export function requireVerifiedCustomerEmail(user: User) {
  const email = user.email?.trim().toLocaleLowerCase("en-US") ?? "";
  if (!user.email_confirmed_at || email.length < 3 || email.length > 320) {
    throw new BillingIdentityError("verified_email_required");
  }
  return email;
}

export async function getTrustedBillingIdentity(user: User) {
  const email = requireVerifiedCustomerEmail(user);
  const supabase = createServerSupabaseClient({ serviceRole: true });
  const { data, error } = await supabase
    .from("customer_profiles")
    .select("billing_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  const billingName = data?.billing_name ? normalizeBillingName(data.billing_name) : null;
  return { billingName, email, complete: Boolean(billingName) };
}

export async function saveTrustedBillingIdentity(user: User, value: unknown) {
  const email = requireVerifiedCustomerEmail(user);
  const billingName = normalizeBillingName(value);
  const supabase = createServerSupabaseClient({ serviceRole: true });
  const { error } = await supabase.from("customer_profiles").upsert(
    { user_id: user.id, billing_name: billingName },
    { onConflict: "user_id" },
  );
  if (error) throw error;
  return { billingName, email, complete: true as const };
}

export async function requireTrustedBillingIdentity(user: User) {
  const identity = await getTrustedBillingIdentity(user);
  if (!identity.billingName) throw new BillingIdentityError("billing_identity_required");
  return { billingName: identity.billingName, email: identity.email };
}
