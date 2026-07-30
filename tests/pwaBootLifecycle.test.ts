import vm from "node:vm";
import { describe, expect, it } from "vitest";
import {
  createPwaBootRecoveryScript,
  PWA_BOOT_DEADLINE_MS,
  PWA_BOOT_READY_EVENT,
} from "@/lib/pwa/bootLifecycle";

type BootHarness = {
  runDeadline: () => void;
  dispatchReady: () => void;
  state: { bootState: string; replacedWith: string | null; timeoutMs: number | null };
};

function createBootHarness(hasVisibleSplash = true): BootHarness {
  let deadline: (() => void) | null = null;
  let readyListener: (() => void) | null = null;
  const state = {
    bootState: "",
    replacedWith: null as string | null,
    timeoutMs: null as number | null,
  };
  const root = {
    dataset: {
      get pwaBootState() {
        return state.bootState;
      },
      set pwaBootState(value: string) {
        state.bootState = value;
      },
    },
  };
  const window = {
    addEventListener(type: string, listener: () => void) {
      if (type === PWA_BOOT_READY_EVENT) readyListener = listener;
    },
    clearTimeout() {},
    setTimeout(callback: () => void, timeoutMs: number) {
      deadline = callback;
      state.timeoutMs = timeoutMs;
      return 1;
    },
    location: {
      replace(path: string) {
        state.replacedWith = path;
      },
    },
  };
  const document = {
    documentElement: root,
    querySelector(selector: string) {
      return selector === ".app-splash--visible" && hasVisibleSplash ? {} : null;
    },
  };

  vm.runInNewContext(createPwaBootRecoveryScript(), { document, window });

  return {
    runDeadline: () => deadline?.(),
    dispatchReady: () => readyListener?.(),
    state,
  };
}

describe("PWA boot recovery", () => {
  it("redirects a permanently unhydrated splash to the offline recovery page", () => {
    const harness = createBootHarness();
    expect(harness.state.bootState).toBe("booting");
    expect(harness.state.timeoutMs).toBe(PWA_BOOT_DEADLINE_MS);

    harness.runDeadline();

    expect(harness.state.bootState).toBe("failed");
    expect(harness.state.replacedWith).toBe("/offline.html");
  });

  it("does not redirect after hydration confirms that the app is ready", () => {
    const harness = createBootHarness();
    harness.dispatchReady();
    harness.runDeadline();

    expect(harness.state.bootState).toBe("ready");
    expect(harness.state.replacedWith).toBeNull();
  });

  it("does not replace a page after the splash is already gone", () => {
    const harness = createBootHarness(false);
    harness.runDeadline();

    expect(harness.state.replacedWith).toBeNull();
  });
});
