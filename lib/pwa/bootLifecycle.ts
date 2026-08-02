import pwaConfig from "@/config/pwa.json";

export type PwaBootState = "booting" | "ready" | "degraded" | "failed";

export const PWA_BOOT_READY_EVENT = "laplapla:app-ready";
export const PWA_BOOT_DEADLINE_MS = pwaConfig.bootDeadlineMs;
export const PWA_BOOT_RECOVERY_DEADLINE_MS = pwaConfig.bootRecoveryDeadlineMs;
export const PWA_BOOT_HEALTH_CHECK_PATH = pwaConfig.healthCheckPath;
export const PWA_BOOT_HEALTH_CHECK_TIMEOUT_MS = pwaConfig.healthCheckTimeoutMs;
export const PWA_BOOT_RELOAD_KEY = "laplapla_pwa_chunk_reload_attempted";
export const PWA_BOOT_DIAGNOSTIC_KEY = "laplapla_pwa_boot_diagnostic";

export function createPwaBootRecoveryScript() {
  return `
    (() => {
      const root = document.documentElement;
      const readyEvent = ${JSON.stringify(PWA_BOOT_READY_EVENT)};
      const diagnosticKey = ${JSON.stringify(PWA_BOOT_DIAGNOSTIC_KEY)};
      const reloadKey = ${JSON.stringify(PWA_BOOT_RELOAD_KEY)};
      const healthPath = ${JSON.stringify(PWA_BOOT_HEALTH_CHECK_PATH)};
      const healthTimeoutMs = ${PWA_BOOT_HEALTH_CHECK_TIMEOUT_MS};
      const recoveryDeadlineMs = ${PWA_BOOT_RECOVERY_DEADLINE_MS};
      const startedAt = Date.now();
      let ready = false;
      let chunkRecoveryStarted = false;
      let healthCheckResult = "not-run";
      let recoveryDeadline = 0;
      root.dataset.pwaBootState = "booting";

      const saveDiagnostic = (reason) => {
        try {
          window.sessionStorage.setItem(diagnosticKey, JSON.stringify({
            reason,
            duration_ms: Math.max(0, Date.now() - startedAt),
            online: typeof navigator.onLine === "boolean" ? navigator.onLine : null,
            health_check: healthCheckResult,
          }));
        } catch {}
      };

      const showRecovery = (reason) => {
        root.dataset.pwaBootState = "degraded";
        const recovery = document.getElementById("pwa-boot-recovery-panel");
        if (recovery) {
          recovery.hidden = false;
        }
        saveDiagnostic(reason);
      };

      const isChunkLoadFailure = (value) => {
        const message = value instanceof Error
          ? value.name + ": " + value.message
          : String(value || "");
        return /ChunkLoadError|Loading chunk .* failed|Failed to fetch dynamically imported module|Importing a module script failed/i.test(message);
      };

      const recoverChunkLoad = () => {
        if (chunkRecoveryStarted) {
          return;
        }
        chunkRecoveryStarted = true;
        let alreadyRetried = false;
        try {
          alreadyRetried = window.sessionStorage.getItem(reloadKey) === "1";
        } catch {}

        if (!alreadyRetried) {
          try {
            window.sessionStorage.setItem(reloadKey, "1");
          } catch {}
          saveDiagnostic("chunk-load-retry");
          window.location.reload();
          return;
        }

        showRecovery("chunk-load-failed-after-retry");
      };

      window.addEventListener("error", (event) => {
        const scriptSource = event.target instanceof HTMLScriptElement ? event.target.src : "";
        if (isChunkLoadFailure(event.error || event.message) || scriptSource.includes("/_next/static/")) {
          recoverChunkLoad();
        }
      }, true);
      window.addEventListener("unhandledrejection", (event) => {
        if (isChunkLoadFailure(event.reason)) {
          recoverChunkLoad();
        }
      });

      const checkConnectivity = async () => {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), healthTimeoutMs);
        try {
          const response = await fetch(healthPath, {
            cache: "no-store",
            credentials: "same-origin",
            signal: controller.signal,
          });
          healthCheckResult = response.ok ? "reachable" : "http-error";
          return response.ok;
        } catch {
          healthCheckResult = "unreachable";
          return false;
        } finally {
          window.clearTimeout(timeout);
        }
      };

      const markReady = () => {
        ready = true;
        root.dataset.pwaBootState = "ready";
        window.clearTimeout(deadline);
        window.clearTimeout(recoveryDeadline);
        try {
          window.sessionStorage.removeItem(reloadKey);
        } catch {}
      };

      window.addEventListener(readyEvent, markReady, { once: true });
      const deadline = window.setTimeout(async () => {
        if (ready || !document.querySelector(".app-splash--visible")) {
          return;
        }

        const reachable = await checkConnectivity();
        if (ready) {
          return;
        }
        if (!reachable) {
          root.dataset.pwaBootState = "failed";
          saveDiagnostic("health-check-failed");
          window.location.replace("/offline.html");
          return;
        }

        recoveryDeadline = window.setTimeout(() => {
          if (!ready && document.querySelector(".app-splash--visible")) {
            showRecovery("boot-deadline-exceeded-online");
          }
        }, Math.max(0, recoveryDeadlineMs - (Date.now() - startedAt)));
      }, ${PWA_BOOT_DEADLINE_MS});

      document.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element) || !target.closest("#pwa-boot-retry")) {
          return;
        }
        try {
          window.sessionStorage.removeItem(reloadKey);
        } catch {}
        window.location.reload();
      });
    })();
  `;
}
