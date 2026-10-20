import {
  WAKE_THE_DUNE_LOOP_DURATION_SECONDS,
  WAKE_THE_DUNE_STEM_FADE_SECONDS,
  WAKE_THE_DUNE_STEM_ORDER,
  getWakeTheDuneAudioUrl,
  type WakeTheDuneAudioAssetId,
  type WakeTheDuneStemId,
} from "./wakeTheDuneAssets";

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };
export type WakeTheDuneAudioMode = "normal" | "listen" | "play" | "reward";

export const WAKE_THE_DUNE_AUDIO_LEVELS = {
  normalMusic: 0.5,
  duckedMusic: 0.17,
  sfxBus: 0.92,
  tapAmplitude: 0.38,
  duckSeconds: 0.2,
  restoreSeconds: 0.7,
} as const;

const MUSIC_GAIN: Record<WakeTheDuneAudioMode, number> = {
  normal: WAKE_THE_DUNE_AUDIO_LEVELS.normalMusic,
  listen: WAKE_THE_DUNE_AUDIO_LEVELS.duckedMusic,
  play: WAKE_THE_DUNE_AUDIO_LEVELS.duckedMusic,
  reward: WAKE_THE_DUNE_AUDIO_LEVELS.normalMusic,
};
const STEM_GAIN = 0.82;
const SFX_GAIN = WAKE_THE_DUNE_AUDIO_LEVELS.sfxBus;
const SCHEDULED_LOOP_HORIZON = 3;

export function getSharedTransportPosition(currentTime: number, transportStartedAt: number, duration = WAKE_THE_DUNE_LOOP_DURATION_SECONDS) {
  return Math.max(0, currentTime - transportStartedAt) % duration;
}

type WakeTheDuneAudioOptions = { contextFactory?: () => AudioContext; fetcher?: typeof fetch };
type ScheduledSource = { source: AudioBufferSourceNode; stemId: WakeTheDuneStemId; epoch: number; offset: number; startsAt: number };

export class WakeTheDuneAudio {
  private context: AudioContext | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private buffers = new Map<WakeTheDuneAudioAssetId, AudioBuffer>();
  private rawDurations = new Map<WakeTheDuneAudioAssetId, number>();
  private loads = new Map<WakeTheDuneAudioAssetId, Promise<AudioBuffer>>();
  private activeStems = new Set<WakeTheDuneStemId>();
  private stemGains = new Map<WakeTheDuneStemId, GainNode>();
  private scheduledSources = new Map<string, ScheduledSource>();
  private transportStartedAt: number | null = null;
  private loopSchedulerTimer: number | null = null;
  private disposed = false;
  private mode: WakeTheDuneAudioMode = "normal";
  private musicGainTarget = MUSIC_GAIN.normal;
  private readonly contextFactory?: () => AudioContext;
  private readonly fetcher: typeof fetch;

  constructor(options: WakeTheDuneAudioOptions = {}) {
    this.contextFactory = options.contextFactory;
    this.fetcher = options.fetcher ?? ((input, init) => fetch(input, init));
  }

  private getContext() {
    if (this.disposed) throw new Error("Wake the Dune audio has been disposed");
    if (!this.context || this.context.state === "closed") {
      const AudioContextCtor = typeof window !== "undefined"
        ? window.AudioContext || (window as WebkitWindow).webkitAudioContext
        : undefined;
      this.context = this.contextFactory?.() ?? (AudioContextCtor ? new AudioContextCtor() : null);
      if (!this.context) throw new Error("Web Audio API is unavailable");
      this.musicBus = this.context.createGain();
      this.sfxBus = this.context.createGain();
      this.musicBus.gain.value = MUSIC_GAIN[this.mode];
      this.sfxBus.gain.value = SFX_GAIN;
      this.musicBus.connect(this.context.destination);
      this.sfxBus.connect(this.context.destination);
    }
    return this.context;
  }

  unlock() {
    try {
      const context = this.getContext();
      if (context.state !== "running") void context.resume().catch(() => {});
      return context;
    } catch {
      return null;
    }
  }

  suspend() {
    if (this.context?.state === "running") return this.context.suspend();
    return Promise.resolve();
  }

  resume() {
    if (this.context?.state === "suspended") return this.context.resume();
    return Promise.resolve();
  }

  private load(id: WakeTheDuneAudioAssetId) {
    const loaded = this.buffers.get(id);
    if (loaded) return Promise.resolve(loaded);
    const pending = this.loads.get(id);
    if (pending) return pending;
    const promise = (async () => {
      const url = getWakeTheDuneAudioUrl(id);
      let response: Response | undefined;
      try {
        response = await this.fetcher(url);
        if (!response.ok) throw new Error(`Audio request failed: ${response.status}`);
        const encoded = await response.arrayBuffer();
        const decoded = await this.getContext().decodeAudioData(encoded.slice(0));
        this.rawDurations.set(id, decoded.duration);
        this.buffers.set(id, decoded);
        this.loads.delete(id);
        return decoded;
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          const details = error instanceof Error ? { name: error.name, message: error.message } : { name: "UnknownError", message: String(error) };
          const diagnosticUrl = typeof window === "undefined" ? url : new URL(url, window.location.origin).href;
          console.warn("[wake-the-dune:audio] request failed", {
            id,
            url: diagnosticUrl,
            status: response?.status ?? null,
            online: typeof navigator === "undefined" ? null : navigator.onLine,
            ...details,
          });
        }
        throw error;
      }
    })().catch((error) => { this.loads.delete(id); throw error; });
    this.loads.set(id, promise);
    return promise;
  }

  async prepareInitial() {
    await this.load("stem-01");
  }

  preloadAhead(currentStemIndex: number) {
    for (let index = currentStemIndex + 1; index <= Math.min(currentStemIndex + 2, WAKE_THE_DUNE_STEM_ORDER.length - 1); index += 1) {
      void this.load(WAKE_THE_DUNE_STEM_ORDER[index]).catch(() => {});
    }
  }

  startTransport() {
    const context = this.unlock();
    if (!context || this.transportStartedAt !== null) return;
    this.transportStartedAt = context.currentTime;
    this.scheduleLoopMaintenance();
  }

  getTransportPosition() {
    if (!this.context || this.transportStartedAt === null) return 0;
    return getSharedTransportPosition(this.context.currentTime, this.transportStartedAt);
  }

  private sourceKey(stemId: WakeTheDuneStemId, epoch: number) { return `${stemId}:${epoch}`; }

  private getStemGain(stemId: WakeTheDuneStemId) {
    const existing = this.stemGains.get(stemId);
    if (existing) return existing;
    const gain = this.getContext().createGain();
    gain.gain.value = 0;
    gain.connect(this.musicBus!);
    this.stemGains.set(stemId, gain);
    return gain;
  }

  private scheduleSource(stemId: WakeTheDuneStemId, epoch: number, startsAt: number, offset: number) {
    const key = this.sourceKey(stemId, epoch);
    if (this.scheduledSources.has(key)) return;
    const context = this.getContext();
    const buffer = this.buffers.get(stemId);
    if (!buffer || !this.activeStems.has(stemId)) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.getStemGain(stemId));
    source.start(startsAt, offset);
    const epochEnd = this.transportStartedAt! + (epoch + 1) * WAKE_THE_DUNE_LOOP_DURATION_SECONDS;
    const naturalEnd = startsAt + Math.max(0, buffer.duration - offset);
    if (naturalEnd > epochEnd + 0.001) source.stop(epochEnd);
    this.scheduledSources.set(key, { source, stemId, epoch, offset, startsAt });
    source.onended = () => {
      source.disconnect();
      if (this.scheduledSources.get(key)?.source === source) this.scheduledSources.delete(key);
    };
  }

  private scheduleStemFromCurrentPosition(stemId: WakeTheDuneStemId) {
    const context = this.getContext();
    const origin = this.transportStartedAt;
    if (origin === null) return;
    const elapsed = Math.max(0, context.currentTime - origin);
    const epoch = Math.floor(elapsed / WAKE_THE_DUNE_LOOP_DURATION_SECONDS);
    const offset = elapsed - epoch * WAKE_THE_DUNE_LOOP_DURATION_SECONDS;
    const buffer = this.buffers.get(stemId);
    if (buffer && offset < buffer.duration) {
      this.scheduleSource(stemId, epoch, context.currentTime, offset);
    }
    for (let ahead = 1; ahead <= SCHEDULED_LOOP_HORIZON; ahead += 1) {
      const futureEpoch = epoch + ahead;
      this.scheduleSource(stemId, futureEpoch, origin + futureEpoch * WAKE_THE_DUNE_LOOP_DURATION_SECONDS, 0);
    }
  }

  private scheduleLoopMaintenance() {
    if (this.loopSchedulerTimer !== null || this.transportStartedAt === null || !this.context) return;
    const epoch = Math.floor((this.context.currentTime - this.transportStartedAt) / WAKE_THE_DUNE_LOOP_DURATION_SECONDS);
    const nextAt = this.transportStartedAt + (epoch + 2) * WAKE_THE_DUNE_LOOP_DURATION_SECONDS;
    this.loopSchedulerTimer = window.setTimeout(() => {
      this.loopSchedulerTimer = null;
      for (const stemId of this.activeStems) this.scheduleStemFromCurrentPosition(stemId);
      this.scheduleLoopMaintenance();
    }, Math.max(1000, (nextAt - this.context!.currentTime) * 1000));
  }

  async unlockStem(stemId: WakeTheDuneStemId) {
    this.startTransport();
    await this.load(stemId);
    if (this.activeStems.has(stemId)) return;
    const context = this.getContext();
    this.activeStems.add(stemId);
    const gain = this.getStemGain(stemId);
    gain.gain.cancelScheduledValues(context.currentTime);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.linearRampToValueAtTime(STEM_GAIN, context.currentTime + WAKE_THE_DUNE_STEM_FADE_SECONDS);
    this.scheduleStemFromCurrentPosition(stemId);
    this.preloadAhead(WAKE_THE_DUNE_STEM_ORDER.indexOf(stemId));
  }

  setMode(mode: WakeTheDuneAudioMode) {
    const target = MUSIC_GAIN[mode];
    this.mode = mode;
    if (target === this.musicGainTarget) return;
    this.musicGainTarget = target;
    if (!this.context || !this.musicBus) return;
    const now = this.context.currentTime;
    const transitionSeconds = mode === "normal" || mode === "reward"
      ? WAKE_THE_DUNE_AUDIO_LEVELS.restoreSeconds
      : WAKE_THE_DUNE_AUDIO_LEVELS.duckSeconds;
    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.setValueAtTime(Math.max(0.0001, this.musicBus.gain.value), now);
    this.musicBus.gain.linearRampToValueAtTime(target, now + transitionSeconds);
  }

  playTap() {
    this.unlock();
    this.playSynthTap();
  }

  private playSynthTap() {
    if (!this.context || !this.sfxBus) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(118, this.context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(58, this.context.currentTime + 0.095);
    gain.gain.setValueAtTime(WAKE_THE_DUNE_AUDIO_LEVELS.tapAmplitude, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + 0.105);
    oscillator.connect(gain); gain.connect(this.sfxBus);
    oscillator.start(); oscillator.stop(this.context.currentTime + 0.12);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }

  playSuccess() { this.playToneSequence([[392, 0], [523, 0.09], [659, 0.18]], 0.16, 0.12); }
  playFailure() { this.playToneSequence([[190, 0], [135, 0.14]], 0.18, 0.14); }

  private playToneSequence(notes: readonly (readonly [number, number])[], duration: number, volume: number) {
    const context = this.unlock();
    if (!context || !this.sfxBus) return;
    notes.forEach(([frequency, offset]) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine"; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, context.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(volume, context.currentTime + offset + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + offset + duration);
      oscillator.connect(gain); gain.connect(this.sfxBus!);
      oscillator.start(context.currentTime + offset); oscillator.stop(context.currentTime + offset + duration + 0.02);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  }

  restartTransport() {
    if (this.loopSchedulerTimer !== null && typeof window !== "undefined") window.clearTimeout(this.loopSchedulerTimer);
    this.loopSchedulerTimer = null;
    for (const scheduled of this.scheduledSources.values()) {
      scheduled.source.onended = null;
      try { scheduled.source.stop(); } catch { /* already ended */ }
      scheduled.source.disconnect();
    }
    this.scheduledSources.clear();
    for (const gain of this.stemGains.values()) gain.disconnect();
    this.stemGains.clear();
    this.activeStems.clear();
    this.transportStartedAt = null;
  }

  getDebugSnapshot() {
    return {
      transportPosition: this.getTransportPosition(),
      transportStartedAt: this.transportStartedAt,
      activeStems: [...this.activeStems],
      loadedDurations: Object.fromEntries([...this.buffers].map(([id, buffer]) => [id, buffer.duration])),
      rawDurations: Object.fromEntries(this.rawDurations),
      scheduledSources: [...this.scheduledSources.values()].map(({ stemId, epoch, offset, startsAt }) => ({ stemId, epoch, offset, startsAt })),
      musicGain: this.musicBus?.gain.value ?? null,
      sfxGain: this.sfxBus?.gain.value ?? null,
      contextState: this.context?.state ?? null,
      mode: this.mode,
    };
  }

  dispose() {
    if (this.disposed) return;
    this.restartTransport();
    this.disposed = true;
    this.musicBus?.disconnect(); this.sfxBus?.disconnect();
    this.musicBus = null; this.sfxBus = null;
    const context = this.context; this.context = null;
    if (context && context.state !== "closed") void context.close();
  }
}
