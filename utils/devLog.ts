const isDevelopmentRuntime = process.env.NODE_ENV !== "production";

export function devLog(...args: unknown[]) {
  if (isDevelopmentRuntime) {
    console.log(...args);
  }
}

export function devInfo(...args: unknown[]) {
  if (isDevelopmentRuntime) {
    console.info(...args);
  }
}

export function devDebug(...args: unknown[]) {
  if (isDevelopmentRuntime) {
    console.debug(...args);
  }
}

export function devWarn(...args: unknown[]) {
  if (isDevelopmentRuntime) {
    console.warn(...args);
  }
}

export { isDevelopmentRuntime };
