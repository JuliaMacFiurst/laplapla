import { describe, expect, it } from "vitest";
import {
  createAttributionTouch,
  parseAttributionSnapshot,
  resolveAttributionSnapshot,
} from "@/lib/analytics/attribution";
import { resolveAnalyticsSession, SESSION_INACTIVITY_MS } from "@/lib/analytics/client";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const visitorId = "11111111-1111-4111-8111-111111111111";
const sessionA = "22222222-2222-4222-8222-222222222222";
const sessionB = "33333333-3333-4333-8333-333333333333";

describe("Analytics Phase 2A attribution capture", () => {
  it("captures all five YouTube UTM values without retaining query-string PII", () => {
    const touch = createAttributionTouch({
      href: "https://laplapla.com/en/shop/sound-case-001?utm_source=YouTube&utm_medium=social&utm_campaign=launch&utm_content=short-1&utm_term=singing+dune&email=private@example.com",
      referrer: "https://www.youtube.com/watch?v=secret",
      now: Date.parse("2026-10-19T10:00:00.000Z"),
    });
    expect(touch).toEqual({
      utm_source: "youtube",
      utm_medium: "social",
      utm_campaign: "launch",
      utm_content: "short-1",
      utm_term: "singing dune",
      external_referrer: "https://www.youtube.com/watch",
      landing_pathname: "/en/shop/sound-case-001",
      attributed_at: "2026-10-19T10:00:00.000Z",
      source: "youtube",
      channel: "social",
    });
    expect(JSON.stringify(touch)).not.toContain("private@example.com");
  });

  it.each([
    ["https://laplapla.com/shop?utm_source=instagram&utm_medium=social", "instagram", "social"],
    ["https://laplapla.com/shop", "direct", "direct"],
  ])("classifies %s as %s / %s", (href, source, channel) => {
    expect(createAttributionTouch({ href, referrer: null, now: 0 })).toMatchObject({ source, channel });
  });

  it("classifies an untagged Google visit as organic", () => {
    expect(createAttributionTouch({
      href: "https://laplapla.com/shop/sound-case-001",
      referrer: "https://www.google.com/search?q=laplapla",
      now: 0,
    })).toMatchObject({
      source: "google",
      channel: "organic",
      external_referrer: "https://www.google.com/search",
    });
  });

  it("keeps first-touch and session-touch stable across navigation, language changes and reload", () => {
    const storage = new MemoryStorage();
    const first = resolveAttributionSnapshot(storage, {
      href: "https://laplapla.com/shop?utm_source=youtube&utm_medium=social",
      referrer: "https://youtube.com/watch?v=1",
      visitorId,
      sessionId: sessionA,
      now: Date.parse("2026-10-19T10:00:00.000Z"),
    });
    const navigated = resolveAttributionSnapshot(storage, {
      href: "https://laplapla.com/en/shop/sound-case-001",
      referrer: "https://laplapla.com/shop?utm_source=youtube",
      visitorId,
      sessionId: sessionA,
      now: 2_000,
    });
    const reloaded = resolveAttributionSnapshot(storage, {
      href: "https://laplapla.com/he/shop/sound-case-001",
      referrer: "https://laplapla.com/en/shop/sound-case-001",
      visitorId,
      sessionId: sessionA,
      now: 3_000,
    });
    expect(navigated.first_touch).toEqual(first.first_touch);
    expect(navigated.session_touch).toEqual(first.session_touch);
    expect(reloaded.first_touch).toEqual(first.first_touch);
    expect(reloaded.session_touch).toEqual(first.session_touch);
  });

  it("rotates session-touch with the existing 30-minute analytics session but preserves first-touch", () => {
    const storage = new MemoryStorage();
    const firstSession = resolveAnalyticsSession(storage, 1_000, () => sessionA);
    const first = resolveAttributionSnapshot(storage, {
      href: "https://laplapla.com/shop?utm_source=instagram&utm_medium=social",
      referrer: null,
      visitorId,
      sessionId: firstSession.id,
      now: 1_000,
    });
    const rotatedSession = resolveAnalyticsSession(
      storage,
      1_001 + SESSION_INACTIVITY_MS,
      () => sessionB,
    );
    const rotated = resolveAttributionSnapshot(storage, {
      href: "https://laplapla.com/shop/sound-case-001",
      referrer: "https://laplapla.com/shop",
      visitorId,
      sessionId: rotatedSession.id,
      now: 1_001 + SESSION_INACTIVITY_MS,
    });
    expect(rotatedSession.isNew).toBe(true);
    expect(rotated.first_touch).toEqual(first.first_touch);
    expect(rotated.session_touch).toMatchObject({ source: "direct", channel: "direct" });
    expect(rotated.session_id).toBe(sessionB);
  });

  it("rejects malformed checkout attribution and strips likely PII from campaign values", () => {
    const storage = new MemoryStorage();
    const capturedAt = Date.parse("2026-10-19T10:00:00.000Z");
    const safe = resolveAttributionSnapshot(storage, {
      href: "https://laplapla.com/shop?utm_source=buyer@example.com&utm_campaign=%2B972%2050%20123%204567",
      referrer: null,
      visitorId,
      sessionId: sessionA,
      now: capturedAt,
    });
    expect(safe.first_touch.utm_source).toBeNull();
    expect(safe.first_touch.utm_campaign).toBeNull();
    expect(JSON.stringify(safe)).not.toContain("buyer@example.com");
    const validationNow = Date.parse("2026-10-19T10:01:00.000Z");
    expect(parseAttributionSnapshot(safe, validationNow)).toEqual(safe);
    expect(parseAttributionSnapshot({ ...safe, visitor_id: "not-a-uuid" }, validationNow)).toBeNull();
    expect(parseAttributionSnapshot({
      ...safe,
      session_touch: { ...safe.session_touch, channel: "paid" },
    }, validationNow)).toBeNull();
  });
});
