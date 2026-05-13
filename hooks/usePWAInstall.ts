import { useCallback, useEffect, useMemo, useState } from "react";

type BeforeInstallPromptOutcome = "accepted" | "dismissed";

type BeforeInstallPromptEvent = Event & {
  platforms?: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: BeforeInstallPromptOutcome; platform: string }>;
};

export type PWAInstallPlatform = {
  ios: boolean;
  android: boolean;
  desktop: boolean;
  mac: boolean;
  windows: boolean;
};

export type PWAInstallState = PWAInstallPlatform & {
  installed: boolean;
  installable: boolean;
  canPrompt: boolean;
  standalone: boolean;
  promptInstall: () => Promise<BeforeInstallPromptOutcome | "unavailable">;
};

const DEFAULT_PLATFORM: PWAInstallPlatform = {
  ios: false,
  android: false,
  desktop: false,
  mac: false,
  windows: false,
};

function canUseBrowser() {
  return typeof window !== "undefined" && typeof navigator !== "undefined";
}

export function isPWAStandalone() {
  if (!canUseBrowser()) {
    return false;
  }

  const standaloneDisplay = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  const fullscreenDisplay = window.matchMedia?.("(display-mode: fullscreen)").matches ?? false;
  const iosStandalone = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  return standaloneDisplay || fullscreenDisplay || iosStandalone;
}

function detectPlatform(): PWAInstallPlatform {
  if (!canUseBrowser()) {
    return DEFAULT_PLATFORM;
  }

  const userAgent = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const touchPoints = navigator.maxTouchPoints || 0;
  const ios =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (platform === "MacIntel" && touchPoints > 1);
  const android = /Android/i.test(userAgent);
  const mac = !ios && /Mac/i.test(platform);
  const windows = /Win/i.test(platform);

  return {
    ios,
    android,
    desktop: !ios && !android,
    mac,
    windows,
  };
}

function shouldRegisterServiceWorker() {
  if (!canUseBrowser() || !("serviceWorker" in navigator)) {
    return false;
  }

  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  const { hostname, protocol } = window.location;
  return protocol === "https:" || hostname === "localhost" || hostname === "127.0.0.1";
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [platform, setPlatform] = useState<PWAInstallPlatform>(DEFAULT_PLATFORM);

  useEffect(() => {
    if (!canUseBrowser()) {
      return;
    }

    setPlatform(detectPlatform());
    setStandalone(isPWAStandalone());
    setInstalled(isPWAStandalone());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setStandalone(true);
      setDeferredPrompt(null);
    };

    const standaloneMedia = window.matchMedia?.("(display-mode: standalone)");
    const handleDisplayModeChange = () => {
      const nextStandalone = isPWAStandalone();
      setStandalone(nextStandalone);
      if (nextStandalone) {
        setInstalled(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    standaloneMedia?.addEventListener?.("change", handleDisplayModeChange);

    const registerServiceWorker = () => {
      if (shouldRegisterServiceWorker()) {
        void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
        return;
      }

      if (process.env.NODE_ENV !== "production" && "serviceWorker" in navigator) {
        void navigator.serviceWorker
          .getRegistrations()
          .then((registrations) =>
            Promise.all(
              registrations.map((registration) => registration.unregister()),
            ),
          )
          .catch(() => undefined);
      }
    };

    if (document.readyState === "complete") {
      registerServiceWorker();
    } else {
      window.addEventListener("load", registerServiceWorker, { once: true });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("load", registerServiceWorker);
      standaloneMedia?.removeEventListener?.("change", handleDisplayModeChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return "unavailable" as const;
    }

    const promptEvent = deferredPrompt;
    setDeferredPrompt(null);
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;

    if (choice.outcome === "accepted") {
      setInstalled(true);
    }

    return choice.outcome;
  }, [deferredPrompt]);

  return useMemo(
    () => ({
      ...platform,
      installed,
      standalone,
      installable: Boolean(deferredPrompt) && !installed && !standalone,
      canPrompt: Boolean(deferredPrompt) && !installed && !standalone,
      promptInstall,
    }),
    [deferredPrompt, installed, platform, promptInstall, standalone],
  );
}
