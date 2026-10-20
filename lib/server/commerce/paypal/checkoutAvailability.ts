import { getPayPalServerConfig, type PayPalServerConfig } from "./config";
import { hasPrivateLiveTestConfiguration, isPrivateLiveTestCustomer } from "./privateLiveTest";

export function isPayPalCheckoutAvailable(config: PayPalServerConfig): boolean {
  if (!config.clientId?.trim() || !config.clientSecret?.trim()) return false;
  if (config.environment === "sandbox") return true;
  if (config.environment !== "live") return false;

  return process.env.SHOP_LIVE_CHECKOUT_ENABLED === "true"
    && process.env.RECEIPT_ORIGINAL_EMAIL_ENABLED === "true"
    && Boolean(process.env.RESEND_API_KEY?.trim())
    && Boolean(process.env.RESEND_FROM_EMAIL?.trim())
    && Boolean(process.env.RECEIPT_PDF_STORAGE_BUCKET?.trim());
}

export function getShopCheckoutAvailability(): boolean {
  try {
    return isPayPalCheckoutAvailable(getPayPalServerConfig());
  } catch {
    return false;
  }
}

export function isPrivateLiveCheckoutPageAvailable(config: PayPalServerConfig) {
  return Boolean(config.clientId?.trim() && config.clientSecret?.trim()) && hasPrivateLiveTestConfiguration(config);
}

export function isPayPalCheckoutAvailableForCustomer(
  config: PayPalServerConfig,
  user: { id: string; email_confirmed_at?: string | null },
) {
  return isPayPalCheckoutAvailable(config) || isPrivateLiveTestCustomer(config, user);
}
