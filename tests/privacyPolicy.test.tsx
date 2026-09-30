import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PRIVACY_CONTENT } from "@/pages/privacy";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";

const text = (lang: keyof typeof PRIVACY_CONTENT) =>
  PRIVACY_CONTENT[lang].sections.flatMap((section) => section.paragraphs).join(" ");

describe("localized privacy policy", () => {
  it.each(["ru", "en", "he"] as const)("covers the current customer data flow in %s", (lang) => {
    const content = text(lang);
    expect(PRIVACY_CONTENT[lang].sections).toHaveLength(13);
    expect(content).toMatch(/Supabase/i);
    expect(content).toMatch(/Google OAuth/i);
    expect(content).toMatch(/3900|39|preorder|предзаказ|מוקדמת/i);
    expect(content).toMatch(/personalization|персонализац|התאמה אישית/i);
    expect(content).toMatch(/analytics|аналитик|ניתוח/i);
    expect(content).toContain("juliamakhlinfiurst@gmail.com");
  });

  it("describes both customer sign-in methods and keeps admin authorization separate", () => {
    expect(text("en")).toContain("Google OAuth");
    expect(text("en")).toContain("one-time magic link");
    expect(text("en")).toContain("separate authorization flow");
    expect(text("ru")).toContain("одноразовую ссылку");
    expect(text("he")).toContain("קישור חד־פעמי");
  });

  it("does not retain obsolete account or admin-only Google claims", () => {
    const all = [text("ru"), text("en"), text("he")].join(" ");
    expect(all).not.toContain("LapLapLa does not create accounts for regular users");
    expect(all).not.toContain("Google OAuth is used only for administrative authentication");
    expect(all).not.toContain("LapLapLa не создаёт аккаунты обычных пользователей");
    expect(all).not.toContain("Google OAuth используется только для административной авторизации");
    expect(all).not.toContain("Google OAuth משמש רק לאימות מנהלי");
  });

  it("states that preorder is single opt-in without payment or general indefinite marketing", () => {
    expect(text("en")).toContain("single opt-in");
    expect(text("en")).toContain("does not involve a payment");
    expect(text("en")).toContain("not used as consent for an indefinite general advertising newsletter");
    expect(text("ru")).toContain("не предполагает оплату");
    expect(text("he")).toContain("אינה כוללת תשלום");
  });

  it("states that preorder PII is excluded from analytics", () => {
    expect(text("en")).toContain("Preorder email addresses");
    expect(text("en")).toContain("are not sent as analytics properties");
    expect(text("ru")).toContain("не передаются как свойства аналитики");
    expect(text("he")).toContain("אינם נשלחים כמאפייני ניתוח שימוש");
  });

  it("keeps the privacy route locale-aware and Hebrew presentation RTL", () => {
    expect(buildLocalizedPublicPath("/privacy", "ru")).toBe("/privacy");
    expect(buildLocalizedPublicPath("/privacy", "en")).toBe("/en/privacy");
    expect(buildLocalizedPublicPath("/privacy", "he")).toBe("/he/privacy");
    const html = renderToStaticMarkup(createElement(
      "main",
      { dir: "rtl" },
      createElement("h1", null, PRIVACY_CONTENT.he.title),
    ));
    expect(html).toContain('dir="rtl"');

    const source = readFileSync(`${process.cwd()}/pages/privacy.tsx`, "utf8");
    expect(source).toContain('dir={lang === "he" ? "rtl" : "ltr"}');
    expect(source).toContain("<SEO title={seo.title} description={seo.description} path={seoPath} />");
  });
});
