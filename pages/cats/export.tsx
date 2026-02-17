"use client";

import { useEffect, useState } from "react";
import StudioPreviewPlayer from "@/components/studio/StudioPreviewPlayer";
import { loadProject } from "@/lib/studioStorage";
import type { StudioSlide } from "@/types/studio";
import { useRouter } from "next/router";
import { recordPreviewDom } from "@/lib/recordPreviewDom";

export default function StudioExportPage() {
  const [slides, setSlides] = useState<StudioSlide[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const project = await loadProject("current-studio-project");
      if (project?.slides) {
        setSlides(project.slides);
      }
    }
    init();
  }, []);

  useEffect(() => {
    document.body.classList.add("export-mode");

    return () => {
      document.body.classList.remove("export-mode");
    };
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
      const blob = await recordPreviewDom(totalDuration);

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "studio-video.webm";
      a.click();
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
      <div className="export-stage-wrapper">
        <div className="export-canvas">
          <StudioPreviewPlayer
            slides={slides}
            musicEngineRef={{ current: null }}
            lang="ru"
            onClose={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
