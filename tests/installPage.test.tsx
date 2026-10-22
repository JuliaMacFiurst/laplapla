import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { GetServerSidePropsContext } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dictionaries, type Lang } from "@/i18n";
import { proxy } from "@/proxy";
import { NextRequest } from "next/server";

const installState = vi.hoisted(() => ({ standalone: false, installed: false, canPrompt: false }));
vi.mock("@/hooks/usePWAInstall", () => ({
  usePWAInstall: () => ({
    ...installState,
    promptInstall: vi.fn(),
  }),
}));
vi.mock("@/components/SEO", () => ({ default: () => null }));

import InstallPage, { getServerSideProps } from "@/pages/install";

async function props(host: string, lang: Lang, forwardedHost = host) {
  const result = await getServerSideProps({
    locale: lang,
    req: { headers: { host, "x-forwarded-host": forwardedHost } },
  } as unknown as GetServerSidePropsContext);
  if (!("props" in result)) throw new Error("Expected install page props");
  return result.props as { lang: Lang; originMode: "WEB" | "ANDROID_APP" | "UNKNOWN" };
}

function pageHtml(pageProps: Awaited<ReturnType<typeof props>>) {
  return renderToStaticMarkup(createElement(InstallPage, pageProps));
}

beforeEach(() => {
  installState.standalone = false;
  installState.installed = false;
  installState.canPrompt = false;
});

describe("install page origin and display mode", () => {
  it.each(["ru", "en", "he"] as const)("renders a localized, commerce-free Android screen in %s", async (lang) => {
    const pageProps = await props("app.laplapla.com", lang);
    expect(pageProps.originMode).toBe("ANDROID_APP");
    const html = pageHtml(pageProps);
    const copy = dictionaries[lang].pwaInstall;
    const prefix = lang === "ru" ? "" : `/${lang}`;
    expect(html).toContain(copy.androidApp.title);
    expect(html).toContain(copy.androidApp.materialsTitle);
    expect(html).toContain(copy.androidApp.extraText);
    expect(html).toContain(`href="${prefix || "/"}"`);
    expect(html).toContain(`href="${prefix}/account"`);
    expect(html).not.toContain("pwa-install-page__grid");
    expect(html).not.toContain("/shop");
    expect(html).not.toContain("www.laplapla.com");
    expect(html).not.toContain("paypal");
    expect(html).toContain(`dir="${lang === "he" ? "rtl" : "ltr"}"`);
  });

  it.each(["ru", "en", "he"] as const)("keeps the %s PWA instructions on the web origin", async (lang) => {
    const pageProps = await props("www.laplapla.com", lang);
    expect(pageProps.originMode).toBe("WEB");
    const html = pageHtml(pageProps);
    const copy = dictionaries[lang].pwaInstall;
    expect(html).toContain(copy.page.title);
    expect(html).toContain(copy.page.versionsNote);
    expect(html.match(/class="pwa-install-card"/g)).toHaveLength(4);
    expect(html).toContain(copy.page.cards.android.steps[0]);
    expect(html).toContain("disabled");
  });

  it("shows a compact PWA confirmation in standalone mode", async () => {
    const pageProps = await props("www.laplapla.com", "en");
    installState.standalone = true;
    installState.installed = true;
    const html = pageHtml(pageProps);
    expect(html).toContain(dictionaries.en.pwaInstall.webInstalled.title);
    expect(html).not.toContain("pwa-install-page__grid");
    expect(html).toContain('href="/en"');
  });

  it("keeps the browser install prompt available when the PWA can be installed", async () => {
    installState.canPrompt = true;
    const html = pageHtml(await props("www.laplapla.com", "en"));
    expect(html).toContain(dictionaries.en.pwaInstall.page.installButton);
    expect(html).not.toContain("disabled");
    expect(html).toContain("pwa-install-page__grid");
  });

  it("starts with identical hook output on the server and before browser effects", async () => {
    const { usePWAInstall } = await vi.importActual<typeof import("@/hooks/usePWAInstall")>("@/hooks/usePWAInstall");
    const Probe = () => createElement("span", null, String(usePWAInstall().standalone));
    const serverHtml = renderToStaticMarkup(createElement(Probe));
    vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) });
    vi.stubGlobal("navigator", { userAgent: "Android", platform: "Linux" });
    try {
      expect(renderToStaticMarkup(createElement(Probe))).toBe(serverHtml);
      expect(serverHtml).toBe("<span>false</span>");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("does not treat standalone as proof of the Android origin", async () => {
    installState.standalone = true;
    const html = pageHtml(await props("app.laplapla.com", "ru"));
    expect(html).toContain(dictionaries.ru.pwaInstall.androidApp.title);
    expect(html).not.toContain(dictionaries.ru.pwaInstall.webInstalled.title);
  });

  it("fails closed for conflicting host headers and preserves the commerce gate", async () => {
    const pageProps = await props("www.laplapla.com", "en", "app.laplapla.com");
    expect(pageProps.originMode).toBe("UNKNOWN");
    expect(pageHtml(pageProps)).not.toContain("pwa-install-page__grid");
    const appShop = new NextRequest("https://app.laplapla.com/shop", { headers: { host: "app.laplapla.com" } });
    const webShop = new NextRequest("https://www.laplapla.com/shop", { headers: { host: "www.laplapla.com" } });
    expect(proxy(appShop).status).toBe(404);
    expect(proxy(webShop).status).not.toBe(404);
  });
});
