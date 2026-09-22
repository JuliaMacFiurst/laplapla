import { afterEach, describe, expect, it, vi } from "vitest";
import { requireQuestAssetUrl } from "@/lib/shop/questAssets";
import { SOUND_CASE_001_ASSET_MANIFEST, STAGE_3_DISTRACTOR_FILES } from "@/lib/shop/quests/sound-case-001/assets";
import { HumanEqualizerAudio, TARGET_FREQUENCIES_HZ, TARGET_TONE_GAIN, TARGET_TONE_SECONDS, TARGET_TONE_WAVEFORM } from "@/lib/shop/quests/sound-case-001/humanEqualizerAudio";
import { PausableEqualizerTimer } from "@/lib/shop/quests/sound-case-001/humanEqualizerTimer";
import {
  ANSWER_HELP_DELAY_MS,
  EQUALIZER_COUNTDOWN_MS,
  DISTRACTOR_IDS,
  EQUALIZER_ROUNDS,
  EQUALIZER_TIMING,
  INITIAL_EQUALIZER_STATE,
  TOTAL_EQUALIZER_EVENTS,
  getEqualizerEvent,
  getHostFaderResponse,
  pickTrainingDistractor,
  reduceEqualizerGame,
} from "@/lib/shop/quests/sound-case-001/humanEqualizerGame";

function finishCountdown(state: ReturnType<typeof reduceEqualizerGame>) {
  for (let step = 0; step < 4; step += 1) state = reduceEqualizerGame(state, { type: "countdown-next" });
  return state;
}

describe("Sound Case #001 Human Equalizer", () => {
  it("keeps the prescribed training order and truthful production distractor IDs", () => {
    expect(EQUALIZER_ROUNDS["round-1"].map((event) => event.emittedSignal)).toEqual(
      ["high", "mid", "low", "mid", "high", "low", "low", "mid", "high"]
        .map((target) => ({ type: "target", target })),
    );
    expect(DISTRACTOR_IDS).toEqual([
      "cow", "duck", "cartoon-sneeze", "clown-horn", "squeaky-toy",
      "flute-whistle", "splat", "metal-smash", "cartoon-laugh", "rattle",
      "rubber-squeak", "trombone", "human-sneeze", "spinning-whistle",
    ]);
    expect(JSON.stringify(EQUALIZER_ROUNDS)).not.toMatch(/\.mp3|https?:\/\//);
    expect(TOTAL_EQUALIZER_EVENTS).toBe(43);
  });

  it("resolves every exact MP3 through the typed manifest", () => {
    const expected = {
      "cartoon-sneeze": "mixkit-cartoon-sneeze-747.mp3",
      "clown-horn": "mixkit-clown-horn-at-circus-715.mp3",
      "squeaky-toy": "mixkit-clown-squeaky-toy-2816.mp3",
      cow: "mixkit-cow-moo-in-the-barn-1751.mp3",
      "flute-whistle": "mixkit-flute-toy-whistle-2812.mp3",
      splat: "mixkit-funny-cartoon-fast-splat-2889.mp3",
      "metal-smash": "mixkit-heavy-sword-smashes-metal-2795.mp3",
      "cartoon-laugh": "mixkit-laughing-cartoon-creature-414.mp3",
      rattle: "mixkit-rattle-toy-shaking-2824.mp3",
      duck: "mixkit-rubber-duck-squeak-1014.mp3",
      "rubber-squeak": "mixkit-rubber-squeaking-1009.mp3",
      trombone: "mixkit-sad-game-over-trombone-471.mp3",
      "human-sneeze": "mixkit-sick-man-sneeze-2213.mp3",
      "spinning-whistle": "mixkit-spinning-whistle-toy-2647.mp3",
    } as const;
    expect(STAGE_3_DISTRACTOR_FILES).toEqual(expected);
    for (const id of DISTRACTOR_IDS) {
      expect(requireQuestAssetUrl(SOUND_CASE_001_ASSET_MANIFEST.assets[`stage-3-distractor-${id}`]))
        .toBe(`https://media.laplapla.com/quests/sound-case-001/stage-03-human-equalizer/audio/${expected[id]}`);
    }
    expect(EQUALIZER_ROUNDS["round-2"].filter((event) => event.emittedSignal.type === "distractor").map((event) => event.emittedSignal.type === "distractor" ? event.emittedSignal.soundId : null))
      .toEqual(["duck", "cartoon-sneeze", "cow", "clown-horn", "squeaky-toy", "flute-whistle", "rattle", "trombone"]);
    expect(EQUALIZER_ROUNDS["round-3"].filter((event) => event.emittedSignal.type === "distractor").map((event) => event.emittedSignal.type === "distractor" ? event.emittedSignal.soundId : null))
      .toEqual(["splat", "duck", "cow", "cartoon-laugh", "rubber-squeak", "metal-smash", "human-sneeze", "spinning-whistle"]);
  });

  it("transitions through mode choice, training, later rounds, boom and clue", () => {
    let state = reduceEqualizerGame(INITIAL_EQUALIZER_STATE, { type: "choose-mode", mode: "parrot" });
    expect(state.phase).toBe("instructions");
    state = reduceEqualizerGame(state, { type: "start" });
    expect(state.phase).toBe("countdown");
    state = finishCountdown(state);
    for (const round of ["round-1", "round-2", "round-3"] as const) {
      expect(state.phase).toBe(round);
      for (const _event of EQUALIZER_ROUNDS[round]) {
        state = reduceEqualizerGame(state, { type: "fire-event" });
        state = reduceEqualizerGame(state, { type: "reveal-feedback" });
        state = reduceEqualizerGame(state, { type: "advance" });
      }
    }
    expect(state.phase).toBe("boom");
    expect(reduceEqualizerGame(state, { type: "boom-finished" }).phase).toBe("clue-reveal");
  });

  it("delays poses in real rounds and holds the previous pose for distractors", () => {
    const instructions = reduceEqualizerGame(INITIAL_EQUALIZER_STATE, { type: "choose-mode", mode: "host" });
    let state = reduceEqualizerGame(instructions, { type: "start" });
    state = finishCountdown(state);
    state = reduceEqualizerGame(state, { type: "fire-event" });
    expect(state.humanPose).toBe("high"); // training moves with the tone
    state = { ...state, phase: "round-2", eventIndex: 0, eventStatus: "ready", humanPose: "mid" };
    state = reduceEqualizerGame(state, { type: "fire-event" });
    expect(state.humanPose).toBe("mid");
    state = reduceEqualizerGame(state, { type: "reveal-feedback" });
    expect(state.humanPose).toBe("low");
    state = reduceEqualizerGame(state, { type: "advance" });
    expect(getEqualizerEvent(state)?.emittedSignal).toEqual({ type: "distractor", soundId: "duck" });
    state = reduceEqualizerGame(state, { type: "fire-event" });
    state = reduceEqualizerGame(state, { type: "reveal-feedback" });
    expect(state.humanPose).toBe("low");
  });

  it("allows a broken fader to show HIGH while emitting cow, then fully restarts", () => {
    const broken = EQUALIZER_ROUNDS["round-3"].find((event) => event.emittedSignal.type === "distractor" && event.emittedSignal.soundId === "cow");
    expect(broken).toEqual({ visualPosition: "high", emittedSignal: { type: "distractor", soundId: "cow" } });
    expect(EQUALIZER_ROUNDS["round-3"].filter((event) => event.emittedSignal.type === "distractor" && event.emittedSignal.soundId === "splat")).toHaveLength(1);
    const playing = { ...INITIAL_EQUALIZER_STATE, phase: "round-3" as const, mode: "host" as const, eventIndex: 6, visualFaderPosition: "low" as const };
    const fired = reduceEqualizerGame(playing, { type: "fire-event" });
    expect(fired.visualFaderPosition).toBe("high");
    expect(fired.emittedSignal).toEqual({ type: "distractor", soundId: "cow" });
    expect(reduceEqualizerGame(fired, { type: "restart" })).toEqual(INITIAL_EQUALIZER_STATE);
  });
});

describe("Human Equalizer practice audio", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it("keeps Calm and Fast on the same 43 events with 800 ms extra per event in Calm", () => {
    expect(TOTAL_EQUALIZER_EVENTS).toBe(43);
    for (const round of ["round-1", "round-2", "round-3"] as const) {
      const total = (tempo: "calm" | "fast") => EQUALIZER_TIMING[tempo].roundLeadMs[round]
        + EQUALIZER_TIMING[tempo].reactionMs[round] + EQUALIZER_TIMING[tempo].feedbackMs[round];
      expect(total("calm") - total("fast")).toBe(800);
      expect(EQUALIZER_TIMING.fast.reactionMs[round]).toBeGreaterThan(ANSWER_HELP_DELAY_MS);
    }
    expect(ANSWER_HELP_DELAY_MS).toBe(600);
  });

  it("counts 3, 2, 1, START without emitting or advancing a game event", () => {
    let state = reduceEqualizerGame(INITIAL_EQUALIZER_STATE, { type: "choose-mode", mode: "parrot" });
    state = reduceEqualizerGame(state, { type: "start" });
    expect(EQUALIZER_COUNTDOWN_MS).toEqual({ 3: 800, 2: 800, 1: 800, start: 700 });
    for (const step of [3, 2, 1, "start"] as const) {
      expect(state.phase).toBe("countdown");
      expect(state.countdownStep).toBe(step);
      expect(getEqualizerEvent(state)).toBeNull();
      expect(state.eventIndex).toBe(0);
      expect(reduceEqualizerGame(state, { type: "fire-event" })).toEqual(state);
      state = reduceEqualizerGame(state, { type: "countdown-next" });
    }
    expect(state.phase).toBe("round-1");
    expect(state.eventStatus).toBe("ready");
    expect(state.emittedSignal).toBeNull();
  });

  it("cancels countdown so no stale timer can start Round 1 after BACK", () => {
    vi.useFakeTimers();
    const timer = new PausableEqualizerTimer();
    let state = reduceEqualizerGame(INITIAL_EQUALIZER_STATE, { type: "choose-mode", mode: "host" });
    state = reduceEqualizerGame(state, { type: "start" });
    timer.schedule("countdown-3", EQUALIZER_COUNTDOWN_MS[3], () => { state = reduceEqualizerGame(state, { type: "countdown-next" }); });
    timer.clear();
    state = reduceEqualizerGame(state, { type: "restart" });
    vi.advanceTimersByTime(5000);
    expect(state).toEqual(INITIAL_EQUALIZER_STATE);
  });

  it("pauses a pending event without consuming its remaining time", () => {
    vi.useFakeTimers();
    const timer = new PausableEqualizerTimer();
    const fire = vi.fn();
    timer.schedule("round-1-0-ready", 1000, fire);
    vi.advanceTimersByTime(400);
    timer.pause();
    vi.advanceTimersByTime(5000);
    expect(fire).not.toHaveBeenCalled();
    timer.resume();
    vi.advanceTimersByTime(599);
    expect(fire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fire).toHaveBeenCalledOnce();
    timer.clear();
  });

  it("freezes reducer progression, resumes in place, and resets cleanly on exit", () => {
    let state = reduceEqualizerGame(INITIAL_EQUALIZER_STATE, { type: "choose-mode", mode: "parrot" });
    state = reduceEqualizerGame(state, { type: "start" });
    state = finishCountdown(state);
    state = reduceEqualizerGame(state, { type: "pause" });
    expect(reduceEqualizerGame(state, { type: "fire-event" })).toEqual(state);
    expect(reduceEqualizerGame(state, { type: "advance" })).toEqual(state);
    state = reduceEqualizerGame(state, { type: "resume" });
    expect(state.phase).toBe("round-1");
    expect(state.eventIndex).toBe(0);
    expect(reduceEqualizerGame(state, { type: "fire-event" }).eventStatus).toBe("reacting");
    expect(reduceEqualizerGame(state, { type: "restart" })).toEqual(INITIAL_EQUALIZER_STATE);
    const boom = { ...state, phase: "boom" as const };
    const pausedBoom = reduceEqualizerGame(boom, { type: "pause" });
    expect(reduceEqualizerGame(pausedBoom, { type: "boom-finished" })).toEqual(pausedBoom);
    expect(reduceEqualizerGame(pausedBoom, { type: "resume" }).phase).toBe("boom");
  });

  it("shows the target pose only after delayed help in Round 2, never for a distractor", () => {
    const start = { ...INITIAL_EQUALIZER_STATE, phase: "round-2" as const, mode: "parrot" as const, humanPose: "mid" as const };
    const reacting = reduceEqualizerGame(start, { type: "fire-event" });
    expect(reacting.humanPose).toBe("mid");
    expect(reacting.helpShown).toBe(false);
    const helped = reduceEqualizerGame(reacting, { type: "show-help" });
    expect(helped.humanPose).toBe("low");
    expect(helped.helpShown).toBe(true);
    const distractor = reduceEqualizerGame({ ...start, eventIndex: 1 }, { type: "fire-event" });
    expect(reduceEqualizerGame(distractor, { type: "show-help" })).toEqual(distractor);
  });

  it("pauses and resumes the same BOOM recording element at its current position", async () => {
    const recordings: Array<{ currentTime: number; duration: number; src: string; pause: ReturnType<typeof vi.fn>; play: ReturnType<typeof vi.fn> }> = [];
    class FakeAudio {
      currentTime = 0;
      duration = 16;
      volume = 1;
      src: string;
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      pause = vi.fn();
      play = vi.fn(async () => {});
      constructor(src: string) { this.src = src; recordings.push(this); }
    }
    vi.stubGlobal("Audio", FakeAudio);
    const audio = new HumanEqualizerAudio("recording.mp3");
    await audio.playRecording(vi.fn(), vi.fn());
    recordings[0].currentTime = 4.2;
    audio.pausePlayback();
    expect(recordings[0].pause).toHaveBeenCalledOnce();
    await audio.resumePlayback();
    expect(recordings).toHaveLength(1);
    expect(recordings[0].currentTime).toBe(4.2);
    expect(recordings[0].play).toHaveBeenCalledTimes(2);
    expect(audio.seekRecording(9.5)).toEqual({ currentTime: 9.5, duration: 16 });
    expect(audio.seekRecording(99)).toEqual({ currentTime: 16, duration: 16 });
    const pausedBoom = reduceEqualizerGame({ ...INITIAL_EQUALIZER_STATE, phase: "boom", isPaused: true }, { type: "skip-boom" });
    expect(pausedBoom.phase).toBe("clue-reveal");
    expect(pausedBoom.isPaused).toBe(false);
    audio.stopPlayback();
    expect(recordings[0].src).toBe("");
    audio.dispose();
  });

  it("gives MID a distinct, non-clipping timbre without changing its fundamental", () => {
    expect(TARGET_FREQUENCIES_HZ).toEqual({ low: 150, mid: 500, high: 1200 });
    expect(TARGET_TONE_WAVEFORM).toEqual({ low: "sawtooth", mid: "triangle", high: "sine" });
    expect(TARGET_TONE_GAIN.mid).toBeLessThan(1);
  });

  it("chooses from all real distractors without repeating the previous one", () => {
    for (const previous of DISTRACTOR_IDS) {
      expect(pickTrainingDistractor(previous, () => 0)).not.toBe(previous);
      expect(pickTrainingDistractor(previous, () => 0.999)).not.toBe(previous);
    }
    expect(DISTRACTOR_IDS).toContain(pickTrainingDistractor(null, () => 0.5));
  });

  it("gives every wrong-zone Host snap its own tone without advancing the event", () => {
    const event = EQUALIZER_ROUNDS["round-1"][0]; // scheduled HIGH
    expect(getHostFaderResponse(event, "low")).toEqual({ type: "preview-target", target: "low" });
    expect(getHostFaderResponse(event, "mid")).toEqual({ type: "preview-target", target: "mid" });
    expect(getHostFaderResponse(event, "high")).toEqual({ type: "fire-event" });
    const broken = EQUALIZER_ROUNDS["round-3"].find((item) => item.emittedSignal.type === "distractor" && item.emittedSignal.soundId === "cow");
    expect(broken && getHostFaderResponse(broken, "high")).toEqual({ type: "fire-event" });
  });

  it("starts a target synchronously, even while AudioContext is resuming, and stops the previous sound", () => {
    const oscillators: Array<{ type: OscillatorType; frequency: { setValueAtTime: ReturnType<typeof vi.fn> }; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; onended: (() => void) | null; connect: ReturnType<typeof vi.fn> }> = [];
    const gains: Array<{ gain: { setValueAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn>; cancelScheduledValues: ReturnType<typeof vi.fn> }; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }> = [];
    const resume = vi.fn(() => new Promise<void>(() => {}));
    class FakeAudioContext {
      state = "suspended";
      currentTime = 0;
      destination = {};
      resume = resume;
      close = vi.fn(async () => {});
      createOscillator() {
        const oscillator = { type: "sine" as OscillatorType, frequency: { setValueAtTime: vi.fn() }, start: vi.fn(), stop: vi.fn(), disconnect: vi.fn(), onended: null as (() => void) | null, connect: vi.fn() };
        oscillators.push(oscillator);
        return oscillator;
      }
      createGain() {
        const gain = { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() };
        gains.push(gain);
        return gain;
      }
    }
    vi.stubGlobal("AudioContext", FakeAudioContext);
    const audio = new HumanEqualizerAudio("recording.mp3");

    audio.playTarget("low");
    expect(oscillators[0].start).toHaveBeenCalledWith(0);
    expect(oscillators[0].type).toBe(TARGET_TONE_WAVEFORM.low);
    expect(oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(TARGET_FREQUENCIES_HZ.low, 0);
    expect(gains[0].gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(TARGET_TONE_GAIN.low, 0.02);
    expect(oscillators[0].stop).toHaveBeenCalledWith(TARGET_TONE_SECONDS + 0.015);

    audio.playTarget("high");
    expect(oscillators[0].stop).toHaveBeenCalledTimes(2);
    expect(oscillators[0].onended).toBeNull();
    expect(oscillators[1].start).toHaveBeenCalledWith(0);
    expect(resume).toHaveBeenCalledTimes(2);
    audio.dispose();
    expect(oscillators[1].stop).toHaveBeenCalledTimes(2);
  });
});
