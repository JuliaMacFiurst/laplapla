"use client";

import { useState, useEffect } from "react";
import type { StudioProject, StudioSlide } from "@/types/studio";
import SlideList from "./SlideList";
import SlideCanvas9x16 from "./SlideCanvas9x16";
import SlideTextEditor from "./SlideTextEditor";
import StudioSettingsPanel from "./StudioSettingsPanel";

import { saveProject, loadProject } from "@/lib/studioStorage";
import MediaPickerModal from "./MediaPickerModal";

const PROJECT_ID = "current-studio-project";

function createEmptySlide(): StudioSlide {
  return {
    id: crypto.randomUUID(),
    text: "",
    mediaUrl: undefined,
    bgColor: "#ffffff",
    textColor: "#000000",
  };
}

function createInitialProject(): StudioProject {
  return {
    id: PROJECT_ID,
    slides: [createEmptySlide()],
    updatedAt: Date.now(),
  };
}

interface StudioRootProps {
  initialSlides?: { text: string; image?: string }[];
}

export default function StudioRoot({ initialSlides }: StudioRootProps) {
  const [project, setProject] = useState<StudioProject>(createInitialProject);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [history, setHistory] = useState<StudioProject[]>([]);
  const [future, setFuture] = useState<StudioProject[]>([]);
  const [isMediaOpen, setIsMediaOpen] = useState(false);

  const activeSlide = project.slides[activeSlideIndex];

  // Restore saved project on mount (only if no external slides arrive)
  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      if (cancelled) return;

      // If slides from Cats were provided, do not restore old project
      if (initialSlides && initialSlides.length > 0) return;

      const saved = await loadProject(PROJECT_ID);
      if (saved) {
        setProject(saved);
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // Autosave every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      saveProject(project);
    }, 4000);

    return () => clearInterval(interval);
  }, [project]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  useEffect(() => {
    if (!initialSlides || initialSlides.length === 0) return;

    const mappedSlides: StudioSlide[] = initialSlides.map((s: { text: string; image?: string }) => ({
      id: crypto.randomUUID(),
      text: s.text,
      mediaUrl: s.image,
      bgColor: "#ffffff",
      textColor: "#000000",
    }));

    const newProject: StudioProject = {
      id: PROJECT_ID,
      slides: mappedSlides,
      updatedAt: Date.now(),
    };

    setProject(newProject);
    setActiveSlideIndex(0);

    // Immediately overwrite saved project with external slides
    saveProject(newProject);
  }, [initialSlides]);

  function pushHistory(current: StudioProject) {
    setHistory((prev) => [...prev, current]);
    setFuture([]);
  }

  function updateSlide(updatedSlide: StudioSlide) {
    pushHistory(project);
    const updatedSlides = [...project.slides];
    updatedSlides[activeSlideIndex] = updatedSlide;

    setProject({
      ...project,
      slides: updatedSlides,
      updatedAt: Date.now(),
    });
  }

  function addSlide() {
    pushHistory(project);
    const newSlide = createEmptySlide();

    setProject({
      ...project,
      slides: [...project.slides, newSlide],
      updatedAt: Date.now(),
    });

    setActiveSlideIndex(project.slides.length);
  }

  function deleteSlide(index: number) {
    if (project.slides.length === 1) return;

    pushHistory(project);

    const updatedSlides = project.slides.filter((_, i) => i !== index);

    setProject({
      ...project,
      slides: updatedSlides,
      updatedAt: Date.now(),
    });

    setActiveSlideIndex(Math.max(0, index - 1));
  }

  function deleteAll() {
    pushHistory(project);
    setProject(createInitialProject());
    setActiveSlideIndex(0);
  }

  function undo() {
    if (history.length === 0) return;

    const previous = history[history.length - 1];

    setFuture((f) => [project, ...f]);
    setHistory((h) => h.slice(0, -1));
    setProject(previous);
  }

  function redo() {
    if (future.length === 0) return;

    const next = future[0];

    setHistory((h) => [...h, project]);
    setFuture((f) => f.slice(1));
    setProject(next);
  }

  return (
    <div style={{ padding: 24 }}>
      <SlideList
        slides={project.slides}
        activeIndex={activeSlideIndex}
        onSelect={setActiveSlideIndex}
        onAdd={addSlide}
        onDelete={deleteSlide}
      />

      <SlideCanvas9x16 slide={activeSlide} />

      <SlideTextEditor
        value={activeSlide.text}
        onChange={(text) =>
          updateSlide({ ...activeSlide, text })
        }
      />

      <StudioSettingsPanel
        slide={activeSlide}
        onChangeTextColor={(color) =>
          updateSlide({ ...activeSlide, textColor: color })
        }
        onChangeBgColor={(color) =>
          updateSlide({ ...activeSlide, bgColor: color })
        }
        onAddMedia={() => setIsMediaOpen(true)}
        onAddMusic={() => console.log("add music")}
        onRecordVoice={() => console.log("record voice")}
        onExport={() => console.log("export")}
        onSetFitCover={() =>
          updateSlide({ ...activeSlide, mediaFit: "cover" })
        }
        onSetFitContain={() =>
          updateSlide({ ...activeSlide, mediaFit: "contain" })
        }
        onSetPositionTop={() =>
          updateSlide({ ...activeSlide, mediaPosition: "top" })
        }
        onSetPositionCenter={() =>
          updateSlide({ ...activeSlide, mediaPosition: "center" })
        }
        onSetPositionBottom={() =>
          updateSlide({ ...activeSlide, mediaPosition: "bottom" })
        }
        onSetTextTop={() =>
          updateSlide({ ...activeSlide, textPosition: "top" })
        }
        onSetTextCenter={() =>
          updateSlide({ ...activeSlide, textPosition: "center" })
        }
        onSetTextBottom={() =>
          updateSlide({ ...activeSlide, textPosition: "bottom" })
        }
        onToggleTextBg={() =>
          updateSlide({
            ...activeSlide,
            textBgEnabled: !activeSlide.textBgEnabled,
          })
        }
        onChangeTextBgColor={(color) =>
          updateSlide({ ...activeSlide, textBgColor: color })
        }
        onChangeTextBgOpacity={(opacity) =>
          updateSlide({ ...activeSlide, textBgOpacity: opacity })
        }
        onDeleteAll={deleteAll}
        onUndo={undo}
        onRedo={redo}
      />
      <MediaPickerModal
        isOpen={isMediaOpen}
        onClose={() => setIsMediaOpen(false)}
        onSelect={(url) => {
          updateSlide({ ...activeSlide, mediaUrl: url });
          setIsMediaOpen(false);
        }}
      />
    </div>
  );
}