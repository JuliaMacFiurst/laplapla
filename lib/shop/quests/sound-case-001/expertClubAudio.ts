export type ExpertClubSound = "timer-start" | "timer-end" | "correct" | "failure";

export const EXPERT_CLUB_AUDIO_LEVELS = {
  tick: .085,
  dune: 1,
  victory: 1,
  applauseNoise: .38,
  applauseOutput: .45,
} as const;

export class ExpertClubAudio {
  private context: AudioContext | null = null;
  private active: OscillatorNode[] = [];
  private activeNoise: AudioBufferSourceNode[] = [];
  private tickTimer: number | null = null;
  private duneAudio: HTMLAudioElement | null = null;
  private dunePlaybackChange: ((playing: boolean) => void) | null = null;
  private victoryAudio: HTMLAudioElement | null = null;

  private getContext() {
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;
    const context = this.context && this.context.state !== "closed" ? this.context : new AudioContextCtor();
    this.context = context;
    void context.resume();
    return context;
  }

  private tone(frequency: number, offset: number, duration: number, volume: number, type: OscillatorType = "triangle", slideTo?: number) {
    const context = this.getContext();
    if (!context) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now + offset);
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, now + offset + duration);
    gain.gain.setValueAtTime(.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(volume, now + offset + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, now + offset + duration);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(now + offset); oscillator.stop(now + offset + duration + .02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this.active = this.active.filter(item => item !== oscillator); };
    this.active.push(oscillator);
  }

  play(sound: ExpertClubSound) {
    this.stopSting();
    const notes: readonly [number, number, number, number][] = sound === "timer-start"
      ? [[330, 0, .08, .28], [520, .1, .1, .33], [760, .22, .16, .38]]
      : sound === "timer-end" ? [[660, 0, .1, .3], [440, .12, .1, .36], [220, .25, .28, .42]]
      : sound === "correct" ? [[392, 0, .12, .18], [523, .13, .12, .2], [659, .27, .25, .22]]
      : [[310, 0, .2, .18], [230, .22, .25, .2], [145, .49, .44, .24]];
    for (const [frequency, offset, duration, volume] of notes) {
      this.tone(frequency, offset, duration, volume, sound === "failure" ? "sawtooth" : "triangle");
    }
  }

  private playApplause() {
    const context = this.getContext();
    if (!context) return;
    const duration = .9;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) {
      const time = index / context.sampleRate;
      const pulse = Math.pow(Math.max(0, Math.sin(time * Math.PI * 17)), 16);
      channel[index] = (Math.random() * 2 - 1) * pulse * EXPERT_CLUB_AUDIO_LEVELS.applauseNoise;
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    filter.type = "bandpass"; filter.frequency.value = 1700; filter.Q.value = .55;
    gain.gain.value = EXPERT_CLUB_AUDIO_LEVELS.applauseOutput;
    source.buffer = buffer; source.connect(filter); filter.connect(gain); gain.connect(context.destination);
    source.start();
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); this.activeNoise = this.activeNoise.filter(item => item !== source); };
    this.activeNoise.push(source);
  }

  startTicking() {
    this.stopTicking();
    let high = false;
    const tick = () => { high = !high; this.tone(high ? 920 : 700, 0, .025, EXPERT_CLUB_AUDIO_LEVELS.tick, "sine"); };
    tick();
    this.tickTimer = window.setInterval(tick, 1000);
  }

  stopTicking() {
    if (this.tickTimer !== null) window.clearInterval(this.tickTimer);
    this.tickTimer = null;
  }

  stopSting() {
    for (const oscillator of this.active) { try { oscillator.stop(); } catch { /* already stopped */ } }
    this.active = [];
    for (const source of this.activeNoise) { try { source.stop(); } catch { /* already stopped */ } }
    this.activeNoise = [];
  }

  playDuneClue(url: string, onPlaybackChange?: (playing: boolean) => void) {
    this.stopDuneClue();
    const audio = new Audio(url);
    audio.preload = "auto";
    audio.volume = EXPERT_CLUB_AUDIO_LEVELS.dune;
    audio.currentTime = 0;
    this.dunePlaybackChange = onPlaybackChange || null;
    audio.onplay = () => { if (this.duneAudio === audio) this.dunePlaybackChange?.(true); };
    audio.onended = () => {
      if (this.duneAudio !== audio) return;
      this.duneAudio = null;
      this.dunePlaybackChange?.(false);
      this.dunePlaybackChange = null;
    };
    audio.onerror = () => {
      if (this.duneAudio !== audio) return;
      this.duneAudio = null;
      this.dunePlaybackChange?.(false);
      this.dunePlaybackChange = null;
    };
    this.duneAudio = audio;
    void audio.play().catch(() => {
      if (this.duneAudio !== audio) return;
      this.duneAudio = null;
      this.dunePlaybackChange?.(false);
      this.dunePlaybackChange = null;
    });
  }

  playVictoryFanfare(url: string) {
    this.stopVictoryFanfare();
    this.stopSting();
    const audio = new Audio(url);
    audio.preload = "auto";
    audio.volume = EXPERT_CLUB_AUDIO_LEVELS.victory;
    audio.currentTime = 0;
    audio.onended = () => { if (this.victoryAudio === audio) this.victoryAudio = null; };
    this.victoryAudio = audio;
    this.playApplause();
    void audio.play().catch(() => { if (this.victoryAudio === audio) this.victoryAudio = null; });
  }

  stopDuneClue() {
    if (this.duneAudio) {
      this.duneAudio.pause();
      this.duneAudio.removeAttribute("src");
      this.duneAudio.load();
    }
    this.duneAudio = null;
    this.dunePlaybackChange?.(false);
    this.dunePlaybackChange = null;
  }

  stopVictoryFanfare() {
    if (!this.victoryAudio) return;
    this.victoryAudio.pause();
    this.victoryAudio.removeAttribute("src");
    this.victoryAudio.load();
    this.victoryAudio = null;
  }

  stop() { this.stopTicking(); this.stopSting(); this.stopDuneClue(); this.stopVictoryFanfare(); }
  dispose() { this.stop(); const context = this.context; this.context = null; if (context && context.state !== "closed") void context.close(); }
}
