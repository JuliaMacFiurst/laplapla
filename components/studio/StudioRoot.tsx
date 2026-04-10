"use client";

import { useState, useEffect, useRef, type Dispatch, type RefObject, type SetStateAction } from "react";
import AudioEngine, { type AudioEngineHandle } from "./AudioEngine";
import MusicPanel from "./MusicPanel";
import type { StudioProject, StudioSlide } from "@/types/studio";
import type { Track } from "./MusicPanel";
import SlideList from "./SlideList";
import SlideCanvas9x16 from "./SlideCanvas9x16";
import StudioSettingsPanel from "./StudioSettingsPanel";
import StudioPreviewPlayer from "./StudioPreviewPlayer";
import { Lang, dictionaries } from "@/i18n";
import { saveProject, loadProject } from "@/lib/studioStorage";
import MediaPickerModal from "./MediaPickerModal";
import { useRouter } from "next/router";
import { buildLocalizedQuery } from "@/lib/i18n/routing";
import { toStudioMediaUrl } from "@/lib/studioMediaProxy";

const PROJECT_ID = "current-studio-project";

function createStudioId() {
  if (typeof globalThis !== "undefined" && typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `studio-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function createEmptySlide(): StudioSlide {
  return {
    id: createStudioId(),
    text: "",
    mediaUrl: undefined,
    bgColor: "#ffffff",
    textColor: "#000000",
    voiceUrl: undefined,
    voiceDuration: undefined,
  };
}

function createInitialProject(): StudioProject {
  return {
    id: PROJECT_ID,
    slides: [createEmptySlide()],
    musicTracks: [],
    updatedAt: Date.now(),
    fontFamily: "'Amatic SC', cursive",
  };
}

function getImportedSlideFontSize(text: string) {
  const wordCount = text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;

  if (wordCount > 20) {
    return 22;
  }

  if (wordCount <= 10) {
    return 30;
  }

  return 26;
}

interface StudioRootProps {
  lang: Lang;
  initialSlides?: Array<{
    text: string;
    image?: string;
    mediaType?: "image" | "video";
    mediaFit?: "cover" | "contain";
    mediaPosition?: "top" | "center" | "bottom";
    textPosition?: "top" | "center" | "bottom";
    textAlign?: "left" | "center" | "right";
    textBgEnabled?: boolean;
    textBgColor?: string;
    textBgOpacity?: number;
  }>;
  initialTracks?: Track[];
}

interface StudioLayoutProps {
  lang: Lang;
  project: StudioProject;
  activeSlide: StudioSlide;
  activeSlideIndex: number;
  isMediaOpen: boolean;
  isPreviewOpen: boolean;
  isRecording: boolean;
  isSaving: boolean;
  lastSavedAt: number | null;
  t: (typeof dictionaries)[Lang]["cats"]["studio"];
  audioEngineRef: RefObject<AudioEngineHandle | null>;
  previewRef: RefObject<HTMLDivElement | null>;
  setActiveSlideIndex: Dispatch<SetStateAction<number>>;
  setProject: Dispatch<SetStateAction<StudioProject>>;
  setIsMediaOpen: Dispatch<SetStateAction<boolean>>;
  setIsPreviewOpen: Dispatch<SetStateAction<boolean>>;
  addSlide: () => void;
  deleteSlide: (index: number) => void;
  updateMusicTracks: (tracks: StudioProject["musicTracks"]) => void;
  startVoiceRecording: () => Promise<void>;
  stopVoiceRecording: () => void;
  removeVoiceFromSlide: () => void;
  enhanceVoiceRecording: () => Promise<void>;
  makeVoiceLouder: () => Promise<void>;
  makeChildVoice: () => Promise<void>;
  updateSlide: (updatedSlide: StudioSlide) => void;
  deleteAll: () => void;
  undo: () => void;
  redo: () => void;
  router: ReturnType<typeof useRouter>;
  updateActiveSlide: (
    updater: (slide: StudioSlide) => StudioSlide,
    slideIndex?: number,
  ) => void;
}

type MobilePickerTarget = "text" | "bg" | null;

interface MobileColorState {
  hue: number;
  darkness: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hslToHex(hue: number, saturation: number, lightness: number) {
  const s = saturation / 100;
  const l = lightness / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hPrime = hue / 60;
  const x = c * (1 - Math.abs((hPrime % 2) - 1));

  let r = 0;
  let g = 0;
  let b = 0;

  if (hPrime >= 0 && hPrime < 1) {
    r = c;
    g = x;
  } else if (hPrime < 2) {
    r = x;
    g = c;
  } else if (hPrime < 3) {
    g = c;
    b = x;
  } else if (hPrime < 4) {
    g = x;
    b = c;
  } else if (hPrime < 5) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const m = l - c / 2;
  const toHex = (channel: number) =>
    Math.round((channel + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsl(hex: string): MobileColorState {
  const cleaned = hex.replace("#", "");
  const normalized = cleaned.length === 3
    ? cleaned.split("").map((char) => `${char}${char}`).join("")
    : cleaned.padEnd(6, "0").slice(0, 6);

  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;

  let hue = 0;
  if (delta !== 0) {
    if (max === r) {
      hue = 60 * (((g - b) / delta) % 6);
    } else if (max === g) {
      hue = 60 * ((b - r) / delta + 2);
    } else {
      hue = 60 * ((r - g) / delta + 4);
    }
  }

  return {
    hue: (hue + 360) % 360,
    darkness: Math.round((1 - lightness) * 100),
  };
}

function buildColorFromState(state: MobileColorState) {
  return hslToHex(state.hue, 100, clamp(100 - state.darkness, 18, 82));
}

interface MobileColorPickerProps {
  title: string;
  state: MobileColorState;
  opacity?: number;
  showOpacity?: boolean;
  onChangeState: (state: MobileColorState) => void;
  onChangeOpacity?: (opacity: number) => void;
  onQuickSelect?: (hex: string) => void;
}

function MobileColorPicker({
  title,
  state,
  opacity = 1,
  showOpacity = false,
  onChangeState,
  onChangeOpacity,
  onQuickSelect,
}: MobileColorPickerProps) {
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const previewColor = buildColorFromState(state);
  const quickColors = [
    { label: "White", hex: "#ffffff" },
    { label: "Black", hex: "#000000" },
  ] as const;

  const updateHueFromClientPoint = (clientX: number, clientY: number) => {
    const wheel = wheelRef.current;
    if (!wheel) return;

    const rect = wheel.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(clientY - centerY, clientX - centerX);
    const hue = ((angle * 180) / Math.PI + 360) % 360;

    onChangeState({
      ...state,
      hue,
    });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        padding: "12px",
        borderRadius: "16px",
        background: "#222",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
        <span style={{ color: "#fff", fontSize: "13px", fontWeight: 700 }}>{title}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {quickColors.map((quickColor) => (
            <button
              key={quickColor.hex}
              type="button"
              aria-label={quickColor.label}
              onClick={() => onQuickSelect?.(quickColor.hex)}
              style={{
                width: "22px",
                height: "22px",
                borderRadius: "999px",
                background: quickColor.hex,
                border: "2px solid rgba(255,255,255,0.35)",
                padding: 0,
              }}
            />
          ))}
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "999px",
              background: previewColor,
              border: "2px solid rgba(255,255,255,0.25)",
            }}
          />
        </div>
      </div>

      <div
        ref={wheelRef}
        onTouchStart={(e) => {
          const touch = e.touches[0];
          if (!touch) return;
          updateHueFromClientPoint(touch.clientX, touch.clientY);
        }}
        onTouchMove={(e) => {
          const touch = e.touches[0];
          if (!touch) return;
          e.preventDefault();
          updateHueFromClientPoint(touch.clientX, touch.clientY);
        }}
        style={{
          width: "160px",
          height: "160px",
          alignSelf: "center",
          borderRadius: "999px",
          background:
            "conic-gradient(#ff4d6d, #ff9f1c, #ffe66d, #8ac926, #00c2a8, #1982c4, #6a4cff, #c77dff, #ff4d6d)",
          boxShadow: "inset 0 0 0 16px rgba(255,255,255,0.14)",
        }}
      />

      <label style={{ display: "flex", flexDirection: "column", gap: "6px", color: "#fff", fontSize: "12px" }}>
        Darkness
        <input
          type="range"
          min="0"
          max="82"
          value={state.darkness}
          onChange={(e) =>
            onChangeState({
              ...state,
              darkness: Number(e.target.value),
            })
          }
          style={{ width: "100%" }}
        />
      </label>

      {showOpacity ? (
        <label style={{ display: "flex", flexDirection: "column", gap: "6px", color: "#fff", fontSize: "12px" }}>
          Transparency
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(opacity * 100)}
            onChange={(e) => onChangeOpacity?.(Number(e.target.value) / 100)}
            style={{ width: "100%" }}
          />
        </label>
      ) : null}
    </div>
  );
}

function StudioDesktopLayout({
  lang,
  project,
  activeSlide,
  activeSlideIndex,
  isMediaOpen,
  isPreviewOpen,
  isRecording,
  isSaving,
  lastSavedAt,
  t,
  audioEngineRef,
  previewRef,
  setActiveSlideIndex,
  setProject,
  setIsMediaOpen,
  setIsPreviewOpen,
  addSlide,
  deleteSlide,
  updateMusicTracks,
  startVoiceRecording,
  stopVoiceRecording,
  removeVoiceFromSlide,
  enhanceVoiceRecording,
  makeVoiceLouder,
  makeChildVoice,
  updateSlide,
  deleteAll,
  undo,
  redo,
  router,
  updateActiveSlide,
}: StudioLayoutProps) {
  return (
    <div className="studio-root">
      <div className="studio-layout">
        <div className="studio-left">
          <SlideList
            lang={lang}
            slides={project.slides}
            activeIndex={activeSlideIndex}
            onSelect={setActiveSlideIndex}
            onAdd={addSlide}
            onDelete={deleteSlide}
            onReorder={(from, to) => {
              setProject((prev) => {
                const slides = [...prev.slides];
                const [moved] = slides.splice(from, 1);
                slides.splice(to, 0, moved);

                return {
                  ...prev,
                  slides,
                  updatedAt: Date.now(),
                };
              });

              setActiveSlideIndex(to);
            }}
          />

          <div className="studio-canvas-wrapper">
            {!isPreviewOpen && (
              <SlideCanvas9x16 slide={activeSlide} lang={lang} />
            )}

            {isPreviewOpen && (
              <StudioPreviewPlayer
                ref={previewRef}
                slides={project.slides}
                musicEngineRef={audioEngineRef}
                lang={lang}
                onClose={() => setIsPreviewOpen(false)}
              />
            )}
          </div>
          <div className="studio-save-indicator">
            {isSaving && <span className="saving">Сохраняем…</span>}
            {!isSaving && lastSavedAt && (
              <span className="saved">
                {t.saved}
              </span>
            )}
          </div>
          <AudioEngine ref={audioEngineRef} maxTracks={4} />
          {/* Музыкальная панель: управляет общим фоновым сопровождением всего проекта */}
          <MusicPanel
            lang={lang}
            engineRef={audioEngineRef}
            initialTracks={project.musicTracks}
            onTracksChange={updateMusicTracks}
            isRecording={isRecording}
            onStartRecording={startVoiceRecording}
            onStopRecording={stopVoiceRecording}
            voiceUrl={activeSlide.voiceUrl}
            voiceDuration={activeSlide.voiceDuration}
            onRemoveVoice={removeVoiceFromSlide}
            onEnhanceVoice={enhanceVoiceRecording}
            onMakeVoiceLouder={makeVoiceLouder}
            onMakeChildVoice={makeChildVoice}
          />
        </div>

        <div className="studio-right">
          <div className="studio-panel">
            <StudioSettingsPanel
              lang={lang}
              slide={activeSlide}
              textValue={activeSlide.text}
              onChangeText={(text) => updateSlide({ ...activeSlide, text })}
              onChangeTextColor={(color) =>
                updateSlide({ ...activeSlide, textColor: color })
              }
              onChangeBgColor={(color) =>
                updateSlide({ ...activeSlide, bgColor: color })
              }
              onAddMedia={() => setIsMediaOpen(true)}
              onPreview={() => setIsPreviewOpen(true)}
              onExport={() =>
                router.push(
                  {
                    pathname: "/cats/export",
                    query: buildLocalizedQuery(lang),
                  },
                  undefined,
                  { locale: lang },
                )
              }
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
              onSetAlignLeft={() =>
                updateSlide({ ...activeSlide, textAlign: "left" })
              }
              onSetAlignCenter={() =>
                updateSlide({ ...activeSlide, textAlign: "center" })
              }
              onSetAlignRight={() =>
                updateSlide({ ...activeSlide, textAlign: "right" })
              }
              onChangeFontSize={(size) =>
                updateSlide({ ...activeSlide, fontSize: size })
              }
              onDeleteAll={deleteAll}
              onUndo={undo}
              onRedo={redo}
            />
          </div>
        </div>
      </div>
      <MediaPickerModal
        lang={lang}
        isOpen={isMediaOpen}
        onClose={() => setIsMediaOpen(false)}
        onSelect={({ url, mediaType }) => {
          const normalizedUrl = toStudioMediaUrl(url) ?? url;
          updateActiveSlide((slide) => ({
            ...slide,
            mediaUrl: normalizedUrl,
            mediaType,
          }));

          setIsMediaOpen(false);
        }}
      />
    </div>
  );
}

function StudioMobileLayout({
  lang,
  project,
  activeSlide,
  activeSlideIndex,
  setActiveSlideIndex,
  setProject,
  setIsMediaOpen,
  addSlide,
  deleteSlide,
  startVoiceRecording,
  updateSlide,
}: StudioLayoutProps) {
  const [mode, setMode] = useState<"slides" | "text" | "media" | "audio" | "settings" | null>("slides");
  const [activePicker, setActivePicker] = useState<MobilePickerTarget>(null);
  const [textColorState, setTextColorState] = useState<MobileColorState>(() => hexToHsl("#ffffff"));
  const [bgColorState, setBgColorState] = useState<MobileColorState>(() => hexToHsl("#000000"));
  const [reorderSourceIndex, setReorderSourceIndex] = useState<number | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const reorderPressTimerRef = useRef<number | null>(null);
  const mobileModes = [
    { key: "slides", label: "Slides" },
    { key: "text", label: "Text" },
    { key: "media", label: "Media" },
    { key: "audio", label: "Audio" },
    { key: "settings", label: "Settings" },
  ] as const;
  const mobileButtonStyle = {
    minHeight: "44px",
    padding: "10px",
    borderRadius: "12px",
    background: "#2a2a2a",
    color: "#fff",
    border: "none",
  } satisfies React.CSSProperties;

  useEffect(() => {
    setTextColorState(hexToHsl(activeSlide.textColor ?? "#ffffff"));
    setBgColorState(hexToHsl(activeSlide.textBgColor ?? "#000000"));
    setActivePicker(null);
    setReorderSourceIndex(null);
  }, [activeSlide.id]);

  useEffect(() => {
    setTextColorState(hexToHsl(activeSlide.textColor ?? "#ffffff"));
  }, [activeSlide.textColor]);

  useEffect(() => {
    setBgColorState(hexToHsl(activeSlide.textBgColor ?? "#000000"));
  }, [activeSlide.textBgColor]);

  useEffect(() => {
    return () => {
      if (reorderPressTimerRef.current !== null) {
        window.clearTimeout(reorderPressTimerRef.current);
      }
    };
  }, []);

  function clearReorderPressTimer() {
    if (reorderPressTimerRef.current !== null) {
      window.clearTimeout(reorderPressTimerRef.current);
      reorderPressTimerRef.current = null;
    }
  }

  function moveSlide(from: number, to: number) {
    const targetIndex = from < to ? to - 1 : to;

    if (from === targetIndex) {
      setReorderSourceIndex(null);
      return;
    }

    setProject((prev) => {
      const slides = [...prev.slides];
      const [moved] = slides.splice(from, 1);
      slides.splice(targetIndex, 0, moved);

      return {
        ...prev,
        slides,
        updatedAt: Date.now(),
      };
    });

    setActiveSlideIndex(targetIndex);
    setReorderSourceIndex(null);
  }

  useEffect(() => {
    if (!activePicker) return;

    const handlePointerOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (pickerRef.current?.contains(target)) return;
      setActivePicker(null);
    };

    document.addEventListener("mousedown", handlePointerOutside);
    document.addEventListener("touchstart", handlePointerOutside);

    return () => {
      document.removeEventListener("mousedown", handlePointerOutside);
      document.removeEventListener("touchstart", handlePointerOutside);
    };
  }, [activePicker]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        height: "100dvh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#000",
        overflow: "hidden",
        overflowX: "hidden",
        zIndex: 100,
      }}
    >
      <div
        className="studio-mobile-canvas"
        style={{
          flex: "1 1 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px",
          minHeight: 0,
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            aspectRatio: "9 / 16",
            maxWidth: "100%",
            position: "relative",
            zIndex: 1,
            overflow: "hidden",
          }}
        >
          <SlideCanvas9x16
            slide={activeSlide}
            lang={lang}
            isMobile
            isTextEditing={mode === "text"}
            onUpdateSlide={updateSlide}
          />
        </div>
      </div>
      <div
        className="studio-mobile-panel"
        style={{
          flex: "0 0 auto",
          maxHeight: "40vh",
          overflowY: "auto",
          overflowX: "hidden",
          background: "#1a1a1a",
          padding: "10px",
          zIndex: 5,
          minWidth: 0,
        }}
      >
          {mode === "slides" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ color: "#fff", fontSize: "12px", lineHeight: 1.35 }}>
                Hold a slide, then tap another one to move it there.
              </div>
              <div
                style={{
                  width: "100%",
                  overflowX: "auto",
                  overflowY: "hidden",
                  display: "flex",
                  gap: "10px",
                  paddingBottom: "6px",
                  minWidth: 0,
                  alignItems: "center",
                }}
              >
                {project.slides.map((slide, index) => (
                  <div key={slide.id} style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                    {reorderSourceIndex !== null ? (
                      <button
                        type="button"
                        onClick={() => moveSlide(reorderSourceIndex, index)}
                        style={{
                          width: "26px",
                          height: "140px",
                          borderRadius: "999px",
                          border: "1px dashed #c9b6ff",
                          background: "rgba(201,182,255,0.16)",
                          color: "#c9b6ff",
                          fontSize: "10px",
                          flexShrink: 0,
                        }}
                      >
                        |
                      </button>
                    ) : null}

                    <div
                      onClick={() => {
                        if (reorderSourceIndex === null) {
                          setActiveSlideIndex(index);
                        }
                      }}
                      onTouchStart={() => {
                        clearReorderPressTimer();
                        reorderPressTimerRef.current = window.setTimeout(() => {
                          setReorderSourceIndex(index);
                        }, 280);
                      }}
                      onTouchEnd={clearReorderPressTimer}
                      onTouchCancel={clearReorderPressTimer}
                      style={{
                        position: "relative",
                        minWidth: "90px",
                        height: "140px",
                        borderRadius: "14px",
                        overflow: "hidden",
                        background: "#222",
                        border:
                          reorderSourceIndex === index
                            ? "2px solid #c9b6ff"
                            : index === activeSlideIndex
                              ? "2px solid #ffb3d1"
                              : "1px solid #444",
                        cursor: "grab",
                        flexShrink: 0,
                        touchAction: "pan-x",
                        transform: reorderSourceIndex === index ? "scale(0.96)" : "scale(1)",
                      }}
                    >
                      {slide.mediaUrl && (
                        slide.mediaType === "video" ? (
                          <video
                            src={slide.mediaUrl}
                            muted
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              zIndex: 1,
                            }}
                          />
                        ) : (
                          <img
                            src={slide.mediaUrl}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              zIndex: 1,
                            }}
                          />
                        )
                      )}

                      {slide.text && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: "4px",
                            left: "4px",
                            right: "4px",
                            fontSize: "10px",
                            color: "#fff",
                            background: "rgba(0,0,0,0.4)",
                            borderRadius: "6px",
                            padding: "2px 4px",
                            zIndex: 1,
                          }}
                        >
                          {slide.text.slice(0, 30)}
                        </div>
                      )}

                      {reorderSourceIndex === index ? (
                        <div
                          style={{
                            position: "absolute",
                            inset: "0",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "rgba(0,0,0,0.35)",
                            color: "#fff",
                            fontSize: "11px",
                            fontWeight: 700,
                            zIndex: 1,
                          }}
                        >
                          Moving
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearReorderPressTimer();
                          setReorderSourceIndex(null);
                          deleteSlide(index);
                        }}
                        style={{
                          position: "absolute",
                          top: "4px",
                          right: "4px",
                          width: "18px",
                          height: "18px",
                          borderRadius: "50%",
                          background: "#ffb3d1",
                          color: "#000",
                          fontSize: "12px",
                          border: "none",
                          zIndex: 1,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}

                {reorderSourceIndex !== null ? (
                  <button
                    type="button"
                    onClick={() => moveSlide(reorderSourceIndex, project.slides.length)}
                    style={{
                      width: "26px",
                      height: "140px",
                      borderRadius: "999px",
                      border: "1px dashed #c9b6ff",
                      background: "rgba(201,182,255,0.16)",
                      color: "#c9b6ff",
                      fontSize: "10px",
                      flexShrink: 0,
                    }}
                  >
                    |
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    clearReorderPressTimer();
                    setReorderSourceIndex(null);
                    addSlide();
                  }}
                  style={{
                    minWidth: "90px",
                    height: "140px",
                    borderRadius: "14px",
                    background: "#c9b6ff",
                    fontSize: "24px",
                    border: "none",
                    color: "#000",
                    flexShrink: 0,
                    cursor: "pointer",
                  }}
                >
                  +
                </button>
              </div>
            </div>
          )}

          {mode === "text" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ color: "#fff", fontSize: "13px", lineHeight: 1.4 }}>
                Drag text on the canvas. Use the pink corner handle to resize or the X button to remove it.
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "stretch" }}>
                <button
                  type="button"
                  onClick={() => setActivePicker("text")}
                  style={{
                    ...mobileButtonStyle,
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <span
                    style={{
                      width: "14px",
                      height: "14px",
                      borderRadius: "999px",
                      background: activeSlide.textColor ?? "#ffffff",
                      border: "1px solid rgba(255,255,255,0.35)",
                    }}
                  />
                  Text
                </button>
                <button
                  type="button"
                  onClick={() => setActivePicker("bg")}
                  style={{
                    ...mobileButtonStyle,
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <span
                    style={{
                      width: "14px",
                      height: "14px",
                      borderRadius: "999px",
                      background: activeSlide.textBgEnabled ? activeSlide.textBgColor ?? "#000000" : "#111",
                      border: "1px solid rgba(255,255,255,0.35)",
                    }}
                  />
                  BG
                </button>
                <button
                  type="button"
                  onClick={() => updateSlide({ ...activeSlide, fontSize: (activeSlide.fontSize || 24) + 2 })}
                  style={{ ...mobileButtonStyle, flex: 1, minWidth: 0 }}
                >
                  A+
                </button>
                <button
                  type="button"
                  onClick={() => updateSlide({ ...activeSlide, fontSize: (activeSlide.fontSize || 24) - 2 })}
                  style={{ ...mobileButtonStyle, flex: 1, minWidth: 0 }}
                >
                  A-
                </button>
              </div>

              {activePicker ? (
                <div ref={pickerRef}>
                  {activePicker === "text" ? (
                    <MobileColorPicker
                      title="Text color"
                      state={textColorState}
                      onChangeState={(nextState) => {
                        setTextColorState(nextState);
                        updateSlide({
                          ...activeSlide,
                          textColor: buildColorFromState(nextState),
                        });
                      }}
                      onQuickSelect={(hex) => {
                        setTextColorState(hexToHsl(hex));
                        updateSlide({
                          ...activeSlide,
                          textColor: hex,
                        });
                      }}
                    />
                  ) : null}

                  {activePicker === "bg" ? (
                    <MobileColorPicker
                      title="Background color"
                      state={bgColorState}
                      opacity={activeSlide.textBgOpacity ?? 0.6}
                      showOpacity
                      onChangeState={(nextState) => {
                        setBgColorState(nextState);
                        updateSlide({
                          ...activeSlide,
                          textBgEnabled: true,
                          textBgColor: buildColorFromState(nextState),
                        });
                      }}
                      onQuickSelect={(hex) => {
                        setBgColorState(hexToHsl(hex));
                        updateSlide({
                          ...activeSlide,
                          textBgEnabled: true,
                          textBgColor: hex,
                        });
                      }}
                      onChangeOpacity={(nextOpacity) =>
                        updateSlide({
                          ...activeSlide,
                          textBgEnabled: true,
                          textBgOpacity: nextOpacity,
                        })
                      }
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          )}

          {mode === "media" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {activeSlide.mediaUrl ? (
                <div
                  style={{
                    borderRadius: "12px",
                    overflow: "hidden",
                    height: "160px",
                  }}
                >
                  {activeSlide.mediaType === "video" ? (
                    <video
                      src={activeSlide.mediaUrl}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={activeSlide.mediaUrl}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  )}
                </div>
              ) : (
                <div style={{ color: "#aaa" }}>No media</div>
              )}

              <button
                type="button"
                onClick={() => setIsMediaOpen(true)}
                style={mobileButtonStyle}
              >
                Replace Media
              </button>

              <button
                type="button"
                onClick={() =>
                  updateSlide({ ...activeSlide, mediaUrl: undefined })
                }
                style={{
                  ...mobileButtonStyle,
                  background: "#ffb3d1",
                  color: "#000",
                }}
              >
                Remove Media
              </button>
            </div>
          )}

          {mode === "audio" && (
            <button type="button" onClick={() => void startVoiceRecording()} style={mobileButtonStyle}>
              Record Voice
            </button>
          )}

          {mode === "settings" && (
            <div style={{ color: "#fff" }}>
              Settings coming next step
            </div>
          )}
      </div>
      <nav
        className="studio-mobile-nav"
        aria-label="Studio mobile navigation"
        style={{
          position: "sticky",
          bottom: 0,
          width: "100%",
          zIndex: 10,
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "8px",
          padding: "10px",
          background: "#111",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          minWidth: 0,
        }}
      >
        {mobileModes.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setMode((current) => (current === key ? null : key));
              setActivePicker(null);
            }}
            style={{
              minHeight: "44px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.16)",
              background: mode === key ? "#ffb3d1" : "#2a2a2a",
              color: mode === key ? "#000" : "#fff",
              fontSize: "12px",
              fontWeight: 600,
              padding: "10px",
            }}
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function StudioRoot({ lang, initialSlides, initialTracks }: StudioRootProps) {
  const [project, setProject] = useState<StudioProject>(createInitialProject);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [history, setHistory] = useState<StudioProject[]>([]);
  const [future, setFuture] = useState<StudioProject[]>([]);
  const [isMediaOpen, setIsMediaOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Локальный аудио-движок для музыки всего слайдшоу (до 4 дорожек)
  const audioEngineRef = useRef<AudioEngineHandle | null>(null);

  // --- Voice recording per slide ---
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const projectRef = useRef(project);
  const lastSavedSnapshotRef = useRef<string>(JSON.stringify(project));
  const isSavingRef = useRef(false);

  const t = dictionaries[lang].cats.studio
  const router = useRouter();

  const previewRef = useRef<HTMLDivElement>(null);

  function markProjectSaved(savedProject: StudioProject) {
    projectRef.current = savedProject;
    lastSavedSnapshotRef.current = JSON.stringify(savedProject);
    setLastSavedAt(Date.now());
  }

  async function startVoiceRecording() {
    if (isRecording) return;

    try {
      const rawStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
          sampleRate: 48000,
        },
      });

      // --- Light audio processing via AudioContext ---
      const audioCtx = new AudioContext({ sampleRate: 48000 });
      const source = audioCtx.createMediaStreamSource(rawStream);

      const compressor = audioCtx.createDynamicsCompressor();
      compressor.threshold.value = -20;
      compressor.knee.value = 20;
      compressor.ratio.value = 3;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      const highpass = audioCtx.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 80; // remove low rumble

      const destination = audioCtx.createMediaStreamDestination();

      source.connect(highpass);
      highpass.connect(compressor);
      compressor.connect(destination);

      const stream = destination.stream;

      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
        audioBitsPerSecond: 192000,
      });

      recordedChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });

        // Persistable URL (survives reload): store as data: URL in project.
        const dataUrl: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });

        const audio = new Audio(dataUrl);
        await new Promise((resolve) => {
          audio.onloadedmetadata = () => resolve(true);
        });

        const duration = audio.duration;

        setProject((prev) => {
          const updatedSlides = prev.slides.map((s, i) =>
            i === activeSlideIndex
              ? { ...s, voiceUrl: dataUrl, voiceDuration: duration }
              : s
          );

          const updatedProject = {
            ...prev,
            slides: updatedSlides,
            updatedAt: Date.now(),
          };

          // Persist immediately using fresh state
          void saveProject(updatedProject).then(() => {
            markProjectSaved(updatedProject);
          });

          return updatedProject;
        });

        rawStream.getTracks().forEach((track) => track.stop());
        audioCtx.close();
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Voice recording failed", err);
    }
  }

  function stopVoiceRecording() {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }

  function bufferToWav(buffer: AudioBuffer): Blob {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArray = new ArrayBuffer(length);
    const view = new DataView(bufferArray);

    let offset = 0;
    const writeString = (str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset++, str.charCodeAt(i));
      }
    };

    writeString("RIFF");
    view.setUint32(offset, 36 + buffer.length * numOfChan * 2, true);
    offset += 4;
    writeString("WAVE");
    writeString("fmt ");
    view.setUint32(offset, 16, true);
    offset += 4;
    view.setUint16(offset, 1, true);
    offset += 2;
    view.setUint16(offset, numOfChan, true);
    offset += 2;
    view.setUint32(offset, buffer.sampleRate, true);
    offset += 4;
    view.setUint32(offset, buffer.sampleRate * numOfChan * 2, true);
    offset += 4;
    view.setUint16(offset, numOfChan * 2, true);
    offset += 2;
    view.setUint16(offset, 16, true);
    offset += 2;
    writeString("data");
    view.setUint32(offset, buffer.length * numOfChan * 2, true);
    offset += 4;

    const channels = [];
    for (let i = 0; i < numOfChan; i++) {
      channels.push(buffer.getChannelData(i));
    }

    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numOfChan; channel++) {
        let sample = Math.max(-1, Math.min(1, channels[channel][i]));
        view.setInt16(offset, sample * 0x7fff, true);
        offset += 2;
      }
    }

    return new Blob([view], { type: "audio/wav" });
  }

  async function readVoiceUrlToArrayBuffer(voiceUrl: string) {
    if (voiceUrl.startsWith("data:")) {
      const commaIndex = voiceUrl.indexOf(",");
      if (commaIndex === -1) {
        throw new Error("Invalid data URL");
      }

      const meta = voiceUrl.slice(0, commaIndex);
      const payload = voiceUrl.slice(commaIndex + 1);

      if (meta.includes(";base64")) {
        const binary = atob(payload);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
      }

      const decoded = decodeURIComponent(payload);
      return new TextEncoder().encode(decoded).buffer;
    }

    const response = await fetch(voiceUrl);
    if (!response.ok) {
      throw new Error(`Failed to load voice recording: ${response.status}`);
    }

    return response.arrayBuffer();
  }

  function percentile(values: number[], ratio: number) {
    if (values.length === 0) {
      return 0;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * ratio)));
    return sorted[index] ?? 0;
  }

  function applyNoiseReduction(
    samples: Float32Array,
    sampleRate: number,
    options?: { light?: boolean },
  ) {
    const light = options?.light ?? false;
    const frameSize = Math.max(256, Math.floor(sampleRate * 0.02));
    const frameRms: number[] = [];

    for (let start = 0; start < samples.length; start += frameSize) {
      let energy = 0;
      const end = Math.min(samples.length, start + frameSize);
      for (let i = start; i < end; i += 1) {
        energy += samples[i] * samples[i];
      }
      frameRms.push(Math.sqrt(energy / Math.max(1, end - start)));
    }

    const noiseFloor = Math.max(light ? 0.001 : 0.0015, percentile(frameRms, light ? 0.12 : 0.2));
    const openThreshold = Math.max(noiseFloor * (light ? 2 : 3), light ? 0.006 : 0.01);
    const closeThreshold = Math.max(noiseFloor * (light ? 1.15 : 1.4), light ? 0.0025 : 0.004);
    const attackCoeff = Math.exp(-1 / (sampleRate * (light ? 0.008 : 0.004)));
    const releaseCoeff = Math.exp(-1 / (sampleRate * (light ? 0.12 : 0.06)));
    let gain = 1;

    for (let frameIndex = 0; frameIndex < frameRms.length; frameIndex += 1) {
      const rms = frameRms[frameIndex];
      let targetGain = 1;

      if (rms <= closeThreshold) {
        targetGain = light ? 0.55 : 0.18;
      } else if (rms < openThreshold) {
        const blend = (rms - closeThreshold) / Math.max(0.0001, openThreshold - closeThreshold);
        const floorGain = light ? 0.55 : 0.18;
        targetGain = floorGain + blend * (1 - floorGain);
      }

      const start = frameIndex * frameSize;
      const end = Math.min(samples.length, start + frameSize);
      for (let i = start; i < end; i += 1) {
        const coeff = targetGain < gain ? attackCoeff : releaseCoeff;
        gain = targetGain + (gain - targetGain) * coeff;
        samples[i] *= gain;
      }
    }
  }

  function applyDeEsser(samples: Float32Array, sampleRate: number) {
    const lowpassCoeff = Math.exp(-2 * Math.PI * 4500 / sampleRate);
    const attackCoeff = Math.exp(-1 / (sampleRate * 0.0015));
    const releaseCoeff = Math.exp(-1 / (sampleRate * 0.035));
    let low = 0;
    let envelope = 0;

    const hfLevels = new Array<number>(samples.length);
    for (let i = 0; i < samples.length; i += 1) {
      low = (1 - lowpassCoeff) * samples[i] + lowpassCoeff * low;
      const high = samples[i] - low;
      const level = Math.abs(high);
      envelope = level > envelope
        ? level + (envelope - level) * attackCoeff
        : level + (envelope - level) * releaseCoeff;
      hfLevels[i] = envelope;
    }

    const threshold = Math.max(0.01, percentile(hfLevels, 0.82) * 0.9);
    let gain = 1;

    for (let i = 0; i < samples.length; i += 1) {
      const overshoot = hfLevels[i] - threshold;
      const targetGain = overshoot > 0
        ? Math.max(0.55, 1 - overshoot / Math.max(threshold * 3, 0.0001))
        : 1;
      const coeff = targetGain < gain ? attackCoeff : releaseCoeff;
      gain = targetGain + (gain - targetGain) * coeff;
      samples[i] *= gain;
    }
  }

  function applyCompressor(samples: Float32Array, sampleRate: number) {
    const thresholdDb = -20;
    const threshold = Math.pow(10, thresholdDb / 20);
    const ratio = 3.5;
    const attackCoeff = Math.exp(-1 / (sampleRate * 0.003));
    const releaseCoeff = Math.exp(-1 / (sampleRate * 0.09));
    const makeupGain = 1.18;
    let envelope = 0;
    let gain = 1;

    for (let i = 0; i < samples.length; i += 1) {
      const level = Math.abs(samples[i]);
      envelope = level > envelope
        ? level + (envelope - level) * attackCoeff
        : level + (envelope - level) * releaseCoeff;

      let targetGain = 1;
      if (envelope > threshold) {
        const inputDb = 20 * Math.log10(envelope);
        const outputDb = thresholdDb + (inputDb - thresholdDb) / ratio;
        const reductionDb = outputDb - inputDb;
        targetGain = Math.pow(10, reductionDb / 20);
      }

      const coeff = targetGain < gain ? attackCoeff : releaseCoeff;
      gain = targetGain + (gain - targetGain) * coeff;
      samples[i] *= gain * makeupGain;
    }
  }

  function applyLimiter(samples: Float32Array) {
    let peak = 0;
    for (let i = 0; i < samples.length; i += 1) {
      peak = Math.max(peak, Math.abs(samples[i]));
    }

    const ceiling = 0.92;
    const normalizeGain = peak > ceiling ? ceiling / peak : 1;

    for (let i = 0; i < samples.length; i += 1) {
      const sample = samples[i] * normalizeGain;
      samples[i] = Math.max(-ceiling, Math.min(ceiling, sample));
    }
  }

  function buildProcessedVoiceBuffer(
    audioBuffer: AudioBuffer,
    options?: { lightNoiseReduction?: boolean },
  ) {
    const processed = new AudioBuffer({
      length: audioBuffer.length,
      numberOfChannels: audioBuffer.numberOfChannels,
      sampleRate: audioBuffer.sampleRate,
    });

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
      const input = audioBuffer.getChannelData(channel);
      const output = processed.getChannelData(channel);
      output.set(input);

      applyNoiseReduction(output, audioBuffer.sampleRate, {
        light: options?.lightNoiseReduction,
      });
      applyDeEsser(output, audioBuffer.sampleRate);
      applyCompressor(output, audioBuffer.sampleRate);
      applyLimiter(output);
    }

    return processed;
  }

  async function persistProcessedVoiceBuffer(processedBuffer: AudioBuffer) {
    const wavBlob = bufferToWav(processedBuffer);

    const reader = new FileReader();
    const dataUrl: string = await new Promise((resolve) => {
      reader.onloadend = () => resolve(String(reader.result));
      reader.readAsDataURL(wavBlob);
    });

    const probeAudio = new Audio(dataUrl);
    await new Promise((resolve) => {
      probeAudio.onloadedmetadata = () => resolve(true);
    });
    const duration = probeAudio.duration;

    setProject((prev) => {
      const updatedSlides = prev.slides.map((s, i) =>
        i === activeSlideIndex
          ? { ...s, voiceUrl: dataUrl, voiceDuration: duration }
          : s
      );

      const updatedProject = {
        ...prev,
        slides: updatedSlides,
        updatedAt: Date.now(),
      };

      void saveProject(updatedProject).then(() => {
        markProjectSaved(updatedProject);
      });
      return updatedProject;
    });
  }

  async function processCurrentVoice(options?: {
    outputGain?: number;
    childVoice?: boolean;
  }) {
    if (!activeSlide.voiceUrl) return;

    const { outputGain = 1, childVoice = false } = options ?? {};

    try {
      const arrayBuffer = await readVoiceUrlToArrayBuffer(activeSlide.voiceUrl);

      const audioCtx = new AudioContext({ sampleRate: 48000 });
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      let processedBuffer = childVoice
        ? audioBuffer
        : buildProcessedVoiceBuffer(audioBuffer);

      if (childVoice) {
        const pitchRate = 1.14;
        const pitchedLength = Math.max(1, Math.ceil(processedBuffer.length / pitchRate));
        const offlineCtx = new OfflineAudioContext(
          processedBuffer.numberOfChannels,
          pitchedLength,
          processedBuffer.sampleRate,
        );

        const source = offlineCtx.createBufferSource();
        source.buffer = processedBuffer;
        source.playbackRate.value = pitchRate;
        source.connect(offlineCtx.destination);
        source.start();

        const pitchedBuffer = await offlineCtx.startRendering();
        processedBuffer = buildProcessedVoiceBuffer(pitchedBuffer, {
          lightNoiseReduction: true,
        });
      }

      if (outputGain !== 1) {
        for (let channel = 0; channel < processedBuffer.numberOfChannels; channel += 1) {
          const samples = processedBuffer.getChannelData(channel);
          for (let i = 0; i < samples.length; i += 1) {
            samples[i] *= outputGain;
          }
          applyLimiter(samples);
        }
      }

      await persistProcessedVoiceBuffer(processedBuffer);
      audioCtx.close();
    } catch (err) {
      console.error("Enhance voice failed", err);
    }
  }

  async function enhanceVoiceRecording() {
    await processCurrentVoice();
  }

  async function makeVoiceLouder() {
    await processCurrentVoice({ outputGain: 1.35 });
  }

  async function makeChildVoice() {
    await processCurrentVoice({ outputGain: 1.1, childVoice: true });
  }

  function removeVoiceFromSlide() {
    if (activeSlide.voiceUrl && activeSlide.voiceUrl.startsWith("blob:")) {
      URL.revokeObjectURL(activeSlide.voiceUrl);
    }

    updateSlide({
      ...activeSlide,
      voiceUrl: undefined,
      voiceDuration: undefined,
    });
  }

  const activeSlide = project.slides[activeSlideIndex];

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  // Restore saved project on mount (only if no external slides arrive)
  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      if (cancelled) return;

      // If external import was provided, do not restore old project
      if ((initialSlides && initialSlides.length > 0) || (initialTracks && initialTracks.length > 0)) return;

      const saved = await loadProject(PROJECT_ID);
      if (saved) {
        projectRef.current = saved;
        lastSavedSnapshotRef.current = JSON.stringify(saved);
        setProject(saved);
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [initialSlides, initialTracks]);

  // Autosave every 4 seconds
  useEffect(() => {
    let cancelled = false;

    const interval = setInterval(async () => {
      if (cancelled || isSavingRef.current) return;

      const nextSnapshot = JSON.stringify(projectRef.current);
      if (nextSnapshot === lastSavedSnapshotRef.current) return;

      isSavingRef.current = true;
      setIsSaving(true);

      try {
        await saveProject(projectRef.current);
        if (!cancelled) {
          lastSavedSnapshotRef.current = nextSnapshot;
          setLastSavedAt(Date.now());
        }
      } finally {
        isSavingRef.current = false;
        if (!cancelled) {
          setIsSaving(false);
        }
      }
    }, 4000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  useEffect(() => {
    if ((!initialSlides || initialSlides.length === 0) && (!initialTracks || initialTracks.length === 0)) {
      return;
    }

    const mappedSlides: StudioSlide[] = (initialSlides ?? []).map(
      (s) => ({
        id: createStudioId(),
        text: s.text,
        fontSize: getImportedSlideFontSize(s.text),
        mediaUrl: toStudioMediaUrl(s.image),
        mediaType: s.mediaType ?? (s.image?.includes(".mp4") || s.image?.includes(".webm") ? "video" : "image"),
        mediaFit: s.mediaFit ?? "contain",
        mediaPosition: s.mediaPosition ?? "center",
        textPosition: s.textPosition ?? "bottom",
        textAlign: s.textAlign ?? "center",
        textBgEnabled: s.textBgEnabled ?? true,
        textBgColor: s.textBgColor ?? "#ffffff",
        textBgOpacity: s.textBgOpacity ?? 1,
        bgColor: "#ffffff",
        textColor: "#000000",
      }),
    );

    const newProject: StudioProject = {
      id: PROJECT_ID,
      slides: mappedSlides.length > 0 ? mappedSlides : [createEmptySlide()],
      musicTracks: initialTracks ?? [],
      updatedAt: Date.now(),
    };

    setProject(newProject);
    setActiveSlideIndex(0);

    // Immediately overwrite saved project with external slides
    void saveProject(newProject).then(() => {
      markProjectSaved(newProject);
    });
  }, [initialSlides, initialTracks]);

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

  function updateActiveSlide(
    updater: (slide: StudioSlide) => StudioSlide,
    slideIndex = activeSlideIndex,
  ) {
    setProject((currentProject) => {
      pushHistory(currentProject);
      const updatedSlides = [...currentProject.slides];
      const currentSlide = updatedSlides[slideIndex];
      if (!currentSlide) {
        return currentProject;
      }

      updatedSlides[slideIndex] = updater(currentSlide);

      return {
        ...currentProject,
        slides: updatedSlides,
        updatedAt: Date.now(),
      };
    });
  }

  function updateMusicTracks(tracks: StudioProject["musicTracks"]) {
    pushHistory(project);
    setProject({
      ...project,
      musicTracks: tracks,
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

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");

    const updateIsMobile = (event?: MediaQueryListEvent) => {
      setIsMobile(event?.matches ?? mediaQuery.matches);
    };

    updateIsMobile();
    mediaQuery.addEventListener("change", updateIsMobile);

    return () => {
      mediaQuery.removeEventListener("change", updateIsMobile);
    };
  }, []);

  const layoutProps: StudioLayoutProps = {
    lang,
    project,
    activeSlide,
    activeSlideIndex,
    isMediaOpen,
    isPreviewOpen,
    isRecording,
    isSaving,
    lastSavedAt,
    t,
    audioEngineRef,
    previewRef,
    setActiveSlideIndex,
    setProject,
    setIsMediaOpen,
    setIsPreviewOpen,
    addSlide,
    deleteSlide,
    updateMusicTracks,
    startVoiceRecording,
    stopVoiceRecording,
    removeVoiceFromSlide,
    enhanceVoiceRecording,
    makeVoiceLouder,
    makeChildVoice,
    updateSlide,
    deleteAll,
    undo,
    redo,
    router,
    updateActiveSlide,
  };

  return isMobile ? (
    <StudioMobileLayout {...layoutProps} />
  ) : (
    <StudioDesktopLayout {...layoutProps} />
  );
}
