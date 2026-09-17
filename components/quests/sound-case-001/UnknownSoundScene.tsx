import {
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import type { Lang } from "@/i18n";
import { dictionaries } from "@/i18n";
import type { QuestPersonalization } from "@/lib/shop/questPersonalization";
import {
  INITIAL_UNKNOWN_SOUND_SCENE_STATE,
  UNKNOWN_SOUND_GUESSES,
  getUnknownSoundProgress,
  reduceUnknownSoundScene,
} from "@/lib/shop/quests/sound-case-001/unknownSoundScene";
import {
  loadUnknownSoundProgress,
  saveUnknownSoundProgress,
} from "@/lib/shop/quests/sound-case-001/unknownSoundProgressStorage";

type AudioStatus =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "ended"
  | "error";

type UnknownSoundSceneProps = {
  lang: Lang;
  audioUrl: string;
  parrotUrl: string;
  personalization?: QuestPersonalization;
};

function SignalWave({ playing }: { playing: boolean }) {
  return (
    <span
      className={`unknown-sound-scene__signal${playing ? " unknown-sound-scene__signal--playing" : ""}`}
      aria-hidden="true"
    >
      {Array.from({ length: 19 }, (_, index) => (
        <i key={index} />
      ))}
    </span>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  return `${minutes}:${String(wholeSeconds % 60).padStart(2, "0")}`;
}

export function UnknownSoundScene({
  lang,
  audioUrl,
  parrotUrl,
  personalization,
}: UnknownSoundSceneProps) {
  const text = dictionaries[lang].shop.soundCase.unknownSoundScene;
  const [scene, dispatch] = useReducer(
    reduceUnknownSoundScene,
    INITIAL_UNKNOWN_SOUND_SCENE_STATE,
  );
  const [storageReady, setStorageReady] = useState(false);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>("idle");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const restored = loadUnknownSoundProgress(window.localStorage);
    if (restored) {
      dispatch({ type: "progress-restored", progress: restored });
    }
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    const progress = getUnknownSoundProgress(scene);
    if (progress) {
      saveUnknownSoundProgress(window.localStorage, progress);
    }
  }, [scene, storageReady]);

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const leadName = personalization?.leadName.trim() || "";

  const handleAudioAction = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audioStatus === "playing") {
      audio.pause();
      return;
    }

    if (audio.ended || (duration > 0 && currentTime >= duration)) {
      audio.currentTime = 0;
      setCurrentTime(0);
    }

    setAudioStatus("loading");
    try {
      await audio.play();
    } catch {
      setAudioStatus("error");
    }
  };

  const handleRetry = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    setAudioStatus("loading");
    setCurrentTime(0);
    audio.load();
    try {
      await audio.play();
    } catch {
      setAudioStatus("error");
    }
  };

  const playerLabel =
    audioStatus === "loading"
      ? text.loadingAction
      : audioStatus === "playing"
        ? text.pauseAction
        : audioStatus === "paused"
          ? text.resumeAction
          : audioStatus === "ended"
          ? text.replayAction
          : text.playAction;

  return (
    <main
      className="unknown-sound-scene"
      data-scene-phase={scene.phase}
      dir={lang === "he" ? "rtl" : "ltr"}
      lang={lang}
    >
      <div className="unknown-sound-scene__ambient" aria-hidden="true" />

      <section className="unknown-sound-scene__panel">
        <header className="unknown-sound-scene__identity">
          <bdi dir="ltr">PARROT SOUND LAB</bdi>
          <span>{text.stageLabel}</span>
        </header>

        <div className="unknown-sound-scene__title-block">
          <span className="unknown-sound-scene__recording-dot" aria-hidden="true" />
          <h1>
            <span>{text.title}</span>
            <span>
              {text.numberPrefix}
              <bdi dir="ltr">001</bdi>
            </span>
          </h1>
          <SignalWave playing={audioStatus === "playing"} />
        </div>

        {scene.phase === "ready" ? (
          <section className="unknown-sound-scene__speech unknown-sound-scene__arrival">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={parrotUrl} alt="" />
            <div>
              <h2>{text.parrotLabel}</h2>
              {text.arrivalLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </section>
        ) : null}

        <section className="unknown-sound-scene__player" aria-label={text.progressLabel}>
          <audio
            ref={audioRef}
            src={audioUrl}
            preload="metadata"
            onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
            onDurationChange={(event) => setDuration(event.currentTarget.duration)}
            onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
            onPlay={() => {
              dispatch({ type: "audio-started" });
              setAudioStatus("playing");
            }}
            onPlaying={() => setAudioStatus("playing")}
            onWaiting={() => setAudioStatus("loading")}
            onPause={(event) => {
              if (!event.currentTarget.ended) setAudioStatus("paused");
            }}
            onEnded={(event) => {
              setCurrentTime(event.currentTarget.duration);
              setAudioStatus("ended");
            }}
            onError={() => setAudioStatus("error")}
          />

          <button
            className="unknown-sound-scene__audio-button"
            data-playing={audioStatus === "playing" ? "true" : "false"}
            type="button"
            onClick={() => void handleAudioAction()}
            disabled={audioStatus === "loading"}
          >
            <span className="unknown-sound-scene__play-icon" aria-hidden="true" />
            {playerLabel}
          </button>

          <div className="unknown-sound-scene__progress-row" dir="ltr">
            <span>{formatTime(currentTime)}</span>
            <div
              className="unknown-sound-scene__progress"
              role="progressbar"
              aria-label={text.progressLabel}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
            >
              <i style={{ width: `${progress}%` }} />
            </div>
            <span>{formatTime(duration)}</span>
          </div>

          {audioStatus === "error" ? (
            <div className="unknown-sound-scene__audio-error" role="alert">
              <p>{text.audioError}</p>
              <button type="button" onClick={() => void handleRetry()}>
                {text.retryAction}
              </button>
            </div>
          ) : null}
        </section>

        {scene.phase === "guessing" ? (
          <section className="unknown-sound-scene__step unknown-sound-scene__guess">
            <h2>{text.guessQuestion}</h2>
            <p>{text.guessInstruction}</p>
            <div className="unknown-sound-scene__choices">
              {UNKNOWN_SOUND_GUESSES.map((guess) => (
                <button
                  type="button"
                  key={guess}
                  aria-pressed={scene.selectedGuess === guess}
                  onClick={() => dispatch({ type: "guess-selected", guess })}
                >
                  {text.guessOptions[guess]}
                </button>
              ))}
            </div>
            <button
              className="unknown-sound-scene__primary"
              type="button"
              disabled={!scene.selectedGuess}
              onClick={() => dispatch({ type: "guess-confirmed" })}
            >
              {text.confirmGuess}
            </button>
          </section>
        ) : null}

        {scene.phase === "guess-recorded" ? (
          <section className="unknown-sound-scene__step unknown-sound-scene__recorded">
            <span className="unknown-sound-scene__status-mark" aria-hidden="true">✓</span>
            <h2>{text.guessRecordedTitle}</h2>
            <p>{text.guessRecordedBody}</p>
            <button
              className="unknown-sound-scene__primary"
              type="button"
              onClick={() => dispatch({ type: "clue-obtained" })}
            >
              {text.clueAction}
            </button>
          </section>
        ) : null}

        {scene.phase === "clue-obtained" ? (
          <div className="unknown-sound-scene__reveal">
            <section className="unknown-sound-scene__step unknown-sound-scene__clue">
              <span className="unknown-sound-scene__evidence-label">
                {text.evidenceLabel}
              </span>
              <h2>{text.clueTitle}</h2>
              {text.clueLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </section>

            <section className="unknown-sound-scene__speech unknown-sound-scene__after-clue">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={parrotUrl} alt="" />
              <div>
                <h2>{text.parrotLabel}</h2>
                {text.parrotAfterClueLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
                <p className="unknown-sound-scene__lead-line">
                  {leadName ? (
                    <>
                      <bdi>{leadName}</bdi>
                      {text.leadNameSuffix}
                    </>
                  ) : (
                    text.leadFallback
                  )}{" "}
                  {text.investigateFurther}
                </p>
              </div>
            </section>

            <section className="unknown-sound-scene__final" aria-live="polite">
              <h2>{text.finalTitle}</h2>
              <p>{text.finalBody}</p>
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}
