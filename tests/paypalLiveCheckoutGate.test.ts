import { afterEach, describe, expect, it, vi } from "vitest";
import type { GetServerSidePropsContext } from "next";
vi.mock("@/hooks/useCustomerSession", () => ({
  useCustomerSession: () => ({ status: "anonymous", session: null, error: null }),
}));
import { getServerSideProps } from "@/pages/shop/[slug]/checkout";
import { getShopCheckoutAvailability, isPayPalCheckoutAvailableForCustomer } from "@/lib/server/commerce/paypal/checkoutAvailability";
import { getPayPalServerConfig } from "@/lib/server/commerce/paypal/config";
import { createPrivateLiveCheckoutCookie, PRIVATE_LIVE_TEST_COOKIE } from "@/lib/server/commerce/paypal/privateLiveTest";

const context = { params: { slug: "sound-case-001" } } as unknown as GetServerSidePropsContext;

function configure(environment: "sandbox" | "live") {
  vi.stubEnv("PAYPAL_ENVIRONMENT", environment);
  vi.stubEnv("PAYPAL_CLIENT_ID", "public-test-client-id");
  vi.stubEnv("PAYPAL_CLIENT_SECRET", "server-only-test-secret");
  vi.stubEnv("SHOP_LIVE_CHECKOUT_ENABLED", "false");
  vi.stubEnv("RECEIPT_ORIGINAL_EMAIL_ENABLED", "true");
  vi.stubEnv("RESEND_API_KEY", "server-only-test-resend-key");
  vi.stubEnv("RESEND_FROM_EMAIL", "LapLapLa <support@example.test>");
  vi.stubEnv("RECEIPT_PDF_STORAGE_BUCKET", "receipt-pdfs");
}

afterEach(() => vi.unstubAllEnvs());

describe("server-side PayPal checkout gate", () => {
  it("keeps Sandbox available independently of the Live flag", async () => {
    configure("sandbox");
    expect(await getServerSideProps(context)).toEqual({ props: { slug: "sound-case-001", environment: "sandbox" } });
  });

  it("closes Live by default", async () => {
    configure("live");
    expect(await getServerSideProps(context)).toEqual({ notFound: true });
  });

  it.each(["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "RECEIPT_ORIGINAL_EMAIL_ENABLED", "RESEND_API_KEY", "RESEND_FROM_EMAIL", "RECEIPT_PDF_STORAGE_BUCKET"])(
    "keeps Live closed when %s is unavailable", async (name) => {
      configure("live");
      vi.stubEnv("SHOP_LIVE_CHECKOUT_ENABLED", "true");
      vi.stubEnv(name, "");
      expect(await getServerSideProps(context)).toEqual({ notFound: true });
    },
  );

  it("opens configured Live checkout without exposing server credentials in props", async () => {
    configure("live");
    vi.stubEnv("SHOP_LIVE_CHECKOUT_ENABLED", "true");
    const result = await getServerSideProps(context);
    expect(result).toEqual({ props: { slug: "sound-case-001", environment: "live" } });
    expect(JSON.stringify(result)).not.toContain("server-only-test-secret");
    expect(JSON.stringify(result)).not.toContain("server-only-test-resend-key");
  });

  it("restricts a private Live test to one confirmed user while public CTAs stay closed", async () => {
    configure("live");
    vi.stubEnv("RECEIPT_ORIGINAL_EMAIL_ENABLED", "false");
    vi.stubEnv("SHOP_PRIVATE_LIVE_TEST_ENABLED", "true");
    vi.stubEnv("SHOP_PRIVATE_LIVE_TEST_RECEIPT_EMAIL_ENABLED", "true");
    vi.stubEnv("SHOP_PRIVATE_LIVE_TEST_USER_ID", "11111111-1111-4111-8111-111111111111");
    vi.stubEnv("SHOP_PRIVATE_LIVE_TEST_NOT_BEFORE", new Date(Date.now() - 60_000).toISOString());
    const config = getPayPalServerConfig();
    expect(getShopCheckoutAvailability()).toBe(false);
    expect(await getServerSideProps(context)).toEqual({ notFound: true });
    const cookie = createPrivateLiveCheckoutCookie(config, { id: "11111111-1111-4111-8111-111111111111", email_confirmed_at: "2026-10-01" });
    const value = cookie?.split(";")[0]?.split("=")[1];
    const permittedContext = { ...context, req: { cookies: { [PRIVATE_LIVE_TEST_COOKIE]: value } } } as unknown as GetServerSidePropsContext;
    expect(await getServerSideProps(permittedContext)).toEqual({ props: { slug: "sound-case-001", environment: "live" } });
    vi.stubEnv("SHOP_PRIVATE_LIVE_TEST_ENABLED", "false");
    expect(await getServerSideProps(permittedContext)).toEqual({ props: { slug: "sound-case-001", environment: "live" } });
    vi.stubEnv("SHOP_PRIVATE_LIVE_TEST_ENABLED", "true");
    expect(await getServerSideProps({ ...context, req: { cookies: { [PRIVATE_LIVE_TEST_COOKIE]: "invalid" } } } as unknown as GetServerSidePropsContext)).toEqual({ notFound: true });
    expect(isPayPalCheckoutAvailableForCustomer(config, { id: "11111111-1111-4111-8111-111111111111", email_confirmed_at: "2026-10-01" })).toBe(true);
    expect(isPayPalCheckoutAvailableForCustomer(config, { id: "22222222-2222-4222-8222-222222222222", email_confirmed_at: "2026-10-01" })).toBe(false);
    expect(isPayPalCheckoutAvailableForCustomer(config, { id: "11111111-1111-4111-8111-111111111111", email_confirmed_at: null })).toBe(false);
    vi.stubEnv("SHOP_PRIVATE_LIVE_TEST_NOT_BEFORE", new Date(Date.now() - 25 * 60 * 60_000).toISOString());
    expect(isPayPalCheckoutAvailableForCustomer(config, { id: "11111111-1111-4111-8111-111111111111", email_confirmed_at: "2026-10-01" })).toBe(false);
  });

  it("does not permit a private test without complete configuration or in Sandbox", async () => {
    configure("live");
    vi.stubEnv("RECEIPT_ORIGINAL_EMAIL_ENABLED", "false");
    vi.stubEnv("SHOP_PRIVATE_LIVE_TEST_ENABLED", "true");
    vi.stubEnv("SHOP_PRIVATE_LIVE_TEST_RECEIPT_EMAIL_ENABLED", "true");
    vi.stubEnv("SHOP_PRIVATE_LIVE_TEST_USER_ID", "11111111-1111-4111-8111-111111111111");
    expect(await getServerSideProps(context)).toEqual({ notFound: true });
    vi.stubEnv("SHOP_PRIVATE_LIVE_TEST_NOT_BEFORE", new Date(Date.now() - 60_000).toISOString());
    vi.stubEnv("SHOP_PRIVATE_LIVE_TEST_RECEIPT_EMAIL_ENABLED", "false");
    expect(await getServerSideProps(context)).toEqual({ notFound: true });
  });
});
