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
import { AMATIC_FONT_FAMILY, resolveFontFamily } from "@/lib/fonts";
import { toStudioMediaUrl } from "@/lib/studioMediaProxy";
import { PARROT_PRESETS } from "@/utils/parrot-presets";

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
    fontFamily: AMATIC_FONT_FAMILY,
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

interface MobileAudioSheetProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

type VoiceActionKey = "enhance" | "louder" | "child";
type VoiceActionStatus = "idle" | "loading" | "done";
type MobileExportState = "idle" | "recording" | "processing" | "success" | "fallback-screen-record" | "failed";
type MobileExportCapability = "checking" | "direct-record" | "guided-record";

function getProjectPreviewDurationMs(project: StudioProject) {
  return project.slides.reduce((total, slide) => {
    const slideDuration = slide.voiceDuration && slide.voiceDuration > 0
      ? slide.voiceDuration * 1000
      : 3000;
    return total + slideDuration;
  }, 0);
}

function detectSupportedRecorderMimeType() {
  if (typeof MediaRecorder === "undefined") return null;

  const candidates = [
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];

  for (const mimeType of candidates) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  return "";
}

function detectMobileExportCapability(previewNode: HTMLDivElement | null): MobileExportCapability {
  const mimeType = detectSupportedRecorderMimeType();
  const canCapturePreview =
    !!previewNode &&
    typeof (previewNode as HTMLDivElement & {
      captureStream?: (frameRate?: number) => MediaStream;
    }).captureStream === "function";

  if (mimeType && canCapturePreview) {
    return "direct-record";
  }

  return "guided-record";
}

function MobileAudioSheet({ title, onClose, children }: MobileAudioSheetProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 140,
        background: "rgba(0,0,0,0.82)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          height: "100dvh",
          background: "#141414",
          color: "#fff",
          padding: "14px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            marginBottom: "12px",
          }}
        >
          <strong style={{ fontSize: "18px" }}>{title}</strong>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "999px",
              border: "none",
              background: "#2a2a2a",
              color: "#fff",
              fontSize: "18px",
            }}
          >
            ×
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: "16px" }}>
          {children}
        </div>
      </div>
    </div>
  );
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
            activeVoiceEffects={activeSlide.activeVoiceEffects}
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
  isRecording,
  isMediaOpen,
  previewRef,
  setActiveSlideIndex,
  setProject,
  setIsMediaOpen,
  addSlide,
  deleteSlide,
  updateMusicTracks,
  removeVoiceFromSlide,
  enhanceVoiceRecording,
  makeVoiceLouder,
  makeChildVoice,
  startVoiceRecording,
  stopVoiceRecording,
  updateSlide,
  deleteAll,
  undo,
  redo,
  audioEngineRef,
}: StudioLayoutProps) {
  const [mode, setMode] = useState<"slides" | "text" | "media" | "audio" | "settings" | null>("slides");
  const [activePicker, setActivePicker] = useState<MobilePickerTarget>(null);
  const [activeAudioSheet, setActiveAudioSheet] = useState<"music" | "voice" | null>(null);
  const [isPreviewSheetOpen, setIsPreviewSheetOpen] = useState(false);
  const [isExportSheetOpen, setIsExportSheetOpen] = useState(false);
  const [exportState, setExportState] = useState<MobileExportState>("idle");
  const [exportStatusText, setExportStatusText] = useState("We’ll record your slideshow as it plays ✨");
  const [exportBlobUrl, setExportBlobUrl] = useState<string | null>(null);
  const [exportResetSignal, setExportResetSignal] = useState(0);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportSlideProgress, setExportSlideProgress] = useState(1);
  const [exportedWithoutSound, setExportedWithoutSound] = useState(false);
  const [isExportFallbackPlayerMode, setIsExportFallbackPlayerMode] = useState(false);
  const [showExportFallbackHint, setShowExportFallbackHint] = useState(false);
  const [exportCapability, setExportCapability] = useState<MobileExportCapability>("checking");
  const [selectedMusicPresetId, setSelectedMusicPresetId] = useState<string | null>(PARROT_PRESETS[0]?.id ?? null);
  const [previewingAudioId, setPreviewingAudioId] = useState<string | null>(null);
  const [areTracksPlaying, setAreTracksPlaying] = useState(false);
  const [voicePreviewVolume, setVoicePreviewVolume] = useState(1);
  const [voiceActionState, setVoiceActionState] = useState<Record<VoiceActionKey, VoiceActionStatus>>({
    enhance: "idle",
    louder: "idle",
    child: "idle",
  });
  const [textColorState, setTextColorState] = useState<MobileColorState>(() => hexToHsl("#ffffff"));
  const [bgColorState, setBgColorState] = useState<MobileColorState>(() => hexToHsl("#000000"));
  const [reorderSourceIndex, setReorderSourceIndex] = useState<number | null>(null);
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const reorderPressTimerRef = useRef<number | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const exportStopTimeoutRef = useRef<number | null>(null);
  const exportSheetRef = useRef<HTMLDivElement | null>(null);
  const mobileModes = [
    { key: "slides", label: "Slides" },
    { key: "text", label: "Text" },
    { key: "media", label: "Media" },
    { key: "audio", label: "Audio" },
    { key: "settings", label: "Save" },
  ] as const;
  const mobileButtonStyle = {
    minHeight: "44px",
    padding: "10px",
    borderRadius: "12px",
    background: "#2a2a2a",
    color: "#fff",
    border: "none",
  } satisfies React.CSSProperties;
  const selectedMusicPreset = PARROT_PRESETS.find((preset) => preset.id === selectedMusicPresetId) ?? null;
  const exportCaption = "Made with LapLapLa Cat Studio";
  const exportCredits = "Some media may be sourced from GIPHY and Pexels. Created with LapLapLa Cat Studio.";

  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
      }
      if (exportBlobUrl) {
        URL.revokeObjectURL(exportBlobUrl);
      }
      if (exportStopTimeoutRef.current !== null) {
        window.clearTimeout(exportStopTimeoutRef.current);
      }
    };
  }, [exportBlobUrl]);

  useEffect(() => {
    if (!isExportSheetOpen) {
      setExportCapability("checking");
      return;
    }

    const detectCapability = () => {
      setExportCapability(detectMobileExportCapability(previewRef.current));
    };

    detectCapability();

    const timeoutId = window.setTimeout(detectCapability, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isExportSheetOpen, previewRef]);

  useEffect(() => {
    setIsDeleteAllConfirmOpen(false);
  }, [mode]);

  useEffect(() => {
    if (!isExportSheetOpen || exportState !== "idle") return;

    if (exportCapability === "direct-record") {
      setExportStatusText("We’ll record your slideshow as it plays ✨");
      return;
    }

    if (exportCapability === "guided-record") {
      setExportStatusText("Save locally with your phone’s screen recording.");
    }
  }, [exportCapability, exportState, isExportSheetOpen]);

  useEffect(() => {
    const engine = audioEngineRef.current;
    if (!engine) return;

    const engineTracks = engine.getTracks();
    const projectTrackIds = new Set(project.musicTracks.map((track) => track.id));
    const engineTrackIds = new Set(engineTracks.map((track) => track.id));

    engineTracks.forEach((track) => {
      if (!projectTrackIds.has(track.id)) {
        engine.removeTrack(track.id);
      }
    });

    project.musicTracks.forEach((track) => {
      if (!engineTrackIds.has(track.id)) {
        engine.addTrack(track);
      }
      engine.setVolume(track.id, track.volume);
    });
  }, [audioEngineRef, project.musicTracks]);

  useEffect(() => {
    setTextColorState(hexToHsl(activeSlide.textColor ?? "#ffffff"));
    setBgColorState(hexToHsl(activeSlide.textBgColor ?? "#000000"));
    setActivePicker(null);
    setReorderSourceIndex(null);
    setVoiceActionState({
      enhance: "idle",
      louder: "idle",
      child: "idle",
    });
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

  function updateTrackVolume(trackId: string, volume: number) {
    const nextTracks = project.musicTracks.map((track) =>
      track.id === trackId ? { ...track, volume } : track,
    );
    updateMusicTracks(nextTracks);
    audioEngineRef.current?.setVolume?.(trackId, volume);
  }

  function removeTrack(trackId: string) {
    const nextTracks = project.musicTracks.filter((track) => track.id !== trackId);
    updateMusicTracks(nextTracks);
    audioEngineRef.current?.removeTrack?.(trackId);
  }

  function addMusicTrack(track: Track) {
    if (project.musicTracks.length >= 4) return;
    if (project.musicTracks.some((existingTrack) => existingTrack.id === track.id)) return;

    updateMusicTracks([...project.musicTracks, track]);
    audioEngineRef.current?.addTrack?.(track);
    audioEngineRef.current?.setVolume?.(track.id, track.volume);
  }

  function togglePreviewAudio(id: string, src: string) {
    if (previewingAudioId === id && previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      previewAudioRef.current = null;
      setPreviewingAudioId(null);
      return;
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }

    const audio = new Audio(src);
    previewAudioRef.current = audio;
    setPreviewingAudioId(id);
    audio.onended = () => {
      setPreviewingAudioId(null);
      previewAudioRef.current = null;
    };
    void audio.play();
  }

  function togglePlayAllTracks() {
    if (areTracksPlaying) {
      audioEngineRef.current?.stopAll?.();
      setAreTracksPlaying(false);
    } else {
      audioEngineRef.current?.playAll?.();
      setAreTracksPlaying(true);
    }
  }

  function resetExportUi() {
    if (exportStopTimeoutRef.current !== null) {
      window.clearTimeout(exportStopTimeoutRef.current);
      exportStopTimeoutRef.current = null;
    }
    if (exportBlobUrl) {
      URL.revokeObjectURL(exportBlobUrl);
    }
    setExportBlobUrl(null);
    setExportState("idle");
    setExportStatusText("We’ll record your slideshow as it plays ✨");
    setExportProgress(0);
    setExportSlideProgress(1);
    setExportedWithoutSound(false);
    setIsExportFallbackPlayerMode(false);
    setShowExportFallbackHint(false);
  }

  function startScreenRecordFallback() {
    setExportState("fallback-screen-record");
    setExportStatusText("Use your device screen recording to save this story.");
    setExportProgress(0);
    setExportSlideProgress(1);
  }

  function requestExportFullscreen() {
    const node = exportSheetRef.current as
      | (HTMLDivElement & {
          webkitRequestFullscreen?: () => Promise<void> | void;
        })
      | null;

    if (!node) return;

    try {
      if (typeof node.requestFullscreen === "function") {
        void node.requestFullscreen().catch(() => {});
        return;
      }

      if (typeof node.webkitRequestFullscreen === "function") {
        void Promise.resolve(node.webkitRequestFullscreen()).catch(() => {});
      }
    } catch {}
  }

  function exitExportFullscreen() {
    const currentDocument = document as Document & {
      webkitExitFullscreen?: () => Promise<void> | void;
    };

    try {
      if (typeof currentDocument.exitFullscreen === "function" && currentDocument.fullscreenElement) {
        void currentDocument.exitFullscreen().catch(() => {});
        return;
      }

      if (typeof currentDocument.webkitExitFullscreen === "function") {
        void Promise.resolve(currentDocument.webkitExitFullscreen()).catch(() => {});
      }
    } catch {}
  }

  function openExportFallbackPlayer() {
    setIsExportFallbackPlayerMode(true);
    setShowExportFallbackHint(true);
    setExportResetSignal((current) => current + 1);
    setExportStatusText("Play the slideshow while your phone records the screen.");

    window.setTimeout(() => {
      requestExportFullscreen();
    }, 0);
  }

  function closeExportFallbackPlayer() {
    setIsExportFallbackPlayerMode(false);
    setShowExportFallbackHint(false);
    exitExportFullscreen();
  }

  useEffect(() => {
    if (!isExportFallbackPlayerMode || !showExportFallbackHint) return;

    const timeoutId = window.setTimeout(() => {
      setShowExportFallbackHint(false);
    }, 4200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isExportFallbackPlayerMode, showExportFallbackHint]);

  function handleExportPlaybackComplete() {
    if (exportState !== "recording") return;

    setExportState("processing");
    setExportStatusText("Preparing your video...");
    setExportProgress(1);
  }

  async function handleSaveExportedVideo() {
    if (!exportBlobUrl) return;

    const link = document.createElement("a");
    link.href = exportBlobUrl;
    link.download = "laplapla-story.webm";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleShareExportedVideo() {
    if (!exportBlobUrl) return;

    const response = await fetch(exportBlobUrl);
    const blob = await response.blob();
    const file = new File([blob], "laplapla-story.webm", { type: blob.type || "video/webm" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: "LapLapLa Story",
        text: exportCaption,
      });
      return;
    }

    await handleSaveExportedVideo();
  }

  function beginExportProgress(totalDurationMs: number) {
    const totalSlides = Math.max(1, project.slides.length);
    const startTime = Date.now();

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(0.98, elapsed / totalDurationMs);
      const nextSlide = Math.min(
        totalSlides,
        Math.max(1, Math.floor(progress * totalSlides) + 1),
      );

      setExportProgress(progress);
      setExportSlideProgress(nextSlide);
      setExportStatusText(`Recording slide ${nextSlide} of ${totalSlides}...`);

      if (elapsed >= totalDurationMs) {
        window.clearInterval(interval);
      }
    }, 180);

    return interval;
  }

  async function handleStartExport() {
    resetExportUi();

    const capability = detectMobileExportCapability(previewRef.current);
    setExportCapability(capability);

    if (capability !== "direct-record") {
      startScreenRecordFallback();
      return;
    }

    const mimeType = detectSupportedRecorderMimeType();
    const previewNode = previewRef.current as HTMLDivElement & {
      captureStream?: (frameRate?: number) => MediaStream;
    };

    const totalDurationMs = getProjectPreviewDurationMs(project) + 800;
    setExportResetSignal((current) => current + 1);

    if (!mimeType || typeof previewNode?.captureStream !== "function") {
      startScreenRecordFallback();
      return;
    }

    try {
      const stream = previewNode.captureStream(30);
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: BlobPart[] = [];
      const progressInterval = beginExportProgress(totalDurationMs);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onerror = () => {
        window.clearInterval(progressInterval);
        startScreenRecordFallback();
      };

      recorder.onstop = () => {
        window.clearInterval(progressInterval);

        if (chunks.length === 0) {
          startScreenRecordFallback();
          return;
        }

        const blob = new Blob(chunks, { type: mimeType || "video/webm" });
        const nextUrl = URL.createObjectURL(blob);
        setExportBlobUrl(nextUrl);
        setExportState("success");
        setExportStatusText("Your video is ready 🎉");
        setExportProgress(1);
        setExportedWithoutSound(true);
      };

      setExportState("recording");
      setExportStatusText("Recording slide 1 of 1...");
      setExportProgress(0);
      setExportSlideProgress(1);
      recorder.start();

      exportStopTimeoutRef.current = window.setTimeout(() => {
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      }, totalDurationMs);
    } catch (error) {
      console.error("Mobile export failed", error);
      startScreenRecordFallback();
    }
  }

  async function runVoiceAction(action: VoiceActionKey, handler?: () => Promise<void>) {
    if (!handler || !activeSlide.voiceUrl || voiceActionState[action] === "loading") return;

    setVoiceActionState((current) => ({
      ...current,
      [action]: "loading",
    }));

    try {
      await handler();
      setVoiceActionState((current) => ({
        ...current,
        enhance: action === "enhance" ? "idle" : current.enhance,
        louder: action === "louder" ? "idle" : current.louder,
        child: action === "child" ? "idle" : current.child,
        [action]: "idle",
      }));
    } catch (error) {
      console.error(`Voice action failed: ${action}`, error);
      setVoiceActionState((current) => ({
        ...current,
        [action]: "idle",
      }));
    }
  }

  function getVoiceActionButtonStyle(action: VoiceActionKey, baseBackground: string) {
    const status = voiceActionState[action];
    const isActive = Boolean(activeSlide.activeVoiceEffects?.[action]);

    if (isActive) {
      return {
        ...mobileButtonStyle,
        background: "#111",
        color: "#fff",
        border: "1px solid rgba(152, 240, 197, 0.8)",
      };
    }

    if (status === "loading") {
      return {
        ...mobileButtonStyle,
        background: "#ffd36b",
        color: "#000",
      };
    }

    return {
      ...mobileButtonStyle,
      background: baseBackground,
      color: "#000",
    };
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
      <AudioEngine ref={audioEngineRef} maxTracks={4} />
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
            isMediaEditing={mode === "media"}
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              marginBottom: mode ? "10px" : 0,
            }}
          >
            <button
              type="button"
              onClick={undo}
              style={{
                ...mobileButtonStyle,
                background: "#232323",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <span aria-hidden="true">↩️</span>
              Undo
            </button>
            <button
              type="button"
              onClick={redo}
              style={{
                ...mobileButtonStyle,
                background: "#232323",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <span aria-hidden="true">↪️</span>
              Redo
            </button>
          </div>

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
              <div style={{ color: "#fff", fontSize: "13px", lineHeight: 1.4 }}>
                Drag media on the canvas. Use the pink corner handle to resize it or the X button on the frame to remove it.
              </div>

              <button
                type="button"
                onClick={() => setIsMediaOpen(true)}
                style={mobileButtonStyle}
              >
                {activeSlide.mediaUrl ? "Open library" : "Add media"}
              </button>

              {activeSlide.mediaUrl ? (
                <button
                  type="button"
                  onClick={() =>
                    updateSlide({
                      ...activeSlide,
                      mediaFit: activeSlide.mediaFit === "cover" ? "contain" : "cover",
                    })
                  }
                  style={{
                    ...mobileButtonStyle,
                    background: activeSlide.mediaFit === "cover" ? "#ffb3d1" : "#c9b6ff",
                    color: "#000",
                  }}
                >
                  {activeSlide.mediaFit === "cover" ? "Заполнить" : "По размеру"}
                </button>
              ) : null}
            </div>
          )}

          {mode === "audio" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setActiveAudioSheet("music")}
                style={mobileButtonStyle}
              >
                Выбор музыки
              </button>
              <button
                type="button"
                onClick={() => setActiveAudioSheet("voice")}
                style={mobileButtonStyle}
              >
                Record Voice
              </button>
            </div>
          )}

          {mode === "settings" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ color: "#fff", fontSize: "13px", lineHeight: 1.4 }}>
                Preview the full slideshow in a mobile full-screen player before export.
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewSheetOpen(true)}
                style={{
                  ...mobileButtonStyle,
                  background: "#8fdcff",
                  color: "#000",
                }}
              >
                Preview slideshow
              </button>
              <button
                type="button"
                onClick={() => {
                  resetExportUi();
                  setIsExportSheetOpen(true);
                }}
                style={{
                  ...mobileButtonStyle,
                  background: "#ffb3d1",
                  color: "#000",
                }}
              >
                Export
              </button>
              <div style={{ color: "rgba(255,255,255,0.68)", fontSize: "12px", lineHeight: 1.35 }}>
                We’ll record your slideshow as it plays ✨ Works on most devices
              </div>
              <div
                style={{
                  marginTop: "6px",
                  paddingTop: "10px",
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", fontWeight: 700 }}>
                  Danger zone
                </div>
                {!isDeleteAllConfirmOpen ? (
                  <button
                    type="button"
                    onClick={() => setIsDeleteAllConfirmOpen(true)}
                    style={{
                      ...mobileButtonStyle,
                      background: "rgba(255,107,107,0.16)",
                      color: "#ffb3b3",
                      border: "1px solid rgba(255,107,107,0.35)",
                    }}
                  >
                    🗑️ Delete all
                  </button>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ color: "#fff", fontSize: "12px", lineHeight: 1.4 }}>
                      Delete the whole slideshow? This cannot be undone in one tap.
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        deleteAll();
                        setIsDeleteAllConfirmOpen(false);
                      }}
                      style={{
                        ...mobileButtonStyle,
                        background: "#ff6b6b",
                        color: "#fff",
                      }}
                    >
                      Confirm delete all
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsDeleteAllConfirmOpen(false)}
                      style={mobileButtonStyle}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
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
      <MediaPickerModal
        lang={lang}
        isOpen={isMediaOpen}
        isMobile
        onClose={() => setIsMediaOpen(false)}
        onSelect={({ url, mediaType }) => {
          updateSlide({
            ...activeSlide,
            mediaUrl: toStudioMediaUrl(url) ?? url,
            mediaType,
          });
          setIsMediaOpen(false);
        }}
      />
      {activeAudioSheet === "music" ? (
        <MobileAudioSheet
          title="Музыка"
          onClose={() => {
            if (previewAudioRef.current) {
              previewAudioRef.current.pause();
              previewAudioRef.current.currentTime = 0;
              previewAudioRef.current = null;
            }
            setPreviewingAudioId(null);
            setActiveAudioSheet(null);
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div
              style={{
                padding: "14px",
                borderRadius: "16px",
                background: "linear-gradient(rgb(188 255 239), rgb(255 246 162))",
                color: "#000",
              }}
            >
              <div style={{ marginBottom: "10px", fontWeight: 700 }}>Выбранные дорожки</div>
              {project.musicTracks.length === 0 ? (
                <div style={{ opacity: 0.7, fontSize: "14px" }}>Пока ничего не выбрано</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {project.musicTracks.map((track) => (
                    <div
                      key={track.id}
                      style={{
                        padding: "10px",
                        borderRadius: "12px",
                        background: "rgba(255,255,255,0.62)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                        <strong style={{ fontSize: "14px" }}>{track.label}</strong>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => togglePreviewAudio(`track-${track.id}`, track.src)}
                            style={{
                              border: "none",
                              background: "#e0f7ff",
                              color: "#000",
                              borderRadius: "10px",
                              padding: "6px 10px",
                            }}
                          >
                            {previewingAudioId === `track-${track.id}` ? "⏸" : "▶"}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeTrack(track.id)}
                            style={{
                              border: "none",
                              background: "#ff6b6b",
                              color: "#fff",
                              borderRadius: "10px",
                              padding: "6px 10px",
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={track.volume}
                        onChange={(e) => updateTrackVolume(track.id, Number(e.target.value))}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={togglePlayAllTracks}
                    style={{
                      ...mobileButtonStyle,
                      background: areTracksPlaying ? "#ffb3d1" : "#8fdcff",
                      color: "#000",
                    }}
                  >
                    {areTracksPlaying ? "⏸ Pause All" : "▶ Play All"}
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {PARROT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedMusicPresetId(preset.id)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "12px",
                    border: selectedMusicPresetId === preset.id ? "2px solid #ffb3d1" : "1px solid rgba(255,255,255,0.16)",
                    background: selectedMusicPresetId === preset.id ? "#2a1f28" : "#1f1f1f",
                    color: "#fff",
                  }}
                >
                  {preset.title}
                </button>
              ))}
            </div>

            {selectedMusicPreset ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {selectedMusicPreset.loops.map((loop) => (
                  <div
                    key={loop.id}
                    style={{
                      padding: "12px",
                      borderRadius: "14px",
                      background: "#1d1d1d",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div style={{ color: "#fff", fontWeight: 700, marginBottom: "8px" }}>{loop.label}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {loop.variants.map((variant) => (
                        <div key={variant.id} style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() =>
                              addMusicTrack({
                                id: variant.id,
                                label: variant.label || loop.label,
                                src: variant.src,
                                volume: 1,
                              })
                            }
                            style={{
                              padding: "8px 10px",
                              borderRadius: "10px",
                              border: "1px solid rgba(255,255,255,0.16)",
                              background: "#2a2a2a",
                              color: "#fff",
                            }}
                          >
                            {variant.label}
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePreviewAudio(variant.id, variant.src)}
                            style={{
                              padding: "8px 10px",
                              borderRadius: "10px",
                              border: "1px solid rgba(255,255,255,0.16)",
                              background: previewingAudioId === variant.id ? "#ffb3d1" : "#c9b6ff",
                              color: "#000",
                            }}
                          >
                            {previewingAudioId === variant.id ? "⏸" : "▶"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </MobileAudioSheet>
      ) : null}
      {activeAudioSheet === "voice" ? (
        <MobileAudioSheet
          title="Record Voice"
          onClose={() => setActiveAudioSheet(null)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div
              style={{
                padding: "14px",
                borderRadius: "16px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ color: "rgba(255,255,255,0.72)", fontSize: "12px", fontWeight: 700 }}>
                Текст слайда
              </div>
              <div
                style={{
                  color: "#fff",
                  fontSize: "18px",
                  lineHeight: 1.45,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {activeSlide.text?.trim() || "Текст для озвучки пока не добавлен."}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (isRecording) {
                  stopVoiceRecording();
                } else {
                  void startVoiceRecording();
                }
              }}
              style={{
                ...mobileButtonStyle,
                background: isRecording ? "#ffb3d1" : "#98f0c5",
                color: "#000",
              }}
            >
              {isRecording ? "Stop Recording" : "Start Recording"}
            </button>

            {activeSlide.voiceUrl ? (
              <div
                style={{
                  padding: "14px",
                  borderRadius: "16px",
                  background: "linear-gradient(rgb(203 190 243), rgb(255 214 230))",
                  color: "#000",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                  <strong>Voice track</strong>
                  <button
                    type="button"
                    onClick={removeVoiceFromSlide}
                    style={{
                      border: "none",
                      background: "#ff6b6b",
                      color: "#fff",
                      borderRadius: "10px",
                      padding: "6px 10px",
                    }}
                  >
                    ✕
                  </button>
                </div>
                <audio
                  ref={voiceAudioRef}
                  src={activeSlide.voiceUrl}
                  controls
                  style={{ width: "100%" }}
                />
                <label style={{ fontSize: "13px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  Playback volume
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={voicePreviewVolume}
                    onChange={(e) => {
                      const nextVolume = Number(e.target.value);
                      setVoicePreviewVolume(nextVolume);
                      if (voiceAudioRef.current) {
                        voiceAudioRef.current.volume = nextVolume;
                      }
                    }}
                  />
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {enhanceVoiceRecording ? (
                    <button
                      type="button"
                      onClick={() => void runVoiceAction("enhance", enhanceVoiceRecording)}
                      style={getVoiceActionButtonStyle("enhance", "#8fdcff")}
                    >
                      {voiceActionState.enhance === "loading"
                        ? "Обрабатываем..."
                        : activeSlide.activeVoiceEffects?.enhance
                          ? "✓ Улучшено"
                          : "Улучшить"}
                    </button>
                  ) : null}
                  {makeVoiceLouder ? (
                    <button
                      type="button"
                      onClick={() => void runVoiceAction("louder", makeVoiceLouder)}
                      style={getVoiceActionButtonStyle("louder", "#98f0c5")}
                    >
                      {voiceActionState.louder === "loading"
                        ? "Обрабатываем..."
                        : activeSlide.activeVoiceEffects?.louder
                          ? "✓ Громче"
                          : "Громче"}
                    </button>
                  ) : null}
                  {makeChildVoice ? (
                    <button
                      type="button"
                      onClick={() => void runVoiceAction("child", makeChildVoice)}
                      style={getVoiceActionButtonStyle("child", "#c9b6ff")}
                    >
                      {voiceActionState.child === "loading"
                        ? "Обрабатываем..."
                        : activeSlide.activeVoiceEffects?.child
                          ? "✓ Детский"
                          : "Детский голос"}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div style={{ color: "#aaa", fontSize: "14px" }}>
                После записи здесь появится голосовая дорожка с управлением.
              </div>
            )}
          </div>
        </MobileAudioSheet>
      ) : null}
      {isPreviewSheetOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 150,
            background: "#000",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  aspectRatio: "9 / 16",
                  maxWidth: "100%",
                  position: "relative",
                }}
              >
                <StudioPreviewPlayer
                  ref={previewRef}
                  slides={project.slides}
                  musicEngineRef={audioEngineRef}
                  lang={lang}
                  onClose={() => setIsPreviewSheetOpen(false)}
                  isMobileFullscreen
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {isExportSheetOpen ? (
        <div
          ref={exportSheetRef}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 160,
            background: "#000",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {!isExportFallbackPlayerMode ? (
            <div
              style={{
                padding: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
              }}
            >
                <div>
                  <div style={{ color: "#fff", fontSize: "18px", fontWeight: 700 }}>Export</div>
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px" }}>{exportStatusText}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsExportSheetOpen(false);
                  resetExportUi();
                }}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "999px",
                  border: "none",
                  background: "#2a2a2a",
                  color: "#fff",
                  fontSize: "18px",
                }}
              >
                ×
              </button>
            </div>
          ) : null}

          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              alignItems: isExportFallbackPlayerMode ? "stretch" : "center",
              justifyContent: isExportFallbackPlayerMode ? "stretch" : "center",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {isExportFallbackPlayerMode ? (
              <>
                <button
                  type="button"
                  aria-label="Close fullscreen playback"
                  onClick={closeExportFallbackPlayer}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "72px",
                    height: "72px",
                    border: "none",
                    background: "transparent",
                    color: "transparent",
                    zIndex: 180,
                    padding: 0,
                  }}
                >
                  Close
                </button>
                {showExportFallbackHint ? (
                  <div
                    style={{
                      position: "absolute",
                      top: 20,
                      left: "50%",
                      transform: "translateX(-50%)",
                      zIndex: 181,
                      padding: "10px 14px",
                      borderRadius: "999px",
                      background: "rgba(17,17,17,0.86)",
                      color: "#fff",
                      fontSize: "12px",
                      fontWeight: 600,
                      lineHeight: 1.2,
                      whiteSpace: "nowrap",
                      pointerEvents: "none",
                    }}
                  >
                    Tap top-left corner to close
                  </div>
                ) : null}
              </>
            ) : null}
            <div
              style={{
                height: isExportFallbackPlayerMode ? "100dvh" : "100%",
                width: isExportFallbackPlayerMode ? "100vw" : "auto",
                aspectRatio: "9 / 16",
                maxWidth: isExportFallbackPlayerMode ? "none" : "100%",
                position: "relative",
                flexShrink: 0,
                overflow: "hidden",
              }}
            >
              <StudioPreviewPlayer
                ref={previewRef}
                slides={project.slides}
                musicEngineRef={audioEngineRef}
                lang={lang}
                onClose={() => {
                  if (isExportFallbackPlayerMode) {
                    closeExportFallbackPlayer();
                    return;
                  }

                  setIsExportSheetOpen(false);
                  resetExportUi();
                }}
                isMobileFullscreen
                loopPlayback={exportState !== "recording" && exportState !== "processing"}
                onPlaybackComplete={handleExportPlaybackComplete}
                resetSignal={exportResetSignal}
                showWatermark={exportState !== "idle"}
                showCloseButton={!isExportFallbackPlayerMode}
              />
            </div>
          </div>

          {!isExportFallbackPlayerMode ? (
            <div
              style={{
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.92) 18%, #000 100%)",
              }}
            >
            {(exportState === "recording" || exportState === "processing") ? (
              <>
                <div style={{ color: "#fff", fontSize: "14px", fontWeight: 600 }}>
                  {exportState === "processing"
                    ? "Preparing your video..."
                    : `Recording slide ${exportSlideProgress} of ${Math.max(1, project.slides.length)}`}
                </div>
                <div
                  style={{
                    width: "100%",
                    height: "8px",
                    borderRadius: "999px",
                    background: "rgba(255,255,255,0.12)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.round(exportProgress * 100)}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #ffb3d1, #c9b6ff)",
                      borderRadius: "999px",
                    }}
                  />
                </div>
                <div style={{ color: "rgba(255,255,255,0.68)", fontSize: "12px" }}>
                  Keep this page open while we export.
                </div>
              </>
            ) : null}

            {exportState === "idle" ? (
              <>
                <button
                  type="button"
                  onClick={() => void handleStartExport()}
                  style={{
                    ...mobileButtonStyle,
                    background: "#ffb3d1",
                    color: "#000",
                    fontWeight: 700,
                  }}
                >
                  {exportCapability === "direct-record" ? "Start export" : "Save to phone"}
                </button>
                {exportCapability === "direct-record" ? (
                  <div style={{ color: "rgba(255,255,255,0.68)", fontSize: "12px", lineHeight: 1.35 }}>
                    We’ll record your slideshow as it plays ✨ Works on most devices
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ color: "rgba(255,255,255,0.82)", fontSize: "12px", lineHeight: 1.35 }}>
                      Local save on this phone uses built-in screen recording.
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.56)", fontSize: "11px", lineHeight: 1.35 }}>
                      Nothing is uploaded. The slideshow stays on your device while you save it.
                    </div>
                  </div>
                )}
              </>
            ) : null}

            {exportState === "success" ? (
              <>
                <div style={{ color: "#fff", fontSize: "18px", fontWeight: 700 }}>
                  Your video is ready 🎉
                </div>
                {exportBlobUrl ? (
                  <video
                    src={exportBlobUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{
                      width: "100%",
                      maxHeight: "140px",
                      objectFit: "contain",
                      borderRadius: "16px",
                      background: "#111",
                    }}
                  />
                ) : null}
                {exportedWithoutSound ? (
                  <div style={{ color: "rgba(255,255,255,0.72)", fontSize: "12px" }}>
                    Exported without sound on this device
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => void handleShareExportedVideo()}
                  style={{
                    ...mobileButtonStyle,
                    background: "#ffb3d1",
                    color: "#000",
                    fontWeight: 700,
                  }}
                >
                  Share
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveExportedVideo()}
                  style={{
                    ...mobileButtonStyle,
                    background: "#c9b6ff",
                    color: "#000",
                  }}
                >
                  Save
                </button>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard?.writeText(exportCaption)}
                    style={{ ...mobileButtonStyle, flex: 1 }}
                  >
                    Copy caption
                  </button>
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard?.writeText(exportCredits)}
                    style={{ ...mobileButtonStyle, flex: 1 }}
                  >
                    Copy credits
                  </button>
                </div>
              </>
            ) : null}

            {exportState === "fallback-screen-record" ? (
              <>
                <div style={{ color: "#fff", fontSize: "18px", fontWeight: 700 }}>
                  Record using your device
                </div>
                <div style={{ color: "rgba(255,255,255,0.78)", fontSize: "13px", lineHeight: 1.45 }}>
                  1. Start screen recording on your phone
                  <br />
                  2. Play the slideshow in fullscreen
                </div>
                <div style={{ color: "rgba(255,255,255,0.56)", fontSize: "11px", lineHeight: 1.4 }}>
                  This is the most reliable local-save path on mobile browsers right now.
                </div>
                <button
                  type="button"
                  onClick={openExportFallbackPlayer}
                  style={{
                    ...mobileButtonStyle,
                    background: "#8fdcff",
                    color: "#000",
                  }}
                >
                  Open fullscreen player
                </button>
              </>
            ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
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
      const legacyNavigator = navigator as Navigator & {
        getUserMedia?: (
          constraints: MediaStreamConstraints,
          successCallback: (stream: MediaStream) => void,
          errorCallback: (error: unknown) => void,
        ) => void;
        webkitGetUserMedia?: (
          constraints: MediaStreamConstraints,
          successCallback: (stream: MediaStream) => void,
          errorCallback: (error: unknown) => void,
        ) => void;
        mozGetUserMedia?: (
          constraints: MediaStreamConstraints,
          successCallback: (stream: MediaStream) => void,
          errorCallback: (error: unknown) => void,
        ) => void;
      };

      const legacyGetUserMedia = typeof navigator !== "undefined"
        ? (
            legacyNavigator.getUserMedia?.bind(navigator) ??
            legacyNavigator.webkitGetUserMedia?.bind(navigator) ??
            legacyNavigator.mozGetUserMedia?.bind(navigator)
          )
        : undefined;

      const getUserMedia = navigator.mediaDevices?.getUserMedia
        ? (constraints: MediaStreamConstraints) => navigator.mediaDevices.getUserMedia(constraints)
        : legacyGetUserMedia
          ? (constraints: MediaStreamConstraints) =>
              new Promise<MediaStream>((resolve, reject) => {
                legacyGetUserMedia(constraints, resolve, reject);
              })
          : null;

      if (!getUserMedia) {
        const isSecureOrigin = typeof window !== "undefined" ? window.isSecureContext : false;
        const message = isSecureOrigin
          ? "Voice recording is not supported in this browser."
          : "Voice recording needs a secure origin (HTTPS or localhost).";
        console.error(message);
        if (typeof window !== "undefined") {
          window.alert(message);
        }
        return;
      }

      const rawStream = await getUserMedia({
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
              ? {
                  ...s,
                  voiceUrl: dataUrl,
                  voiceDuration: duration,
                  voiceBaseUrl: undefined,
                  voiceBaseDuration: undefined,
                  activeVoiceEffects: undefined,
                }
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

  async function persistVoiceData(
    nextVoiceUrl: string,
    nextDuration: number,
    options?: {
      voiceBaseUrl?: string;
      voiceBaseDuration?: number;
      activeVoiceEffects?: Partial<Record<VoiceActionKey, boolean>>;
    },
  ) {
    setProject((prev) => {
      const updatedSlides = prev.slides.map((s, i) =>
        i === activeSlideIndex
          ? {
              ...s,
              voiceUrl: nextVoiceUrl,
              voiceDuration: nextDuration,
              voiceBaseUrl: options?.voiceBaseUrl,
              voiceBaseDuration: options?.voiceBaseDuration,
              activeVoiceEffects: options?.activeVoiceEffects,
            }
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

  function hasAnyVoiceEffects(effects?: Partial<Record<VoiceActionKey, boolean>>) {
    return Boolean(effects?.enhance || effects?.louder || effects?.child);
  }

  async function processCurrentVoice(options?: {
    sourceVoiceUrl?: string;
    sourceVoiceDuration?: number;
    activeVoiceEffects?: Partial<Record<VoiceActionKey, boolean>>;
  }) {
    if (!activeSlide.voiceUrl) return;

    const {
      sourceVoiceUrl,
      sourceVoiceDuration,
      activeVoiceEffects,
    } = options ?? {};

    try {
      const originalVoiceUrl = activeSlide.voiceBaseUrl ?? activeSlide.voiceUrl;
      const originalVoiceDuration = activeSlide.voiceBaseDuration ?? activeSlide.voiceDuration;
      const inputVoiceUrl = sourceVoiceUrl ?? originalVoiceUrl;
      const nextEffects = activeVoiceEffects ?? activeSlide.activeVoiceEffects ?? {};
      const arrayBuffer = await readVoiceUrlToArrayBuffer(inputVoiceUrl);

      const audioCtx = new AudioContext({ sampleRate: 48000 });
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      let processedBuffer = audioBuffer;

      if (nextEffects.child) {
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
        processedBuffer = pitchedBuffer;
      }

      if (nextEffects.enhance) {
        processedBuffer = buildProcessedVoiceBuffer(processedBuffer);
      } else if (nextEffects.child) {
        processedBuffer = buildProcessedVoiceBuffer(processedBuffer, {
          lightNoiseReduction: true,
        });
      }

      if (nextEffects.louder) {
        const outputGain = 1.35;
        for (let channel = 0; channel < processedBuffer.numberOfChannels; channel += 1) {
          const samples = processedBuffer.getChannelData(channel);
          for (let i = 0; i < samples.length; i += 1) {
            samples[i] *= outputGain;
          }
          applyLimiter(samples);
        }
      }

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

      await persistVoiceData(dataUrl, duration, {
        voiceBaseUrl: originalVoiceUrl,
        voiceBaseDuration: originalVoiceDuration ?? sourceVoiceDuration ?? duration,
        activeVoiceEffects: hasAnyVoiceEffects(nextEffects) ? nextEffects : undefined,
      });
      audioCtx.close();
    } catch (err) {
      console.error("Enhance voice failed", err);
    }
  }

  async function restoreBaseVoice() {
    if (!activeSlide.voiceBaseUrl) return;

    await persistVoiceData(
      activeSlide.voiceBaseUrl,
      activeSlide.voiceBaseDuration ?? activeSlide.voiceDuration ?? 0,
      {
        voiceBaseUrl: undefined,
        voiceBaseDuration: undefined,
        activeVoiceEffects: undefined,
      },
    );
  }

  async function toggleVoiceEffect(effect: VoiceActionKey) {
    if (!activeSlide.voiceUrl) return;

    const currentEffects = activeSlide.activeVoiceEffects ?? {};
    const nextEffects: Partial<Record<VoiceActionKey, boolean>> = {
      ...currentEffects,
      [effect]: !currentEffects[effect],
    };

    if (!hasAnyVoiceEffects(nextEffects) && activeSlide.voiceBaseUrl) {
      await restoreBaseVoice();
      return;
    }

    await processCurrentVoice({
      sourceVoiceUrl: activeSlide.voiceBaseUrl ?? activeSlide.voiceUrl,
      sourceVoiceDuration: activeSlide.voiceBaseDuration ?? activeSlide.voiceDuration,
      activeVoiceEffects: nextEffects,
    });
  }

  async function enhanceVoiceRecording() {
    await toggleVoiceEffect("enhance");
  }

  async function makeVoiceLouder() {
    await toggleVoiceEffect("louder");
  }

  async function makeChildVoice() {
    await toggleVoiceEffect("child");
  }

  function removeVoiceFromSlide() {
    if (activeSlide.voiceUrl && activeSlide.voiceUrl.startsWith("blob:")) {
      URL.revokeObjectURL(activeSlide.voiceUrl);
    }

    updateSlide({
      ...activeSlide,
      voiceUrl: undefined,
      voiceDuration: undefined,
      voiceBaseUrl: undefined,
      voiceBaseDuration: undefined,
      activeVoiceEffects: undefined,
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
        const normalizedSaved = {
          ...saved,
          fontFamily: resolveFontFamily(saved.fontFamily),
          slides: saved.slides.map((slide: StudioSlide) => ({
            ...slide,
            fontFamily: resolveFontFamily(slide.fontFamily),
          })),
        };

        projectRef.current = normalizedSaved;
        lastSavedSnapshotRef.current = JSON.stringify(normalizedSaved);
        setProject(normalizedSaved);
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
