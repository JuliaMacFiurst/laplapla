import { getPayPalCheckoutOrderForCustomer } from "@/lib/server/commerce/paypal/orders";
import { createServerSupabaseClient } from "@/lib/server/supabase";
import { PAYPAL_CHECKOUT_PRODUCT_ID } from "@/lib/shop/paypalCheckout";

export type PurchaseSuccessState = "ready" | "processing" | "unconfirmed";

export async function getPurchaseSuccessState(orderId: string, userId: string, accessToken: string): Promise<PurchaseSuccessState | null> {
  const order = await getPayPalCheckoutOrderForCustomer(orderId, userId);
  if (!order || order.productId !== PAYPAL_CHECKOUT_PRODUCT_ID) return null;
  if (order.status !== "paid" || !order.providerCaptureId) return "unconfirmed";

  const supabase = createServerSupabaseClient({ serviceRole: true });
  const { data: refund, error: refundError } = await supabase
    .from("commerce_refund_operations")
    .select("id")
    .eq("order_id", orderId)
    .eq("status", "completed")
    .limit(1)
    .maybeSingle();
  if (refundError) throw refundError;
  if (refund) return "unconfirmed";
  if (!order.entitlementId) return "processing";

  const customerSupabase = createServerSupabaseClient({ accessToken });
  const { data: entitlement, error: entitlementError } = await customerSupabase
    .from("product_entitlements")
    .select("id")
    .eq("id", order.entitlementId)
    .eq("user_id", userId)
    .eq("product_id", PAYPAL_CHECKOUT_PRODUCT_ID)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (entitlementError) throw entitlementError;
  return entitlement ? "ready" : "processing";
}
