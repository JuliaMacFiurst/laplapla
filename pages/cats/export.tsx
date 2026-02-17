"use client";

import { useEffect, useState, useRef } from "react";
import StudioPreviewPlayer from "@/components/studio/StudioPreviewPlayer";
import AudioEngine, { type AudioEngineHandle } from "@/components/studio/AudioEngine";
import type { Track } from "@/components/studio/MusicPanel";
import { loadProject } from "@/lib/studioStorage";
import type { StudioSlide } from "@/types/studio";
import { useRouter } from "next/router";
import { recordPreviewDom } from "@/lib/recordPreviewDom";
import { cropAndConvert, preloadFFmpeg } from "@/lib/cropAndConvert";
import { dictionaries, type Lang } from "@/i18n";

export default function StudioExportPage() {
  const [slides, setSlides] = useState<StudioSlide[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<number | null>(null);
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);
  const audioEngineRef = useRef<AudioEngineHandle | null>(null);
  const router = useRouter();

  const lang: Lang = (router.query.lang as Lang) || "ru";
  const t = dictionaries[lang].cats.export;

  const [projectData, setProjectData] = useState<any>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const [isFinished, setIsFinished] = useState(false);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);

  // Pause preview audio while tutorial is open
  useEffect(() => {
    if (!audioEngineRef.current) return;

    if (isTutorialOpen) {
      try {
        audioEngineRef.current.pauseAll?.();
      } catch {}
    }
  }, [isTutorialOpen]);

  useEffect(() => {
    async function init() {
      const project = await loadProject("current-studio-project");
      if (!project) return;

      setProjectData(project);

      if (project.slides) {
        setSlides(project.slides);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!projectData?.musicTracks?.length) return;
    if (!audioEngineRef.current) return;

    projectData.musicTracks.forEach((track: Track) => {
      audioEngineRef.current?.addTrack?.(track);
      audioEngineRef.current?.setVolume?.(track.id, track.volume);
    });

    // attempt autoplay
    audioEngineRef.current.playAll?.();
  }, [projectData]);

  useEffect(() => {
    document.body.classList.add("export-mode");

    return () => {
      document.body.classList.remove("export-mode");
    };
  }, []);

  useEffect(() => {
    preloadFFmpeg().catch(() => {});
  }, []);

  useEffect(() => {
    // Try to start music on mount (may be blocked by Chrome autoplay policy)
    const timer = setTimeout(() => {
      if (audioEngineRef.current?.playAll) {
        try {
          audioEngineRef.current.playAll();
        } catch {}
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    function updateScale() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scale = Math.min(vw / 1080, vh / 1920);
      document.documentElement.style.setProperty(
        "--export-scale",
        String(scale)
      );
    }

    updateScale();
    window.addEventListener("resize", updateScale);

    return () => {
      window.removeEventListener("resize", updateScale);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        router.push("/cats/studio");
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [router]);

  async function startRecording() {
    if (isRecording) return;
    // Close tutorial if open
    if (isTutorialOpen) {
      setIsTutorialOpen(false);
    }

    setIsRecording(true);
    document.body.classList.add("recording-mode");

    const totalDuration =
      slides.reduce((acc, s) => {
        const d = s.voiceDuration && s.voiceDuration > 0 ? s.voiceDuration : 3;
        return acc + d;
      }, 0) * 1000;

    try {
      // Ensure audio context resumes after user gesture
      if (audioEngineRef.current?.playAll) {
        try {
          audioEngineRef.current.playAll();
        } catch {}
      }

      const rawBlob = await recordPreviewDom(totalDuration, async () => {
        // Now stream is selected. Reset preview deterministically.
        setResetSignal((p) => p + 1);

        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
          });
        });
      });

      setProcessingProgress(0);
      setProcessingStartTime(Date.now());
      document.body.classList.add("processing-mode");

      const finalBlob = await cropAndConvert(rawBlob, (p) => {
        setProcessingProgress(p);
      });

      const url = URL.createObjectURL(finalBlob);
      setFinalVideoUrl(url);
      setIsFinished(true);
      setProcessingProgress(null);
    } finally {
      document.body.classList.remove("recording-mode");
      document.body.classList.remove("processing-mode");
      setProcessingStartTime(null);
      setIsRecording(false);
    }
  }

  function ShareModal({ videoUrl }: { videoUrl: string }) {
    return (
      <div className="export-share-modal">
        <div className="export-confetti-layer">
          {Array.from({ length: 30 }).map((_, i) => (
            <span key={i} className="export-confetti-piece" />
          ))}
        </div>

        <div className="export-share-card">
          <div className="export-share-title">{t.videoReady}</div>

          <button
            className="studio-button button-blue"
            onClick={() => {
              const a = document.createElement("a");
              a.href = videoUrl;
              a.download = "studio-video.mp4";
              a.click();
            }}
          >
            {t.download}
          </button>

          <button
            className="studio-button button-pitch"
            onClick={() => {
              navigator.clipboard.writeText(t.shareDescription);
            }}
          >
            {t.copyDescription}
          </button>

          {navigator.share && (
            <button
              className="studio-button btn-mint"
              onClick={async () => {
                try {
                  await navigator.share({
                    title: "Моё видео",
                    text: t.shareDescription,
                    url: videoUrl,
                  });
                } catch {}
              }}
            >
              {t.share}
            </button>
          )}

          <div className="export-share-links">
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(videoUrl)}`}
              target="_blank"
            >Telegram</a>
            <a
              href="https://www.youtube.com/upload"
              target="_blank"
            >YouTube</a>
            <a
              href="https://www.instagram.com/"
              target="_blank"
            >Instagram</a>
          </div>

          <button
            className="studio-button btn-mint"
            onClick={() => router.push("/cats/studio")}
          >
            {t.createAnother}
          </button>
        </div>
      </div>
    );
  }

  if (!slides.length) return null;

  return (
    <div className="export-root">
      {!isFinished ? (
        <button
          className="export-record-button"
          onClick={startRecording}
          disabled={isRecording || isTutorialOpen}
        >
          {isRecording
            ? t.recording
            : isTutorialOpen
            ? t.closeTutorial
            : t.record}
        </button>
      ) : finalVideoUrl ? (
        <ShareModal videoUrl={finalVideoUrl} />
      ) : null}
      <button
        className="export-help-button"
        onClick={() => setIsTutorialOpen(true)}
      >
        {t.howToSave}
      </button>
      <button
        className="export-back-button"
        onClick={() => router.push("/cats/studio")}
        aria-label="Back to editor"
      >
        ←
      </button>
      {processingProgress !== null && (
        <div className="export-processing-overlay">
          <div className="export-processing-card">
            <div className="export-processing-title">
              {t.processing}
            </div>

            <div className="export-progress-bar">
              <div
                className="export-progress-fill"
                style={{ width: `${Math.min(processingProgress * 100, 100)}%` }}
              />
            </div>

            <div className="export-processing-meta">
              {processingProgress > 0 && processingStartTime
                ? (() => {
                    const elapsed = (Date.now() - processingStartTime) / 1000;
                    const estimatedTotal = elapsed / processingProgress;
                    const remaining = Math.max(0, estimatedTotal - elapsed);
                    return `${t.remaining} ~${Math.ceil(remaining)} ${t.seconds}`;
                  })()
                : t.preparing}
            </div>
          </div>
        </div>
      )}
      {isRecording && (
        <div className="export-recording-indicator">
          <div className="export-recording-dot" />
          <div className="export-recording-text">
            {t.recordingHint}
          </div>
          <div className="export-recording-bar">
            <div className="export-recording-bar-fill" />
          </div>
        </div>
      )}
      {isTutorialOpen && (
        <div className="export-tutorial-overlay" onClick={() => setIsTutorialOpen(false)}>
          <div
            className="export-tutorial-popup"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="export-tutorial-header">
              {t.tutorialTitle}
              <button
                className="export-tutorial-close"
                onClick={() => setIsTutorialOpen(false)}
              >
                ×
              </button>
            </div>

            <video
              src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/characters/other/saving-tutorial.webm"
              controls
              autoPlay
              playsInline
              className="export-tutorial-video"
            />

            <div className="export-tutorial-text">
              {t.tutorialText}
            </div>
          </div>
        </div>
      )}
      <div className="export-stage-wrapper">
        <div className="export-canvas">
          <AudioEngine ref={audioEngineRef} maxTracks={4} />
          <StudioPreviewPlayer
            slides={slides}
            musicEngineRef={audioEngineRef}
            lang={lang}
            onClose={() => {}}
            isExternalRecording={isRecording}
            resetSignal={resetSignal}
          />
        </div>
      </div>
    </div>
  );
}
