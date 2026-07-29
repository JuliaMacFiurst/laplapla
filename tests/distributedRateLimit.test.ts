import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";
import { applyDistributedApiGuard } from "@/utils/rateLimit";

function request(ip: string) {
  return {
    headers: { "x-forwarded-for": ip },
    socket: {},
  } as unknown as NextApiRequest;
}

function response() {
  const headers = new Map<string, string>();
  const result = {
    statusCode: 200,
    body: null as unknown,
    setHeader: vi.fn((name: string, value: string) => headers.set(name, value)),
    status: vi.fn((code: number) => {
      result.statusCode = code;
      return result;
    }),
    json: vi.fn((body: unknown) => {
      result.body = body;
      return result;
    }),
  };
  return result as unknown as NextApiResponse & typeof result;
}

describe("distributed rate limiting", () => {
  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("allows a request within the limit", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ result: [1, 60_000] }), { status: 200 }),
    ));
    const res = response();
    await expect(
      applyDistributedApiGuard(request("203.0.113.1"), res, {
        limit: 2,
        keyPrefix: "test",
      }),
    ).resolves.toBe(true);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 429 and Retry-After when over the limit", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ result: [3, 40_000] }), { status: 200 }),
    ));
    const res = response();
    await expect(
      applyDistributedApiGuard(request("203.0.113.2"), res, {
        limit: 2,
        keyPrefix: "test",
      }),
    ).resolves.toBe(false);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.setHeader).toHaveBeenCalledWith("Retry-After", "40");
  });

  it("uses different hashed keys for different clients", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ result: [1, 60_000] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await applyDistributedApiGuard(request("203.0.113.3"), response(), {
      limit: 2,
      keyPrefix: "test",
    });
    await applyDistributedApiGuard(request("203.0.113.4"), response(), {
      limit: 2,
      keyPrefix: "test",
    });
    const firstBody = String(fetchMock.mock.calls[0]?.[1]?.body);
    const secondBody = String(fetchMock.mock.calls[1]?.[1]?.body);
    expect(firstBody).not.toBe(secondBody);
    expect(firstBody).not.toContain("203.0.113.3");
  });
});
