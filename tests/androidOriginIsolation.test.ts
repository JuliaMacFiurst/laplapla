import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { classifyOriginHost, initialOriginMode, isPurchaseApi, isPurchasePage } from "@/lib/runtime/originMode";
import { requireWebCommerceOrigin } from "@/lib/server/commerce/originGuard";
import { buildCustomerAuthCallbackUrl, resolveCustomerDestination } from "@/lib/customer/authRouting";

function request(host: string, path: string, forwardedHost?: string) {
  const headers: Record<string, string> = { host };
  if (forwardedHost) headers["x-forwarded-host"] = forwardedHost;
  return new NextRequest(`https://${host}${path}`, { headers });
}

describe("origin trust boundary", () => {
  it("uses exact hosts and rejects conflicting forwarded hosts", () => {
    expect(classifyOriginHost("www.laplapla.com", "www.laplapla.com", true)).toBe("WEB");
    expect(classifyOriginHost("app.laplapla.com", "app.laplapla.com", true)).toBe("ANDROID_APP");
    for (const host of ["evil.example", "www.laplapla.com.evil.example", "preview.vercel.app", "WWW.LAPLAPLA.COM:443"]) {
      expect(classifyOriginHost(host, undefined, true)).toBe("UNKNOWN");
    }
    expect(classifyOriginHost("app.laplapla.com", "www.laplapla.com", true)).toBe("UNKNOWN");
    expect(classifyOriginHost("www.laplapla.com", undefined, true)).toBe("WEB");
    expect(classifyOriginHost("app.laplapla.com", undefined, true)).toBe("ANDROID_APP");
  });

  it("starts static pages without commercial UI until the browser host is known", () => {
    expect(initialOriginMode({})).toBe("UNKNOWN");
    expect(initialOriginMode({ originMode: "WEB" })).toBe("WEB");
    expect(initialOriginMode({ originMode: "ANDROID_APP" })).toBe("ANDROID_APP");
    expect(initialOriginMode({ originMode: "www.laplapla.com" })).toBe("UNKNOWN");
    const appSource = readFileSync(`${process.cwd()}/pages/_app.tsx`, "utf8");
    expect(appSource).not.toContain("MyApp.getInitialProps");
  });

  it("keeps free routes on preview while failing closed for preview payments", () => {
    expect(proxy(request("preview.vercel.app", "/raccoons")).status).not.toBe(404);
    expect(proxy(request("preview.vercel.app", "/shop")).status).toBe(404);
    expect(proxy(request("preview.vercel.app", "/api/customer/checkout/paypal/create")).status).toBe(404);
  });

  it("accepts matching forwarded headers and preserves the www PayPal webhook", () => {
    expect(proxy(request("www.laplapla.com", "/shop", "www.laplapla.com")).status).not.toBe(404);
    expect(proxy(request("app.laplapla.com", "/raccoons", "app.laplapla.com")).status).not.toBe(404);
    expect(proxy(request("www.laplapla.com", "/api/webhooks/paypal", "www.laplapla.com")).status).not.toBe(404);
    expect(proxy(request("app.laplapla.com", "/api/webhooks/paypal", "app.laplapla.com")).status).not.toBe(404);
  });

  it.each(["/shop", "/en/shop/sound-case-001", "/he/shop/sound-case-001/checkout", "/shop/sound-case-001/preorder", "/shop/sound-case-001/success", "/_next/data/build/en/shop/sound-case-001.json"])("blocks app purchase page %s", (path) => {
    expect(isPurchasePage(path)).toBe(true);
    expect(proxy(request("app.laplapla.com", path)).status).toBe(404);
  });

  it("allows entitled-content route and free pages", () => {
    expect(isPurchasePage("/he/shop/sound-case-001/create")).toBe(false);
    expect(proxy(request("app.laplapla.com", "/he/shop/sound-case-001/create")).status).not.toBe(404);
    expect(proxy(request("app.laplapla.com", "/raccoons")).status).not.toBe(404);
    expect(proxy(request("www.laplapla.com", "/shop")).status).not.toBe(404);
  });

  it.each(["/api/customer/checkout/paypal/create", "/api/customer/checkout/paypal/capture", "/api/customer/checkout/paypal/resume", "/api/shop/paypal/config", "/api/shop/preorders"])("blocks app commerce API %s", (path) => {
    expect(isPurchaseApi(path)).toBe(true);
    expect(proxy(request("app.laplapla.com", path)).status).toBe(404);
  });

  it("also enforces the boundary inside payment handlers", () => {
    const responses: number[] = [];
    const res = { setHeader: () => {}, status: (code: number) => { responses.push(code); return { json: () => {} }; } };
    expect(requireWebCommerceOrigin({ headers: { host: "app.laplapla.com" } } as never, res as never)).toBe(false);
    expect(responses).toEqual([403]);
    expect(requireWebCommerceOrigin({ headers: { host: "www.laplapla.com", "x-forwarded-host": "app.laplapla.com" } } as never, res as never)).toBe(false);
    expect(requireWebCommerceOrigin({ headers: { host: "www.laplapla.com" } } as never, res as never)).toBe(true);
  });

  it.each(["ru", "en", "he"] as const)("keeps OAuth on the app origin and rejects purchase next in %s", (lang) => {
    const prefix = lang === "ru" ? "" : `/${lang}`;
    expect(buildCustomerAuthCallbackUrl("https://app.laplapla.com", lang)).toBe(`https://app.laplapla.com${prefix}/auth/callback`);
    expect(resolveCustomerDestination(`${prefix}/shop/sound-case-001/checkout`, lang, "ANDROID_APP")).toBe(`${prefix}/account`);
    expect(resolveCustomerDestination(`${prefix}/shop/sound-case-001/create`, lang, "ANDROID_APP")).toBe(`${prefix}/shop/sound-case-001/create`);
  });

  it("rejects an attacker-controlled OAuth callback origin", () => {
    expect(() => buildCustomerAuthCallbackUrl("https://app.laplapla.com.evil.example", "en")).toThrow();
    expect(() => buildCustomerAuthCallbackUrl("http://app.laplapla.com", "en")).toThrow();
  });

  it("does not cache shop pages on the app service worker", () => {
    const source = readFileSync(`${process.cwd()}/service-worker/sw.template.js`, "utf8");
    expect(source).toContain('self.location.hostname === "app.laplapla.com"');
    expect(source).toContain('pathname.includes("/shop/")');
  });
});
