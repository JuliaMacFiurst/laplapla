// ======================================================
// ✅ Unified Dev Logger
// Integrates with browser-capture.js
// ======================================================

/**
 * Отправляет лог в систему browser-capture, если она активна.
 * Если нет (например, при SSR или локальной ошибке),
 * просто выводит сообщение в консоль.
 */
export function devLog(type: string, detail: Record<string, any> = {}) {
  try {
    if (typeof window !== "undefined" && (window as any).__browserCapture) {
      (window as any).__browserCapture.capture(type, detail);
    } else {
      console.log("🦝 devLog:", type, detail);
    }
  } catch (err) {
    console.warn("🦝 devLog error:", err);
  }
}

/*
Примеры использования:

devLog("country-click", { id: "IL", note: "manual trigger" });
devLog("debug", { info: "popup opened successfully" });
devLog("ai-freeze", { reason: "no response for 5s" });
*/