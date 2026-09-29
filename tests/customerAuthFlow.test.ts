import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildCustomerAuthCallbackUrl,
  consumeCustomerAuthDestination,
  CUSTOMER_AUTH_NEXT_STORAGE_KEY,
  getDefaultCustomerDestination,
  resolveCustomerDestination,
  storeCustomerAuthDestination,
} from "@/lib/customer/authRouting";
import { getCustomerNavigationLabel } from "@/lib/customer/authUi";

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

describe("customer OAuth routing", () => {
  it.each([
    ["ru", "https://www.laplapla.com/auth/callback", "/account"],
    ["en", "https://www.laplapla.com/en/auth/callback", "/en/account"],
    ["he", "https://www.laplapla.com/he/auth/callback", "/he/account"],
  ] as const)("builds an exact customer callback for %s", (lang, callback, account) => {
    expect(buildCustomerAuthCallbackUrl("https://www.laplapla.com", lang)).toBe(callback);
    expect(getDefaultCustomerDestination(lang)).toBe(account);
  });

  it.each([
    ["ru", "http://localhost:3000/auth/callback"],
    ["en", "http://localhost:3000/en/auth/callback"],
    ["he", "http://localhost:3000/he/auth/callback"],
  ] as const)("builds the localhost callback for %s", (lang, callback) => {
    expect(buildCustomerAuthCallbackUrl("http://localhost:3000", lang)).toBe(callback);
  });

  it("never sends customer Google sign-in to an admin route", () => {
    const signInSource = readFileSync(`${process.cwd()}/pages/account/sign-in.tsx`, "utf8");
    expect(signInSource).toContain("supabase.auth.signInWithOAuth");
    expect(signInSource).toContain("buildCustomerAuthCallbackUrl");
    expect(signInSource).not.toContain("admin-login");
    expect(buildCustomerAuthCallbackUrl("https://www.laplapla.com", "en"))
      .not.toContain("admin");
    expect(signInSource).not.toContain("upload-lessons");
  });

  it("uses one coherent implicit browser flow for hash-token callbacks", () => {
    const clientSource = readFileSync(`${process.cwd()}/lib/supabase.ts`, "utf8");
    const callbackSource = readFileSync(`${process.cwd()}/pages/auth/callback.tsx`, "utf8");
    expect(clientSource).toContain('flowType: "implicit"');
    expect(clientSource).toContain("detectSessionInUrl: true");
    expect(callbackSource).toContain("supabase.auth.initialize()");
    expect(callbackSource).not.toContain("exchangeCodeForSession");
  });

  it("returns to the localized account when callback has no next destination", () => {
    const storage = memoryStorage();
    expect(consumeCustomerAuthDestination(storage, undefined, "ru")).toBe("/account");
    expect(consumeCustomerAuthDestination(storage, undefined, "en")).toBe("/en/account");
    expect(consumeCustomerAuthDestination(storage, undefined, "he")).toBe("/he/account");
  });

  it.each([
    ["ru", "/shop/sound-case-001/create"],
    ["en", "/en/shop/sound-case-001/create"],
    ["he", "/he/shop/sound-case-001/create"],
  ] as const)("preserves a safe %s destination across the OAuth round trip", (lang, next) => {
    const storage = memoryStorage();
    storeCustomerAuthDestination(storage, next, lang);
    expect(consumeCustomerAuthDestination(storage, undefined, lang)).toBe(next);
    expect(storage.getItem(CUSTOMER_AUTH_NEXT_STORAGE_KEY)).toBeNull();
  });

  it("rejects external next destinations instead of reviving stale storage", () => {
    const storage = memoryStorage({
      [CUSTOMER_AUTH_NEXT_STORAGE_KEY]: "/shop/sound-case-001/create",
    });
    expect(consumeCustomerAuthDestination(storage, "https://evil.example", "ru"))
      .toBe("/account");
    expect(resolveCustomerDestination("//evil.example/path", "en")).toBe("/en/account");
  });
});

describe("customer navigation state", () => {
  it.each([
    ["ru", "Войти", "Мой аккаунт"],
    ["en", "Sign in", "My account"],
    ["he", "התחברות", "החשבון שלי"],
  ] as const)("shows sign-in anonymously and account when authenticated in %s", (lang, anonymous, authenticated) => {
    expect(getCustomerNavigationLabel(lang, false)).toBe(anonymous);
    expect(getCustomerNavigationLabel(lang, true)).toBe(authenticated);
  });

  it("binds TopBar to the real Supabase customer session hook", () => {
    const topBarSource = readFileSync(`${process.cwd()}/components/TopBar.tsx`, "utf8");
    expect(topBarSource).toContain("useCustomerSession()");
    expect(topBarSource).toContain('customerSession.status === "authenticated"');
    expect(topBarSource).not.toContain('alert("Sign in is coming soon")');
  });
});

describe("admin/customer authorization separation", () => {
  it("keeps the existing admin callback and ADMIN_EMAIL authorization intact", () => {
    const adminPage = readFileSync(`${process.cwd()}/pages/admin-login.tsx`, "utf8");
    const adminAccess = readFileSync(`${process.cwd()}/lib/server/auth/adminAccess.ts`, "utf8");
    const customerAccess = readFileSync(`${process.cwd()}/lib/server/auth/customerAccess.ts`, "utf8");

    expect(adminPage).toContain('new URL("/admin-login", window.location.origin)');
    expect(adminPage).toContain("supabase.auth.signInWithOAuth");
    expect(adminAccess).toContain('process.env["ADMIN_EMAIL"]');
    expect(adminAccess).toContain("userEmail === adminEmail");
    expect(customerAccess).not.toContain("ADMIN_EMAIL");
  });
});
