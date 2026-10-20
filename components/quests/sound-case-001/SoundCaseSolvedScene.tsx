/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { Lang } from "@/i18n";
import { dictionaries } from "@/i18n";
import { SOUND_CASE_SAND_PARTICLES } from "@/lib/quests/soundCaseParticles";

type FinalePhase = "ready" | "reveal" | "discovery" | "victory" | "investigator" | "reward";

const NORMAL_SEQUENCE: readonly [FinalePhase, number][] = [
  ["discovery", 3100],
  ["victory", 6700],
  ["investigator", 9500],
  ["reward", 12800],
];

const REDUCED_MOTION_SEQUENCE: readonly [FinalePhase, number][] = [
  ["discovery", 850],
  ["victory", 1800],
  ["investigator", 2750],
  ["reward", 3800],
];

function SolvedStamp({ lang, label }: { lang: Lang; label: string }) {
  const filterId = `sound-case-stamp-rough-${lang}`;
  return <svg className="sound-case-ceremony__stamp" viewBox="0 0 220 220" role="img" aria-label={label}>
    <defs>
      <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="2" seed="17" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2"/>
      </filter>
    </defs>
    <g filter={`url(#${filterId})`}>
      <circle cx="110" cy="110" r="92"/>
      <circle cx="110" cy="110" r="80" strokeDasharray="3 5"/>
      <path d="M42 74c32-25 104-25 136 0M42 148c32 25 104 25 136 0"/>
      <text x="110" y="49" className="sound-case-ceremony__stamp-ring" textAnchor="middle">SOUND CASE #001</text>
      <text x="110" y="124" className="sound-case-ceremony__stamp-word" textAnchor="middle">{label}</text>
      <text x="110" y="178" className="sound-case-ceremony__stamp-ring" textAnchor="middle">LAPLAPLA INVESTIGATION</text>
      <path d="m110 68 5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2 5-10Z"/>
    </g>
  </svg>;
}

function InvestigatorInsignia() {
  return <svg className="sound-case-ceremony__insignia" viewBox="0 0 120 120" aria-hidden="true">
    <circle cx="60" cy="60" r="52"/><circle cx="60" cy="60" r="42" strokeDasharray="2 5"/>
    <path d="M60 25 70 48l25 2-19 16 6 25-22-13-22 13 6-25-19-16 25-2 10-23Z"/>
    <path d="M60 38v40M40 58h40"/>
  </svg>;
}

export function SoundCaseSolvedScene({
  lang,
  victoryImageUrl,
  collectibleCardsImageUrl,
  soundtrackUrl,
}: {
  lang: Lang;
  victoryImageUrl: string;
  collectibleCardsImageUrl: string;
  soundtrackUrl: string;
}) {
  const text = dictionaries[lang].shop.soundCase.finale.solved;
  const audioRef = useRef<HTMLAudioElement>(null);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const [phase, setPhase] = useState<FinalePhase>("ready");
  const [muted, setMuted] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => () => {
    clearTimers();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [clearTimers]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  const beginSequence = useCallback(() => {
    clearTimers();
    setPhase("reveal");
    setAudioFailed(false);
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      audio.volume = 0.42;
      audio.muted = muted;
      const playback = audio.play();
      if (playback) void playback.catch(() => {
        setAudioFailed(true);
        setAudioPlaying(false);
      });
    }
    const sequence = reducedMotion ? REDUCED_MOTION_SEQUENCE : NORMAL_SEQUENCE;
    timersRef.current = sequence.map(([nextPhase, delay]) => setTimeout(() => setPhase(nextPhase), delay));
  }, [clearTimers, muted, reducedMotion]);

  const showFinale = () => {
    clearTimers();
    setPhase("reward");
  };

  const toggleSound = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (!nextMuted && audioRef.current?.paused) {
      const playback = audioRef.current.play();
      if (playback) void playback.catch(() => setAudioFailed(true));
    }
  };

  const started = phase !== "ready";

  return (
    <main
      className={`sound-case-finale sound-case-finale--solved sound-case-ceremony${started ? " is-started" : ""}`}
      data-sound-case-page="solved"
      data-finale-phase={phase}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      lang={lang}
      dir={lang === "he" ? "rtl" : "ltr"}
      style={{ "--sound-case-victory-image": `url("${victoryImageUrl}")` } as CSSProperties}
    >
      <link rel="preload" as="image" href={collectibleCardsImageUrl}/>
      <audio
        ref={audioRef}
        src={soundtrackUrl}
        preload="metadata"
        data-finale-soundtrack="Desert-Quest-Completed"
        onPlay={() => setAudioPlaying(true)}
        onPause={() => setAudioPlaying(false)}
        onEnded={() => setAudioPlaying(false)}
      />
      <div className="sound-case-ceremony__stage">
        <img className="sound-case-ceremony__victory-image" src={victoryImageUrl} alt="" aria-hidden="true"/>
        <div className="sound-case-ceremony__light" aria-hidden="true"/>
        {started ? <div className="sound-case-ceremony__sand" aria-hidden="true">
          {SOUND_CASE_SAND_PARTICLES.map(([x, y, delay], index) => <i key={index} style={{ "--sand-x": `${x}%`, "--sand-y": `${y}%`, "--sand-delay": `${delay}s` } as CSSProperties}/>) }
        </div> : null}

        <header className="sound-case-ceremony__mast">
          <span>PARROT SOUND LAB</span><bdi dir="ltr">SOUND CASE #001</bdi>
        </header>

        <div className="sound-case-ceremony__scrim" aria-hidden="true"/>
        <div className="sound-case-ceremony__content" aria-live="polite">
          {phase === "ready" ? <section className="sound-case-ceremony__ready" aria-labelledby="sound-case-finale-ready-title">
            <p><bdi dir="ltr">SOUND CASE #001</bdi></p>
            <h1 id="sound-case-finale-ready-title">{text.readyTitle}</h1>
            <button type="button" className="sound-case-ceremony__start" onClick={beginSequence}>
              <span>{text.startAction}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9v6h4l5 4V5l-5 4H6Zm12-1c1 1 1.5 2.3 1.5 4S19 15 18 16"/></svg>
            </button>
          </section> : null}

          {phase === "reveal" ? <section className="sound-case-ceremony__reveal" aria-label={text.revealName}>
            <p className="sound-case-ceremony__reveal-first">{text.revealFirst}</p>
            <h1>{text.revealName}</h1>
            <p className="sound-case-ceremony__reveal-body">{text.revealBody}</p>
          </section> : null}

          {phase === "discovery" ? <section className="sound-case-ceremony__discovery" aria-label={text.achievements.join(" ")}>
            {text.achievements.map((achievement, index) => <p key={achievement} style={{ "--achievement-index": index } as CSSProperties}><span aria-hidden="true">✓</span>{achievement}</p>)}
          </section> : null}

          {phase === "victory" ? <section className="sound-case-ceremony__victory" aria-label={`${text.victoryLead} SOUND CASE #001 ${text.victoryClose}`}>
            <p>{text.congratulations}</p>
            <h1><span>{text.victoryLead}</span><bdi dir="ltr">SOUND CASE #001</bdi><strong>{text.victoryClose}</strong></h1>
            <SolvedStamp lang={lang} label={text.solvedStamp}/>
          </section> : null}

          {phase === "investigator" ? <section className="sound-case-ceremony__investigator">
            <InvestigatorInsignia/>
            <p>{text.investigatorKicker}</p>
            <h1><span>{text.investigatorOfficial}</span><strong>{text.investigatorRole}</strong><bdi dir="ltr">LAPLAPLA.</bdi></h1>
          </section> : null}

          {phase === "reward" ? <section className="sound-case-ceremony__reward">
            <div className="sound-case-ceremony__final-record" aria-label={`${text.revealName} ${text.solvedStamp} ${text.investigatorOfficial} ${text.investigatorRole}`}>
              <span>{text.revealName}</span><bdi dir="ltr">SOUND CASE #001</bdi><strong>{text.solvedStamp}</strong>
            </div>
            <p className="sound-case-ceremony__reward-question">{text.rewardQuestion}</p>
            <p className="sound-case-ceremony__reward-answer">{text.rewardAnswer}</p>
            <h1><span>{text.rewardHost}</span>{text.rewardCommand}</h1>
            <img className="sound-case-ceremony__card-reward" src={collectibleCardsImageUrl} alt="" aria-hidden="true"/>
            <p className="sound-case-ceremony__card-promise">{text.cardPromise}</p>
            <div className="sound-case-ceremony__flip">
              <strong>{text.flipCard}</strong>
              <span>{text.cardHintBeforeQr}<bdi dir="ltr">{text.cardHintQr}</bdi>{text.cardHintAfterQr}</span>
            </div>
          </section> : null}
        </div>

        {started ? <div className="sound-case-ceremony__controls">
          <button type="button" onClick={toggleSound} aria-pressed={muted} aria-label={muted ? text.unmuteAction : text.muteAction}>
            {muted || !audioPlaying ? "♪" : "♫"}<span>{muted ? text.unmuteAction : text.muteAction}</span>
          </button>
          {phase !== "reward" ? <button type="button" onClick={showFinale}>{text.skipAction}</button> : <button type="button" onClick={beginSequence}>{text.replayAction}</button>}
        </div> : null}
        {audioFailed ? <p className="sound-case-ceremony__audio-note" role="status">{text.audioUnavailable}</p> : null}
      </div>
    </main>
  );
}
