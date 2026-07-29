import { describe, expect, it } from "vitest";
import { scrubSentryEvent } from "@/sentry.shared";

describe("Sentry data scrubbing", () => {
  it("removes tokens, cookies, request bodies, email and secret query values", () => {
    const event = scrubSentryEvent({
      message: "Bearer abc.def.ghi belongs to admin@example.com",
      request: {
        url: "https://www.laplapla.com/admin-login?token=secret&next=%2Fraccoons#access_token=secret",
        headers: { authorization: "Bearer abc.def.ghi" },
        cookies: { session: "secret" },
        data: { prompt: "private text" },
      },
      extra: {
        email: "admin@example.com",
        nested: { accessToken: "abc.def.ghi", safe: "ok" },
      },
    });

    const serialized = JSON.stringify(event);
    expect(serialized).not.toContain("admin@example.com");
    expect(serialized).not.toContain("abc.def.ghi");
    expect(serialized).not.toContain("private text");
    expect(serialized).not.toContain("access_token=secret");
    expect(serialized).toContain("[FILTERED");
  });
});
