import { describe, expect, it } from "vitest";
import { resolveSlidesLoadStatus } from "@/lib/bookSlidesLoadState";

describe("book slides load state", () => {
  it("keeps a slow successful request in loading without exposing an error", () => {
    expect(resolveSlidesLoadStatus({
      hasBook: true,
      loading: true,
      error: null,
      slideCount: 0,
    })).toBe("loading");

    expect(resolveSlidesLoadStatus({
      hasBook: true,
      loading: false,
      error: null,
      slideCount: 3,
    })).toBe("success");
  });

  it("shows an error only after a confirmed failed request", () => {
    expect(resolveSlidesLoadStatus({
      hasBook: true,
      loading: true,
      error: null,
      slideCount: 0,
    })).toBe("loading");

    expect(resolveSlidesLoadStatus({
      hasBook: true,
      loading: false,
      error: "request failed",
      slideCount: 0,
    })).toBe("error");

    expect(resolveSlidesLoadStatus({
      hasBook: true,
      loading: true,
      error: null,
      slideCount: 0,
    })).toBe("loading");
  });

  it("distinguishes a successful empty response from a technical error", () => {
    expect(resolveSlidesLoadStatus({
      hasBook: true,
      loading: false,
      error: null,
      slideCount: 0,
    })).toBe("empty");
  });

  it("does not treat router or book initialization as an error", () => {
    expect(resolveSlidesLoadStatus({
      hasBook: false,
      loading: false,
      error: null,
      slideCount: 0,
    })).toBe("idle");
  });

  it("keeps loading authoritative while a stale request is being replaced", () => {
    expect(resolveSlidesLoadStatus({
      hasBook: true,
      loading: true,
      error: null,
      slideCount: 0,
    })).toBe("loading");

    expect(resolveSlidesLoadStatus({
      hasBook: true,
      loading: false,
      error: null,
      slideCount: 2,
    })).toBe("success");
  });
});
