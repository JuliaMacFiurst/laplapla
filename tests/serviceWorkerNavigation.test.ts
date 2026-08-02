import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

const workerSource = fs.readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8");

type FetchHandler = (event: {
  request: {
    method: string;
    mode: string;
    url: string;
    headers: Headers;
  };
  respondWith(response: Promise<Response>): void;
}) => void;

function createNavigationHarness(
  networkFetch: (request: unknown, init?: { signal?: AbortSignal }) => Promise<Response>,
) {
  const handlers = new Map<string, (event: unknown) => void>();
  const offlineResponse = new Response("<!doctype html><title>Offline</title>", {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
  let responsePromise: Promise<Response> | null = null;
  let aborted = false;

  class HarnessAbortController extends AbortController {
    override abort(reason?: unknown) {
      aborted = true;
      super.abort(reason);
    }
  }

  vm.runInNewContext(workerSource, {
    AbortController: HarnessAbortController,
    Error,
    Promise,
    ReadableStream,
    Response,
    URL,
    clearTimeout,
    console,
    fetch: networkFetch,
    setInterval,
    setTimeout: (callback: () => void, timeoutMs: number) =>
      setTimeout(callback, timeoutMs >= 20_000 ? 50 : 1),
    caches: {
      async open() {
        return {
          async match(key: string) {
            return key === "/offline.html" ? offlineResponse.clone() : undefined;
          },
        };
      },
    },
    self: {
      location: { origin: "https://www.laplapla.com" },
      addEventListener(type: string, handler: (event: unknown) => void) {
        handlers.set(type, handler);
      },
    },
  });

  const request = {
    method: "GET",
    mode: "navigate",
    url: "https://www.laplapla.com/",
    headers: new Headers({ accept: "text/html" }),
  };
  (handlers.get("fetch") as FetchHandler)({
    request,
    respondWith(response) {
      responsePromise = response;
    },
  });

  return {
    get aborted() {
      return aborted;
    },
    response: () => {
      if (!responsePromise) throw new Error("Service Worker did not handle navigation");
      return responsePromise;
    },
  };
}

describe("Service Worker navigation timeout", () => {
  it("returns a normal navigation immediately without waiting for the deadline", async () => {
    const online = new Response("<!doctype html><title>LapLapLa</title>", {
      headers: { "Content-Type": "text/html" },
    });
    const harness = createNavigationHarness(async () => online);
    const response = await harness.response();

    expect(await response.text()).toContain("LapLapLa");
    expect(harness.aborted).toBe(false);
  });

  it("aborts a hanging navigation and returns the precached offline document", async () => {
    const harness = createNavigationHarness(
      (request, init) =>
        request === "/robots.txt"
          ? new Promise((_resolve, reject) => {
              init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), {
                once: true,
              });
            })
          :
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), {
            once: true,
          });
        }),
    );
    const response = await harness.response();

    expect(harness.aborted).toBe(true);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(await response.text()).toContain("Offline");
  });

  it("keeps waiting for a slow navigation when the same-origin health check succeeds", async () => {
    const slowNavigation = {
      resolve: null as ((response: Response) => void) | null,
    };
    const harness = createNavigationHarness((request) => {
      if (request === "/robots.txt") {
        return Promise.resolve(new Response("ok", { status: 200 }));
      }
      return new Promise<Response>((resolve) => {
        slowNavigation.resolve = resolve;
      });
    });
    const responsePromise = harness.response();
    await new Promise((resolve) => setTimeout(resolve, 5));
    slowNavigation.resolve?.(
      new Response("<!doctype html><title>Slow but online</title>", {
        headers: { "Content-Type": "text/html" },
      }),
    );
    const response = await responsePromise;

    expect(harness.aborted).toBe(false);
    expect(await response.text()).toContain("Slow but online");
  });

  it("returns a slow-network recovery redirect when navigation never completes but health succeeds", async () => {
    const harness = createNavigationHarness((request) => {
      if (request === "/robots.txt") {
        return Promise.resolve(new Response("ok", { status: 200 }));
      }
      return new Promise<Response>(() => undefined);
    });
    const response = await harness.response();

    expect(harness.aborted).toBe(true);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://www.laplapla.com/offline.html#slow-network");
  });

  it("returns offline immediately for an explicit network failure", async () => {
    const harness = createNavigationHarness(async () => {
      throw new Error("offline");
    });
    const response = await harness.response();

    expect(await response.text()).toContain("Offline");
  });

  it("returns offline when navigation stalls and the health check also cannot complete", async () => {
    const harness = createNavigationHarness(
      (request, init) => {
        if (request === "/robots.txt") {
          return new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), {
              once: true,
            });
          });
        }
        return Promise.resolve(
          new Response(
            new ReadableStream({
              start(controller) {
                controller.enqueue(new TextEncoder().encode("<!doctype html>"));
              },
            }),
            { headers: { "Content-Type": "text/html" } },
          ),
        );
      },
    );
    const response = await harness.response();

    expect(response.headers.get("content-type")).toContain("text/html");
    expect(await response.text()).toContain("Offline");
  });

  it("ignores a network response that arrives after the timeout fallback", async () => {
    const lateNetwork = {
      resolve: null as ((response: Response) => void) | null,
    };
    const harness = createNavigationHarness(
      (request) => request === "/robots.txt"
        ? Promise.reject(new Error("offline"))
        :
        new Promise<Response>((resolve) => {
          lateNetwork.resolve = resolve;
        }),
    );
    const response = await harness.response();
    lateNetwork.resolve?.(
      new Response("<!doctype html><title>Late response</title>", {
        headers: { "Content-Type": "text/html" },
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(await response.text()).toContain("Offline");
  });
});
