/** A single keyed delay that preserves its remaining time across pauses. */
export class PausableEqualizerTimer {
  private key: string | null = null;
  private remainingMs = 0;
  private startedAt = 0;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private callback: (() => void) | null = null;
  private paused = false;

  schedule(key: string, durationMs: number, callback: () => void) {
    if (this.key === key) return;
    this.clear();
    this.key = key;
    this.remainingMs = durationMs;
    this.callback = callback;
    if (!this.paused) this.arm();
  }

  pause() {
    if (this.paused) return;
    this.paused = true;
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
      this.remainingMs = Math.max(0, this.remainingMs - (Date.now() - this.startedAt));
    }
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    if (this.key !== null) this.arm();
  }

  clear() {
    if (this.timeoutId !== null) clearTimeout(this.timeoutId);
    this.timeoutId = null;
    this.key = null;
    this.callback = null;
    this.remainingMs = 0;
  }

  private arm() {
    this.startedAt = Date.now();
    this.timeoutId = setTimeout(() => {
      this.timeoutId = null;
      const callback = this.callback;
      this.key = null;
      this.callback = null;
      this.remainingMs = 0;
      callback?.();
    }, this.remainingMs);
  }
}
