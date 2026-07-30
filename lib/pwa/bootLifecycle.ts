import pwaConfig from "@/config/pwa.json";

export type PwaBootState = "booting" | "ready" | "degraded" | "failed";

export const PWA_BOOT_READY_EVENT = "laplapla:app-ready";
export const PWA_BOOT_DEADLINE_MS = pwaConfig.bootDeadlineMs;

export function createPwaBootRecoveryScript() {
  return `
    (() => {
      const root = document.documentElement;
      const readyEvent = ${JSON.stringify(PWA_BOOT_READY_EVENT)};
      let ready = false;
      root.dataset.pwaBootState = "booting";

      const markReady = () => {
        ready = true;
        root.dataset.pwaBootState = "ready";
        window.clearTimeout(deadline);
      };

      window.addEventListener(readyEvent, markReady, { once: true });
      const deadline = window.setTimeout(() => {
        if (ready || !document.querySelector(".app-splash--visible")) {
          return;
        }
        root.dataset.pwaBootState = "failed";
        window.location.replace("/offline.html");
      }, ${PWA_BOOT_DEADLINE_MS});
    })();
  `;
}
