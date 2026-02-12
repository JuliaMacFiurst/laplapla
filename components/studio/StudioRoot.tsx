"use client";

import { useState, useEffect } from "react";
import type { StudioProject, StudioSlide } from "@/types/studio";
import SlideList from "./SlideList";
import SlideCanvas9x16 from "./SlideCanvas9x16";
import SlideTextEditor from "./SlideTextEditor";
import StudioSettingsPanel from "./StudioSettingsPanel";


interface StudioRootProps {
  initialSlides?: { text: string; image?: string }[];
}

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
    id: crypto.randomUUID(),
    slides: [createEmptySlide()],
    updatedAt: Date.now(),
  };
}

export default function StudioRoot({ initialSlides }: StudioRootProps) {
  const [project, setProject] = useState<StudioProject>(createInitialProject);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);

  const activeSlide = project.slides[activeSlideIndex];

  useEffect(() => {
    if (!initialSlides || initialSlides.length === 0) return;

    const mappedSlides: StudioSlide[] = initialSlides.map((s) => ({
      id: crypto.randomUUID(),
      text: s.text,
      mediaUrl: s.image,
      bgColor: "#ffffff",
      textColor: "#000000",
    }));

    setProject({
      id: crypto.randomUUID(),
      slides: mappedSlides,
      updatedAt: Date.now(),
    });

    setActiveSlideIndex(0);
  }, [initialSlides]);

  function updateSlide(updatedSlide: StudioSlide) {
    const updatedSlides = [...project.slides];
    updatedSlides[activeSlideIndex] = updatedSlide;

    setProject({
      ...project,
      slides: updatedSlides,
      updatedAt: Date.now(),
    });
  }

  function addSlide() {
    const newSlide = createEmptySlide();

    setProject({
      ...project,
      slides: [...project.slides, newSlide],
      updatedAt: Date.now(),
    });

    setActiveSlideIndex(project.slides.length);
  }

  return (
    <div style={{ padding: 24 }}>
      <SlideList
        slides={project.slides}
        activeIndex={activeSlideIndex}
        onSelect={setActiveSlideIndex}
        onAdd={addSlide}
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
        onAddMedia={() => console.log("add media")}
        onAddMusic={() => console.log("add music")}
        onRecordVoice={() => console.log("record voice")}
        onExport={() => console.log("export")}
      />
    </div>
  );
}