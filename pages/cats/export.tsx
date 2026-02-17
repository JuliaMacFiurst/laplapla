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
  const audioEngineRef = useRef<AudioEngineHandle | null>(null);
  const router = useRouter();

  const [projectData, setProjectData] = useState<any>(null);

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

      const rawBlob = await recordPreviewDom(totalDuration);

      setProcessingProgress(0);

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
      setIsRecording(false);
    }
  }

  if (!slides.length) return null;

  return (
    <div className="export-root">
      <button
        className="export-record-button"
        onClick={startRecording}
        disabled={isRecording}
      >
        {isRecording ? "Recording..." : "Record"}
      </button>
      <button
        className="export-back-button"
        onClick={() => router.push("/cats/studio")}
        aria-label="Back to editor"
      >
        ←
      </button>
      {processingProgress !== null && (
        <div className="export-processing-indicator">
          Processing: {Math.round(processingProgress * 100)}%
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
          />
        </div>
      </div>
    </div>
  );
}
