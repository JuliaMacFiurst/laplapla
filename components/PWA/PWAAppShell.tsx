import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/i18n";
import AppSplash from "@/components/PWA/AppSplash";
import { APP_BRAND } from "@/lib/pwa/appBrand";
import {
  PWA_BOOT_DIAGNOSTIC_KEY,
  PWA_BOOT_READY_EVENT,
  type PwaBootState,
} from "@/lib/pwa/bootLifecycle";
import { sentryDebugMessage } from "@/sentry.shared";

const UPDATE_COPY: Record<Lang, { title: (appName: string) => string; button: string }> = {
  ru: { title: (appName) => `Доступна новая версия ${appName}`, button: "Обновить" },
  en: { title: (appName) => `A new version of ${appName} is available`, button: "Update" },
  he: { title: (appName) => `גרסה חדשה של ${appName} זמינה`, button: "עדכון" },
};

const BOOT_RECOVERY_COPY: Record<Lang, { title: string; message: string; retry: string }> = {
  ru: {
    title: "LapLapLa загружается дольше обычного",
    message: "Соединение доступно, но запуск не завершился. Попробуйте загрузить приложение ещё раз.",
    retry: "Повторить",
  },
  en: {
    title: "LapLapLa is taking longer than usual",
    message: "The connection is available, but startup did not finish. Try loading the app again.",
    retry: "Try again",
  },
  he: {
    title: "הטעינה של LapLapLa נמשכת יותר מהרגיל",
    message: "החיבור זמין, אך ההפעלה לא הושלמה. נסו לטעון את היישום שוב.",
    retry: "ניסיון נוסף",
  },
};

const UPDATE_INTERVAL_MS = 60 * 60 * 1000;
const MIN_SPLASH_MS = 320;
const DEBUG_SPLASH_MS = 6000;

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
  const [bootState, setBootState] = useState<PwaBootState>("booting");
  const [debugSplashEnabled, setDebugSplashEnabled] = useState(false);
  const [splashAnimationKey, setSplashAnimationKey] = useState(0);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const reloadStarted = useRef(false);
  const splashReadyTimer = useRef(0);

  useEffect(() => {
    const startedAt = performance.now();
    const shouldDebugSplash =
      process.env.NODE_ENV === "development" &&
      new URLSearchParams(window.location.search).get("debugSplash") === "1";
    setDebugSplashEnabled(shouldDebugSplash);
    document.documentElement.dataset.pwaBootState = "ready";
    window.dispatchEvent(new Event(PWA_BOOT_READY_EVENT));
    try {
      const diagnostic = window.sessionStorage.getItem(PWA_BOOT_DIAGNOSTIC_KEY);
      if (diagnostic) {
        const parsed = JSON.parse(diagnostic) as {
          reason?: unknown;
          duration_ms?: unknown;
          online?: unknown;
          health_check?: unknown;
        };
        const reason = typeof parsed.reason === "string" ? parsed.reason.slice(0, 80) : "unknown";
        const duration = typeof parsed.duration_ms === "number"
          ? Math.max(0, Math.min(120_000, Math.round(parsed.duration_ms)))
          : 0;
        const online = typeof parsed.online === "boolean" ? String(parsed.online) : "unknown";
        const health = typeof parsed.health_check === "string"
          ? parsed.health_check.slice(0, 40)
          : "unknown";
        sentryDebugMessage(
          `pwa_boot_recovered reason=${reason} duration_ms=${duration} online=${online} health=${health}`,
        );
        window.sessionStorage.removeItem(PWA_BOOT_DIAGNOSTIC_KEY);
      }
    } catch {
      try {
        window.sessionStorage.removeItem(PWA_BOOT_DIAGNOSTIC_KEY);
      } catch {}
    }
    const minimumVisibleMs = shouldDebugSplash ? DEBUG_SPLASH_MS : MIN_SPLASH_MS;
    const remaining = Math.max(0, minimumVisibleMs - (performance.now() - startedAt));
    splashReadyTimer.current = window.setTimeout(() => setBootState("ready"), remaining);

    return () => {
      window.clearTimeout(splashReadyTimer.current);
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
      .catch(() => {
        sentryDebugMessage("pwa_service_worker_registration_failed");
      });

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

  const replaySplashAnimation = () => {
    window.clearTimeout(splashReadyTimer.current);
    setBootState("booting");
    setSplashAnimationKey((current) => current + 1);
    splashReadyTimer.current = window.setTimeout(() => setBootState("ready"), DEBUG_SPLASH_MS);
  };

  const copy = UPDATE_COPY[lang];

  return (
    <>
      <AppSplash
        visible={bootState === "booting"}
        recoveryCopy={BOOT_RECOVERY_COPY[lang]}
        debugReplay={debugSplashEnabled ? {
          animationKey: splashAnimationKey,
          onReplay: replaySplashAnimation,
        } : undefined}
      />
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
