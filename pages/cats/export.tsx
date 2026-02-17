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

export default function StudioExportPage() {
  const [slides, setSlides] = useState<StudioSlide[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<number | null>(null);
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);
  const audioEngineRef = useRef<AudioEngineHandle | null>(null);
  const router = useRouter();

  const [projectData, setProjectData] = useState<any>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

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
      const a = document.createElement("a");
      a.href = url;
      a.download = "studio-video.mp4";
      a.click();

      setProcessingProgress(null);
    } finally {
      document.body.classList.remove("recording-mode");
      document.body.classList.remove("processing-mode");
      setProcessingStartTime(null);
      setIsRecording(false);
    }
  }

  if (!slides.length) return null;

  return (
    <div className="export-root">
      <button
        className="export-record-button"
        onClick={startRecording}
        disabled={isRecording || isTutorialOpen}
      >
        {isRecording
          ? "Recording..."
          : isTutorialOpen
          ? "Закройте подсказку"
          : "Record"}
      </button>
      <button
        className="export-help-button"
        onClick={() => setIsTutorialOpen(true)}
      >
        Как сохранить моё видео?
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
              Сохраняем видео…
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
                    return `Осталось ~${Math.ceil(remaining)} сек`;
                  })()
                : "Подготовка…"}
            </div>
          </div>
        </div>
      )}
      {isRecording && (
        <div className="export-recording-indicator">
          <div className="export-recording-dot" />
          <div className="export-recording-text">
            Идёт запись… Не двигайте мышку
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
              Как сохранить видео
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
              Выберите окно «/export» при записи экрана и включите запись звука вкладки.
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
            lang="ru"
            onClose={() => {}}
            isExternalRecording={isRecording}
            resetSignal={resetSignal}
          />
        </div>
      </div>
    </div>
  );
}
