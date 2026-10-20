import type { EqualizerPosition } from "./humanEqualizerGame";

export const TARGET_FREQUENCIES_HZ: Record<EqualizerPosition, number> = {
  low: 150,
  mid: 500,
  high: 1200,
};

export const TARGET_TONE_SECONDS = 0.62;
export const TARGET_TONE_GAIN: Record<EqualizerPosition, number> = {
  low: 0.23,
  mid: 0.29,
  high: 0.25,
};
export const TARGET_TONE_WAVEFORM: Record<EqualizerPosition, OscillatorType> = {
  low: "sawtooth", // Its upper harmonics keep 150 Hz audible on small speakers.
  mid: "triangle",
  high: "sine",
};
export type EqualizerRecordingProgress = { currentTime: number; duration: number };
const TARGET_TONE_FADE_IN_SECONDS = 0.02;
const TARGET_TONE_FADE_OUT_SECONDS = 0.09;

export class HumanEqualizerAudio {
  private context: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private recording: HTMLAudioElement | null = null;
  private distractor: HTMLAudioElement | null = null;

  constructor(private readonly recordingUrl: string) {}

  unlock() {
    if (!this.context || this.context.state === "closed") this.context = new AudioContext();
    if (this.context.state !== "running") {
      // Start resume during the user gesture; nodes can be scheduled immediately.
      void this.context.resume().catch(() => { /* A later gesture can retry. */ });
    }
    return this.context;
  }

  playTarget(target: EqualizerPosition) {
    this.stopPlayback();
    const context = this.unlock();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = TARGET_TONE_WAVEFORM[target];
    oscillator.frequency.setValueAtTime(TARGET_FREQUENCIES_HZ[target], now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(TARGET_TONE_GAIN[target], now + TARGET_TONE_FADE_IN_SECONDS);
    gain.gain.setValueAtTime(TARGET_TONE_GAIN[target], now + TARGET_TONE_SECONDS - TARGET_TONE_FADE_OUT_SECONDS);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + TARGET_TONE_SECONDS);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      if (this.oscillator === oscillator) {
        this.oscillator = null;
        this.gain = null;
      }
    };
    oscillator.start(now);
    oscillator.stop(now + TARGET_TONE_SECONDS + 0.015);
    this.oscillator = oscillator;
    this.gain = gain;
  }

  playRecording(onEnded: () => void, onError: () => void, onProgress?: (progress: EqualizerRecordingProgress) => void) {
    this.stopPlayback();
    const recording = new Audio(this.recordingUrl);
    recording.volume = 0.72;
    recording.onended = onEnded;
    recording.onerror = onError;
    recording.ontimeupdate = () => onProgress?.(this.getRecordingProgress());
    recording.onloadedmetadata = () => onProgress?.(this.getRecordingProgress());
    recording.ondurationchange = () => onProgress?.(this.getRecordingProgress());
    this.recording = recording;
    return recording.play();
  }

  getRecordingProgress(): EqualizerRecordingProgress {
    const duration = this.recording?.duration ?? 0;
    return {
      currentTime: this.recording?.currentTime ?? 0,
      duration: Number.isFinite(duration) ? duration : 0,
    };
  }

  seekRecording(seconds: number): EqualizerRecordingProgress {
    const duration = this.getRecordingProgress().duration;
    if (this.recording && duration > 0) this.recording.currentTime = Math.max(0, Math.min(duration, seconds));
    return this.getRecordingProgress();
  }

  playDistractor(url: string) {
    this.stopPlayback();
    const distractor = new Audio(url);
    distractor.volume = 0.66;
    this.distractor = distractor;
    return distractor.play();
  }

  pausePlayback() {
    this.recording?.pause();
    this.distractor?.pause();
    if (this.context?.state === "running") void this.context.suspend().catch(() => {});
  }

  resumePlayback() {
    if (this.context && this.context.state !== "running" && this.context.state !== "closed") {
      void this.context.resume().catch(() => {});
    }
    if (this.recording) return this.recording.play();
    if (this.distractor) return this.distractor.play();
    return Promise.resolve();
  }

  stopPlayback() {
    if (this.oscillator && this.context) {
      this.oscillator.onended = null;
      this.gain?.gain.cancelScheduledValues(this.context.currentTime);
      this.gain?.gain.setValueAtTime(0, this.context.currentTime);
      try { this.oscillator.stop(); } catch { /* already stopped */ }
      this.oscillator.disconnect();
      this.gain?.disconnect();
      this.oscillator = null;
      this.gain = null;
    }
    if (this.recording) {
      this.recording.pause();
      this.recording.onended = null;
      this.recording.onerror = null;
      this.recording.ontimeupdate = null;
      this.recording.onloadedmetadata = null;
      this.recording.ondurationchange = null;
      this.recording.currentTime = 0;
      this.recording.src = "";
      this.recording = null;
    }
    if (this.distractor) {
      this.distractor.pause();
      this.distractor.currentTime = 0;
      this.distractor.src = "";
      this.distractor = null;
    }
  }

  dispose() {
    this.stopPlayback();
    const context = this.context;
    this.context = null;
    if (context && context.state !== "closed") void context.close();
  }
}
