import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/i18n";
import AppSplash from "@/components/PWA/AppSplash";
import { APP_BRAND } from "@/lib/pwa/appBrand";

const UPDATE_COPY: Record<Lang, { title: (appName: string) => string; button: string }> = {
  ru: { title: (appName) => `Доступна новая версия ${appName}`, button: "Обновить" },
  en: { title: (appName) => `A new version of ${appName} is available`, button: "Update" },
  he: { title: (appName) => `גרסה חדשה של ${appName} זמינה`, button: "עדכון" },
};

const UPDATE_INTERVAL_MS = 60 * 60 * 1000;
const MIN_SPLASH_MS = 320;
const MAX_SPLASH_MS = 2400;

function canRegisterServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }
  return (
    process.env.NODE_ENV === "production" &&
    (window.location.protocol === "https:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1")
  );
}

export default function PWAAppShell({ lang }: { lang: Lang }) {
  const [showSplash, setShowSplash] = useState(true);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const reloadStarted = useRef(false);

  useEffect(() => {
    const startedAt = performance.now();
    let minimumTimer = 0;
    const maximumTimer = window.setTimeout(() => setShowSplash(false), MAX_SPLASH_MS);

    const hideSplash = () => {
      const remaining = Math.max(0, MIN_SPLASH_MS - (performance.now() - startedAt));
      minimumTimer = window.setTimeout(() => setShowSplash(false), remaining);
    };

    if (document.readyState === "complete") {
      hideSplash();
    } else {
      window.addEventListener("load", hideSplash, { once: true });
    }

    return () => {
      window.removeEventListener("load", hideSplash);
      window.clearTimeout(minimumTimer);
      window.clearTimeout(maximumTimer);
    };
  }, []);

  useEffect(() => {
    if (!canRegisterServiceWorker()) {
      return;
    }

    let active = true;
    let registration: ServiceWorkerRegistration | null = null;
    let intervalId = 0;

    const inspectRegistration = (nextRegistration: ServiceWorkerRegistration) => {
      registration = nextRegistration;
      if (nextRegistration.waiting && navigator.serviceWorker.controller) {
        setWaitingWorker(nextRegistration.waiting);
      }

      nextRegistration.addEventListener("updatefound", () => {
        const installing = nextRegistration.installing;
        if (!installing) {
          return;
        }
        installing.addEventListener("statechange", () => {
          if (
            active &&
            installing.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            setWaitingWorker(installing);
          }
        });
      });
    };

    const checkForUpdate = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void registration?.update().catch(() => undefined);
      }
    };

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((nextRegistration) => {
        if (!active) {
          return;
        }
        inspectRegistration(nextRegistration);
        void nextRegistration.update().catch(() => undefined);
        intervalId = window.setInterval(checkForUpdate, UPDATE_INTERVAL_MS);
      })
      .catch(() => undefined);

    const handleControllerChange = () => {
      if (reloadStarted.current) {
        return;
      }
      reloadStarted.current = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    window.addEventListener("online", checkForUpdate);
    document.addEventListener("visibilitychange", checkForUpdate);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      window.removeEventListener("online", checkForUpdate);
      document.removeEventListener("visibilitychange", checkForUpdate);
    };
  }, []);

  const applyUpdate = () => {
    waitingWorker?.postMessage({ type: "SKIP_WAITING" });
  };

  const copy = UPDATE_COPY[lang];

  return (
    <>
      <AppSplash visible={showSplash} />
      {waitingWorker ? (
        <aside className="pwa-update-toast" role="status" aria-live="polite">
          <span>{copy.title(APP_BRAND.appName)}</span>
          <button type="button" onClick={applyUpdate}>
            {copy.button}
          </button>
        </aside>
      ) : null}
    </>
  );
}
