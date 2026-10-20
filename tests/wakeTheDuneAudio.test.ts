import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  WAKE_THE_DUNE_ASSET_MANIFEST,
  WAKE_THE_DUNE_LOOP_DURATION_SECONDS,
  WAKE_THE_DUNE_STEM_FADE_SECONDS,
} from "@/lib/miniGames/wakeTheDuneAssets";
import {
  WAKE_THE_DUNE_AUDIO_LEVELS,
  WakeTheDuneAudio,
  getSharedTransportPosition,
} from "@/lib/miniGames/wakeTheDuneAudio";

class FakeParam {
  value = 0;
  events: Array<{ type: string; value?: number; time: number }> = [];
  cancelScheduledValues(time: number) { this.events.push({ type: "cancel", time }); }
  setValueAtTime(value: number, time: number) { this.value = value; this.events.push({ type: "set", value, time }); }
  linearRampToValueAtTime(value: number, time: number) { this.value = value; this.events.push({ type: "linear", value, time }); }
  exponentialRampToValueAtTime(value: number, time: number) { this.value = value; this.events.push({ type: "exponential", value, time }); }
}

class FakeNode {
  connections: unknown[] = [];
  connect(node: unknown) { this.connections.push(node); return node; }
  disconnect() { this.connections = []; }
}

class FakeBuffer {
  readonly channels: Float32Array[];
  constructor(public numberOfChannels: number, public length: number, public sampleRate: number, public marker = 0) {
    this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }
  get duration() { return this.length / this.sampleRate; }
  getChannelData(channel: number) { return this.channels[channel]; }
}

class FakeGain extends FakeNode { gain = new FakeParam(); }
class FakeOscillator extends FakeNode {
  type: OscillatorType = "sine";
  frequency = new FakeParam();
  onended: (() => void) | null = null;
  starts: number[] = [];
  stops: number[] = [];
  start(when = 0) { this.starts.push(when); }
  stop(when = 0) { this.stops.push(when); }
}
class FakeSource extends FakeNode {
  buffer: FakeBuffer | null = null;
  onended: (() => void) | null = null;
  starts: Array<{ when: number; offset: number }> = [];
  stops: number[] = [];
  start(when = 0, offset = 0) { this.starts.push({ when, offset }); }
  stop(when = 0) { this.stops.push(when); }
}

class FakeContext {
  currentTime = 10;
  state: AudioContextState = "running";
  destination = new FakeNode();
  sources: FakeSource[] = [];
  gains: FakeGain[] = [];
  oscillators: FakeOscillator[] = [];
  createdBuffers = 0;
  createGain() { const gain = new FakeGain(); this.gains.push(gain); return gain as unknown as GainNode; }
  createBufferSource() { const source = new FakeSource(); this.sources.push(source); return source as unknown as AudioBufferSourceNode; }
  createOscillator() { const oscillator = new FakeOscillator(); this.oscillators.push(oscillator); return oscillator as unknown as OscillatorNode; }
  createBuffer(channels: number, length: number, sampleRate: number) { this.createdBuffers += 1; return new FakeBuffer(channels, length, sampleRate) as unknown as AudioBuffer; }
  async decodeAudioData(data: ArrayBuffer) {
    const marker = new Uint8Array(data)[0] ?? 1;
    const seconds = marker % 2 === 0 ? 156.316735 : 174.28898;
    return new FakeBuffer(2, Math.round(seconds * 1_000_000), 1_000_000, marker) as unknown as AudioBuffer;
  }
  resume() { this.state = "running"; return Promise.resolve(); }
  suspend() { this.state = "suspended"; return Promise.resolve(); }
  close() { this.state = "closed"; return Promise.resolve(); }
}

const responseForUrl = async (input: RequestInfo | URL) => {
  const url = String(input);
  const match = url.match(/(?:music\/)?(\d{2})-/);
  const marker = match ? Number(match[1]) : 1;
  return { ok: true, status: 200, arrayBuffer: async () => new Uint8Array([marker]).buffer } as Response;
};

describe("Wake the Dune shared music transport", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { setTimeout, clearTimeout });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("calculates one modulo transport position", () => {
    expect(getSharedTransportPosition(83.42, 10)).toBeCloseTo(73.42, 5);
    expect(getSharedTransportPosition(10 + WAKE_THE_DUNE_LOOP_DURATION_SECONDS + 4, 10)).toBeCloseTo(4, 5);
  });

  it("keeps exactly eight typed stems and does not expose deep-drum assets", () => {
    const urls = Object.values(WAKE_THE_DUNE_ASSET_MANIFEST.assets).map((asset) => asset.source.url);
    expect(urls).toHaveLength(8);
    expect(urls.some((url) => url.includes("deep-drum"))).toBe(false);
  });

  it("joins a new stem at the current shared offset with a 1.75s fade", async () => {
    const context = new FakeContext();
    const audio = new WakeTheDuneAudio({ contextFactory: () => context as unknown as AudioContext, fetcher: responseForUrl as typeof fetch });
    await audio.prepareInitial();
    audio.startTransport();
    context.currentTime = 83.42;
    await audio.unlockStem("stem-01");
    const snapshot = audio.getDebugSnapshot();
    const current = snapshot.scheduledSources.find((source) => source.stemId === "stem-01" && source.epoch === 0);
    expect(current?.offset).toBeCloseTo(73.42, 4);
    expect(current?.offset).not.toBe(0);
    const stemGain = context.gains[2].gain.events;
    expect(stemGain).toContainEqual(expect.objectContaining({ type: "linear", time: 83.42 + WAKE_THE_DUNE_STEM_FADE_SECONDS }));
    audio.dispose();
  });

  it("schedules all active stems on identical shared loop boundaries without duplicates", async () => {
    const context = new FakeContext();
    const audio = new WakeTheDuneAudio({ contextFactory: () => context as unknown as AudioContext, fetcher: responseForUrl as typeof fetch });
    await audio.prepareInitial();
    audio.startTransport();
    context.currentTime = 42;
    await audio.unlockStem("stem-01");
    await audio.unlockStem("stem-02");
    await audio.unlockStem("stem-02");
    const sources = audio.getDebugSnapshot().scheduledSources;
    const stem1Epoch1 = sources.find((source) => source.stemId === "stem-01" && source.epoch === 1);
    const stem2Epoch1 = sources.find((source) => source.stemId === "stem-02" && source.epoch === 1);
    expect(stem1Epoch1?.startsAt).toBe(stem2Epoch1?.startsAt);
    expect(stem1Epoch1?.offset).toBe(0);
    expect(sources.filter((source) => source.stemId === "stem-02" && source.epoch === 0)).toHaveLength(1);
    audio.setMode("listen");
    expect(audio.getDebugSnapshot().transportStartedAt).toBe(10);
    audio.dispose();
    expect(context.state).toBe("closed");
  });

  it("restores the original synthesized tap on the separate SFX bus", async () => {
    const context = new FakeContext();
    const audio = new WakeTheDuneAudio({ contextFactory: () => context as unknown as AudioContext, fetcher: responseForUrl as typeof fetch });
    await audio.prepareInitial();
    const busSnapshot = audio.getDebugSnapshot();
    expect(busSnapshot.musicGain).not.toBe(busSnapshot.sfxGain);
    audio.playTap();
    expect(context.sources).toHaveLength(0);
    expect(context.oscillators).toHaveLength(1);
    expect(context.oscillators[0].type).toBe("triangle");
    expect(context.oscillators[0].frequency.events).toContainEqual(expect.objectContaining({ type: "set", value: 118 }));
    expect(context.oscillators[0].frequency.events).toContainEqual(expect.objectContaining({ type: "exponential", value: 58 }));
    expect(context.oscillators[0].stops).toEqual([10.12]);
    expect(context.gains[1].gain.value).toBe(WAKE_THE_DUNE_AUDIO_LEVELS.sfxBus);
    expect(context.gains[2].gain.events).toContainEqual(expect.objectContaining({
      type: "set",
      value: WAKE_THE_DUNE_AUDIO_LEVELS.tapAmplitude,
    }));
    expect(WAKE_THE_DUNE_AUDIO_LEVELS.sfxBus * WAKE_THE_DUNE_AUDIO_LEVELS.tapAmplitude).toBeLessThan(1);
    audio.dispose();
  });

  it("ducks LISTEN and PLAY quickly, then restores REWARD smoothly", async () => {
    const context = new FakeContext();
    const audio = new WakeTheDuneAudio({ contextFactory: () => context as unknown as AudioContext, fetcher: responseForUrl as typeof fetch });
    await audio.prepareInitial();
    const musicGain = context.gains[0].gain;
    expect(musicGain.value).toBe(WAKE_THE_DUNE_AUDIO_LEVELS.normalMusic);

    audio.setMode("listen");
    expect(musicGain.events.at(-1)).toEqual({
      type: "linear",
      value: WAKE_THE_DUNE_AUDIO_LEVELS.duckedMusic,
      time: 10 + WAKE_THE_DUNE_AUDIO_LEVELS.duckSeconds,
    });

    context.currentTime = 11;
    const eventCountAfterListen = musicGain.events.length;
    audio.setMode("play");
    expect(musicGain.events).toHaveLength(eventCountAfterListen);

    context.currentTime = 12;
    audio.setMode("reward");
    expect(musicGain.events.at(-1)).toEqual({
      type: "linear",
      value: WAKE_THE_DUNE_AUDIO_LEVELS.normalMusic,
      time: 12 + WAKE_THE_DUNE_AUDIO_LEVELS.restoreSeconds,
    });
    audio.dispose();
  });

  it("cancels an in-flight restore when a rapid retry returns to LISTEN", async () => {
    const context = new FakeContext();
    const audio = new WakeTheDuneAudio({ contextFactory: () => context as unknown as AudioContext, fetcher: responseForUrl as typeof fetch });
    await audio.prepareInitial();
    const musicGain = context.gains[0].gain;
    audio.setMode("reward");
    context.currentTime = 10.1;
    audio.setMode("listen");
    expect(musicGain.events.slice(-3)).toEqual([
      { type: "cancel", time: 10.1 },
      expect.objectContaining({ type: "set", time: 10.1 }),
      {
        type: "linear",
        value: WAKE_THE_DUNE_AUDIO_LEVELS.duckedMusic,
        time: 10.1 + WAKE_THE_DUNE_AUDIO_LEVELS.duckSeconds,
      },
    ]);
    expect(audio.getDebugSnapshot().mode).toBe("listen");
    audio.dispose();
  });

  it("suspends and resumes the shared audio clock without rebuilding transport", async () => {
    const context = new FakeContext();
    const audio = new WakeTheDuneAudio({ contextFactory: () => context as unknown as AudioContext, fetcher: responseForUrl as typeof fetch });
    await audio.prepareInitial();
    audio.startTransport();
    const transportStartedAt = audio.getDebugSnapshot().transportStartedAt;

    await audio.suspend();
    expect(context.state).toBe("suspended");
    expect(audio.getDebugSnapshot().transportStartedAt).toBe(transportStartedAt);

    await audio.resume();
    expect(context.state).toBe("running");
    expect(audio.getDebugSnapshot().transportStartedAt).toBe(transportStartedAt);
    audio.dispose();
  });

  it("retains a short stem's decoded 156.316735s duration without padding", async () => {
    const context = new FakeContext();
    const audio = new WakeTheDuneAudio({ contextFactory: () => context as unknown as AudioContext, fetcher: responseForUrl as typeof fetch });
    audio.startTransport();
    await audio.unlockStem("stem-02");
    const snapshot = audio.getDebugSnapshot();
    expect(snapshot.rawDurations["stem-02"]).toBeCloseTo(156.316735, 6);
    expect(snapshot.loadedDurations["stem-02"]).toBeCloseTo(156.316735, 6);
    expect(context.createdBuffers).toBe(0);
    audio.dispose();
  });

  it("lets a short stem join at 140s and end naturally at its real endpoint", async () => {
    const context = new FakeContext();
    const audio = new WakeTheDuneAudio({ contextFactory: () => context as unknown as AudioContext, fetcher: responseForUrl as typeof fetch });
    audio.startTransport();
    context.currentTime = 150;
    await audio.unlockStem("stem-02");
    const current = audio.getDebugSnapshot().scheduledSources.find((source) => source.stemId === "stem-02" && source.epoch === 0);
    expect(current?.offset).toBeCloseTo(140, 5);
    const source = context.sources.find((candidate) => candidate.starts.some((start) => start.offset === 140));
    expect(source?.stops).toEqual([]);
    audio.dispose();
  });

  it("does not start a short stem after its endpoint in the current pass", async () => {
    const context = new FakeContext();
    const audio = new WakeTheDuneAudio({ contextFactory: () => context as unknown as AudioContext, fetcher: responseForUrl as typeof fetch });
    audio.startTransport();
    context.currentTime = 175;
    await audio.unlockStem("stem-02");
    const sources = audio.getDebugSnapshot().scheduledSources.filter((source) => source.stemId === "stem-02");
    expect(sources.some((source) => source.epoch === 0)).toBe(false);
    expect(sources.find((source) => source.epoch === 1)).toEqual(expect.objectContaining({ offset: 0, startsAt: 10 + WAKE_THE_DUNE_LOOP_DURATION_SECONDS }));
    audio.dispose();
  });

  it("runs a long stem to the canonical endpoint and restarts unlocked stems together at shared zero", async () => {
    const context = new FakeContext();
    const audio = new WakeTheDuneAudio({ contextFactory: () => context as unknown as AudioContext, fetcher: responseForUrl as typeof fetch });
    await audio.prepareInitial();
    audio.startTransport();
    context.currentTime = 175;
    await audio.unlockStem("stem-01");
    await audio.unlockStem("stem-02");
    const snapshot = audio.getDebugSnapshot();
    const longCurrent = snapshot.scheduledSources.find((source) => source.stemId === "stem-01" && source.epoch === 0);
    expect(longCurrent?.offset).toBeCloseTo(165, 5);
    const epochOne = snapshot.scheduledSources.filter((source) => source.epoch === 1);
    expect(epochOne.filter((source) => source.stemId === "stem-01" || source.stemId === "stem-02")).toHaveLength(2);
    expect(new Set(epochOne.map((source) => source.startsAt))).toEqual(new Set([10 + WAKE_THE_DUNE_LOOP_DURATION_SECONDS]));
    expect(epochOne.every((source) => source.offset === 0)).toBe(true);
    expect(context.sources.every((source) => source.stops.length === 0)).toBe(true);
    audio.dispose();
  });

  it("survives a failed stem request without restarting the transport", async () => {
    const context = new FakeContext();
    const failingFetch = (async (input: RequestInfo | URL) => String(input).includes("03-wake")
      ? { ok: false, status: 503, arrayBuffer: async () => new ArrayBuffer(0) } as Response
      : responseForUrl(input)) as typeof fetch;
    const audio = new WakeTheDuneAudio({ contextFactory: () => context as unknown as AudioContext, fetcher: failingFetch });
    await audio.prepareInitial();
    audio.startTransport();
    context.currentTime = 50;
    await expect(audio.unlockStem("stem-03")).rejects.toThrow();
    expect(audio.getDebugSnapshot().transportStartedAt).toBe(10);
    expect(audio.getDebugSnapshot().activeStems).toEqual([]);
    audio.dispose();
  });

  it("can retry the initial music request after a transient fetch failure", async () => {
    const context = new FakeContext();
    let attempts = 0;
    const flakyFetch = (async (input: RequestInfo | URL) => {
      attempts += 1;
      if (attempts === 1) throw new TypeError("Failed to fetch");
      return responseForUrl(input);
    }) as typeof fetch;
    const audio = new WakeTheDuneAudio({ contextFactory: () => context as unknown as AudioContext, fetcher: flakyFetch });
    await expect(audio.prepareInitial()).rejects.toThrow("Failed to fetch");
    await expect(audio.prepareInitial()).resolves.toBeUndefined();
    expect(attempts).toBe(2);
    expect(audio.getDebugSnapshot().loadedDurations["stem-01"]).toBeCloseTo(174.28898, 5);
    audio.dispose();
  });
});
