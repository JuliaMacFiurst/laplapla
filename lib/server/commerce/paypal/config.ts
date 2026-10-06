export type PayPalEnvironment = "sandbox" | "live";

export type PayPalServerConfig = {
  environment: PayPalEnvironment;
  clientId: string;
  clientSecret: string;
  apiBaseUrl: string;
  sdkUrl: string;
};

export type PayPalWebhookConfig = PayPalServerConfig & {
  webhookId: string;
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

export function getPayPalWebhookConfig(): PayPalWebhookConfig {
  const config = getPayPalServerConfig();
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();

  if (!webhookId || !/^[A-Za-z0-9]{1,50}$/u.test(webhookId)) {
    throw new Error("PayPal webhook ID is not configured");
  }

  return { ...config, webhookId };
}

export function getPayPalSdkUrl(environment: PayPalEnvironment) {
  return PAYPAL_ENDPOINTS[environment].sdkUrl;
}
