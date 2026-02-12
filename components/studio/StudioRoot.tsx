

"use client";

import { useState, useEffect } from "react";
import type { StudioProject, StudioSlide } from "@/types/studio";

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

      {/* Slide selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {project.slides.map((slide, index) => (
          <button
            key={slide.id}
            onClick={() => setActiveSlideIndex(index)}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border:
                index === activeSlideIndex
                  ? "2px solid black"
                  : "1px solid #ccc",
              background: "white",
              cursor: "pointer",
            }}
          >
            {index + 1}
          </button>
        ))}

        <button
          onClick={addSlide}
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid #ccc",
            background: "#f3f3f3",
            cursor: "pointer",
          }}
        >
          +
        </button>
      </div>

      {/* 9:16 Preview */}
      <div
        style={{
          width: 360,
          aspectRatio: "9 / 16",
          background: activeSlide.bgColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 12,
          border: "1px solid #ddd",
          marginBottom: 16,
          padding: 16,
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: activeSlide.textColor,
            fontFamily: "'Amatic SC', cursive",
            fontSize: 28,
            whiteSpace: "pre-wrap",
          }}
        >
          {activeSlide.text || "Введите текст слайда"}
        </div>
      </div>

      {/* Text editor */}
      <textarea
        value={activeSlide.text}
        onChange={(e) =>
          updateSlide({ ...activeSlide, text: e.target.value })
        }
        placeholder="Введите текст..."
        style={{
          width: 360,
          height: 100,
          marginBottom: 12,
          padding: 8,
          borderRadius: 8,
          border: "1px solid #ccc",
        }}
      />

      {/* Color controls */}
      <div style={{ display: "flex", gap: 12 }}>
        <label>
          Цвет текста:
          <input
            type="color"
            value={activeSlide.textColor}
            onChange={(e) =>
              updateSlide({ ...activeSlide, textColor: e.target.value })
            }
          />
        </label>

        <label>
          Цвет фона:
          <input
            type="color"
            value={activeSlide.bgColor}
            onChange={(e) =>
              updateSlide({ ...activeSlide, bgColor: e.target.value })
            }
          />
        </label>
      </div>
    </div>
  );
}