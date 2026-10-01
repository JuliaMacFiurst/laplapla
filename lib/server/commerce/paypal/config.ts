export type PayPalEnvironment = "sandbox" | "live";

export type PayPalServerConfig = {
  environment: PayPalEnvironment;
  clientId: string;
  clientSecret: string;
  apiBaseUrl: string;
  sdkUrl: string;
};

const PAYPAL_ENDPOINTS: Record<PayPalEnvironment, { apiBaseUrl: string; sdkUrl: string }> = {
  sandbox: {
    apiBaseUrl: "https://api-m.sandbox.paypal.com",
    sdkUrl: "https://www.sandbox.paypal.com/web-sdk/v6/core",
  },
  live: {
    apiBaseUrl: "https://api-m.paypal.com",
    sdkUrl: "https://www.paypal.com/web-sdk/v6/core",
  },
};

export function resolvePayPalEnvironment(value: string | undefined): PayPalEnvironment {
  if (value === "sandbox" || value === "live") return value;
  throw new Error("PayPal environment is not configured");
}

export function getPayPalServerConfig(): PayPalServerConfig {
  const environment = resolvePayPalEnvironment(process.env.PAYPAL_ENVIRONMENT);
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error("PayPal server credentials are not configured");
  }

  return {
    environment,
    clientId,
    clientSecret,
    ...PAYPAL_ENDPOINTS[environment],
  };
}

export function getPayPalPublicConfig() {
  const config = getPayPalServerConfig();
  return {
    clientId: config.clientId,
    environment: config.environment,
  };
}

export function getPayPalSdkUrl(environment: PayPalEnvironment) {
  return PAYPAL_ENDPOINTS[environment].sdkUrl;
}
