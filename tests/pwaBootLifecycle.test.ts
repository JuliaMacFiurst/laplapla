import vm from "node:vm";
import { describe, expect, it } from "vitest";
import {
  createPwaBootRecoveryScript,
  PWA_BOOT_DEADLINE_MS,
  PWA_BOOT_READY_EVENT,
  PWA_BOOT_RELOAD_KEY,
} from "@/lib/pwa/bootLifecycle";

type Timer = { callback: () => void | Promise<void>; delay: number };

function createBootHarness(options?: {
  healthCheck?: (signal: AbortSignal) => Promise<Response>;
  session?: Map<string, string>;
}) {
  const listeners = new Map<string, Array<(event: unknown) => void>>();
  const documentListeners = new Map<string, Array<(event: unknown) => void>>();
  const timers = new Map<number, Timer>();
  const session = options?.session ?? new Map<string, string>();
  let nextTimerId = 1;
  let now = 0;
  const state = {
    bootState: "",
    replacedWith: null as string | null,
    reloads: 0,
    healthChecks: 0,
    healthPath: null as string | null,
    healthCache: null as string | null,
    recoveryHidden: true,
  };

  class HarnessElement {
    closest(selector: string) {
      return selector === "#pwa-boot-retry" ? this : null;
    }
  }
  class HarnessScriptElement extends HarnessElement {
    src = "";
  }

  const root = { dataset: { pwaBootState: "" } };
  Object.defineProperty(root.dataset, "pwaBootState", {
    get: () => state.bootState,
    set: (value: string) => {
      state.bootState = value;
    },
  });
  const recovery = {
    get hidden() {
      return state.recoveryHidden;
    },
    set hidden(value: boolean) {
      state.recoveryHidden = value;
    },
  };

  const addListener = (
    map: Map<string, Array<(event: unknown) => void>>,
    type: string,
    listener: (event: unknown) => void,
  ) => map.set(type, [...(map.get(type) ?? []), listener]);

  const window = {
    addEventListener(type: string, listener: (event: unknown) => void) {
      addListener(listeners, type, listener);
    },
    clearTimeout(id: number) {
      timers.delete(id);
    },
    setTimeout(callback: () => void | Promise<void>, delay: number) {
      const id = nextTimerId++;
      timers.set(id, { callback, delay });
      return id;
    },
    location: {
      replace(path: string) {
        state.replacedWith = path;
      },
      reload() {
        state.reloads += 1;
      },
    },
    sessionStorage: {
      getItem(key: string) {
        return session.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        session.set(key, value);
      },
      removeItem(key: string) {
        session.delete(key);
      },
    },
  };
  const document = {
    documentElement: root,
    addEventListener(type: string, listener: (event: unknown) => void) {
      addListener(documentListeners, type, listener);
    },
    querySelector(selector: string) {
      return selector === ".app-splash--visible" ? {} : null;
    },
    getElementById(id: string) {
      return id === "pwa-boot-recovery-panel" ? recovery : null;
    },
  };
  const healthCheck = options?.healthCheck ?? (async () => new Response("ok", { status: 200 }));

  vm.runInNewContext(createPwaBootRecoveryScript(), {
    AbortController,
    Date: { now: () => now },
    Element: HarnessElement,
    Error,
    HTMLScriptElement: HarnessScriptElement,
    JSON,
    Response,
    String,
    document,
    fetch: (path: string, init: { cache?: string; signal: AbortSignal }) => {
      state.healthChecks += 1;
      state.healthPath = path;
      state.healthCache = init.cache ?? null;
      return healthCheck(init.signal);
    },
    navigator: { onLine: true },
    window,
  });

  const dispatch = (type: string, event: unknown = {}) => {
    for (const listener of listeners.get(type) ?? []) listener(event);
  };
  const runTimer = async (delay: number) => {
    const match = [...timers.entries()].find(([, timer]) => timer.delay === delay);
    if (!match) throw new Error(`No timer found for ${delay}ms`);
    const [id, timer] = match;
    timers.delete(id);
    now += delay;
    await timer.callback();
    await Promise.resolve();
  };

  return {
    dispatch,
    runTimer,
    setNow(value: number) {
      now = value;
    },
    state,
    session,
  };
}

describe("PWA boot recovery", () => {
  it("does not check connectivity when the app becomes ready before the initial deadline", async () => {
    const harness = createBootHarness();
    harness.dispatch(PWA_BOOT_READY_EVENT);

    expect(harness.state.bootState).toBe("ready");
    expect(harness.state.healthChecks).toBe(0);
    expect(harness.state.replacedWith).toBeNull();
  });

  it("allows a reachable app to become ready after 20 seconds without redirecting", async () => {
    const harness = createBootHarness();
    await harness.runTimer(PWA_BOOT_DEADLINE_MS);
    harness.setNow(20_000);
    harness.dispatch(PWA_BOOT_READY_EVENT);

    expect(harness.state.healthChecks).toBe(1);
    expect(harness.state.healthPath).toBe("/robots.txt");
    expect(harness.state.healthCache).toBe("no-store");
    expect(harness.state.bootState).toBe("ready");
    expect(harness.state.replacedWith).toBeNull();
    expect(harness.state.recoveryHidden).toBe(true);
  });

  it("redirects to the offline page only after a failed health check", async () => {
    const harness = createBootHarness({
      healthCheck: async () => {
        throw new Error("offline");
      },
    });
    await harness.runTimer(PWA_BOOT_DEADLINE_MS);

    expect(harness.state.healthChecks).toBe(1);
    expect(harness.state.bootState).toBe("failed");
    expect(harness.state.replacedWith).toBe("/offline.html");
  });

  it("bounds a hanging health check and then uses the offline page", async () => {
    const harness = createBootHarness({
      healthCheck: (signal) => new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      }),
    });
    const deadlinePromise = harness.runTimer(PWA_BOOT_DEADLINE_MS);
    await Promise.resolve();
    await harness.runTimer(3000);
    await deadlinePromise;

    expect(harness.state.replacedWith).toBe("/offline.html");
  });

  it("shows recovery instead of redirecting when the origin is reachable but boot never completes", async () => {
    const harness = createBootHarness();
    await harness.runTimer(PWA_BOOT_DEADLINE_MS);
    await harness.runTimer(22_000);

    expect(harness.state.bootState).toBe("degraded");
    expect(harness.state.recoveryHidden).toBe(false);
    expect(harness.state.replacedWith).toBeNull();
  });

  it("reloads once for a chunk error and shows recovery after the repeated failure", () => {
    const session = new Map<string, string>();
    const first = createBootHarness({ session });
    first.dispatch("unhandledrejection", { reason: new Error("ChunkLoadError: Loading chunk failed") });
    first.dispatch("unhandledrejection", { reason: new Error("ChunkLoadError: Loading chunk failed") });
    expect(first.state.reloads).toBe(1);
    expect(session.get(PWA_BOOT_RELOAD_KEY)).toBe("1");

    const second = createBootHarness({ session });
    second.dispatch("unhandledrejection", { reason: new Error("ChunkLoadError: Loading chunk failed") });
    expect(second.state.reloads).toBe(0);
    expect(second.state.bootState).toBe("degraded");
    expect(second.state.recoveryHidden).toBe(false);
  });

  it("clears the chunk retry marker after a successful boot", () => {
    const session = new Map([[PWA_BOOT_RELOAD_KEY, "1"]]);
    const harness = createBootHarness({ session });
    harness.dispatch(PWA_BOOT_READY_EVENT);

    expect(session.has(PWA_BOOT_RELOAD_KEY)).toBe(false);
  });
});
