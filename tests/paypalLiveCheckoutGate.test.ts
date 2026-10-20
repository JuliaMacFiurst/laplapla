import { afterEach, describe, expect, it, vi } from "vitest";
import type { GetServerSidePropsContext } from "next";
vi.mock("@/hooks/useCustomerSession", () => ({
  useCustomerSession: () => ({ status: "anonymous", session: null, error: null }),
}));
import { getServerSideProps } from "@/pages/shop/[slug]/checkout";

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
});
