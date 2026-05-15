"use client";

import Image from "next/image";
import { useState, useEffect, useRef, useCallback, useMemo, type Dispatch, type RefObject, type SetStateAction } from "react";
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
import { useStudioViewportMode } from "@/hooks/useResponsiveViewport";
import { fetchParrotMusicStylesWithOptions } from "@/lib/parrots/client";
import { convertWebmToMp4, preloadFFmpeg } from "@/lib/cropAndConvert";
import { createStudioSticker } from "@/lib/studioStickers";
import {
  getHardcodedParrotStyleRecords,
  type ParrotStyleRecord,
} from "@/lib/parrots/catalog";

const DEFAULT_PROJECT_ID = "current-studio-project";
const STUDIO_EXPORT_IMAGE_LOAD_TIMEOUT_MS = 8_000;
const STUDIO_EXPORT_VIDEO_LOAD_TIMEOUT_MS = 10_000;
const STUDIO_EXPORT_AUDIO_LOAD_TIMEOUT_MS = 8_000;
const STUDIO_EXPORT_FIRST_FRAME_TIMEOUT_MS = 12_000;
const STUDIO_EXPORT_RECORDER_START_TIMEOUT_MS = 4_000;
const STUDIO_EXPORT_START_SKIP_MS = 180;

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

function createInitialProject(projectId: string): StudioProject {
  return {
    id: projectId,
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
  projectId?: string;
  expectedStudioType?: "cats";
  initialSlides?: Array<{
    text: string;
    image?: string;
    mediaUrl?: string;
    mediaType?: "image" | "video";
    sourceMediaUrl?: string;
    sourceMediaType?: "gif" | "image" | "video";
    mediaMimeType?: string;
    mediaNormalized?: boolean;
    mediaFit?: "cover" | "contain";
    mediaPosition?: "top" | "center" | "bottom";
    textPosition?: "top" | "center" | "bottom";
    textAlign?: "left" | "center" | "right";
    textBgEnabled?: boolean;
    textBgColor?: string;
    textBgOpacity?: number;
    introLayout?: "book-meta";
    voiceUrl?: string;
    voiceDuration?: number;
    voiceBaseUrl?: string;
    voiceBaseDuration?: number;
    activeVoiceEffects?: Partial<Record<VoiceActionKey, boolean>>;
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
  isSaved: boolean;
  hasUnsavedChanges: boolean;
  lastSavedAt: number | null;
  confirmExitMessage: string;
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
  stopVoiceRecording: (options?: { releaseAfterStop?: boolean }) => void;
  prepareVoiceRecording: () => Promise<void>;
  releaseVoiceRecording: () => void;
  removeVoiceFromSlide: () => void;
  enhanceVoiceRecording: () => Promise<void>;
  makeVoiceLouder: () => Promise<void>;
  makeChildVoice: () => Promise<void>;
  updateSlide: (
    updatedSlide: StudioSlide,
    options?: { commitHistory?: boolean },
  ) => void;
  deleteAll: () => void;
  undo: () => void;
  redo: () => void;
  router: ReturnType<typeof useRouter>;
  updateActiveSlide: (
    updater: (slide: StudioSlide) => StudioSlide,
    slideIndex?: number,
  ) => void;
  activeStickerId: string | null;
  setActiveStickerId: Dispatch<SetStateAction<string | null>>;
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
type MobileExportState = "idle" | "recording" | "processing" | "success" | "fallback-screen-record";
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
  return getSupportedRecorderMimeTypes()?.[0] ?? "";
}

function getSupportedRecorderMimeTypes() {
  if (typeof MediaRecorder === "undefined") return null;

  const candidates = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4;codecs=h264,aac",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];

  return candidates.filter((mimeType) => MediaRecorder.isTypeSupported(mimeType));
}

function detectMobileExportCapability(previewNode: HTMLDivElement | null): MobileExportCapability {
  const mimeType = detectSupportedRecorderMimeType();
  const canCaptureCanvas = canRecordStudioCanvas();
  const canCapturePreview =
    canCaptureCanvas ||
    (!!previewNode &&
      typeof (previewNode as HTMLDivElement & {
        captureStream?: (frameRate?: number) => MediaStream;
      }).captureStream === "function");

  if (mimeType && canCapturePreview) {
    return "direct-record";
  }

  return "guided-record";
}

function canRecordStudioCanvas() {
  const mimeType = detectSupportedRecorderMimeType();
  if (!mimeType || typeof MediaRecorder === "undefined" || typeof document === "undefined") {
    return false;
  }

  const canvas = document.createElement("canvas") as HTMLCanvasElement & {
    captureStream?: (frameRate?: number) => MediaStream;
  };

  return typeof canvas.captureStream === "function";
}

function isMp4Blob(blob: Blob, mimeType: string) {
  return blob.type.includes("mp4") || mimeType.includes("mp4");
}

function isAndroidBrowser() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

function parseHexColor(hex: string, fallback: [number, number, number] = [0, 0, 0]) {
  const cleaned = hex.replace("#", "").trim();
  const normalized = cleaned.length === 3
    ? cleaned.split("").map((char) => `${char}${char}`).join("")
    : cleaned.padEnd(6, "0").slice(0, 6);
  const value = Number.parseInt(normalized, 16);

  if (Number.isNaN(value)) {
    return fallback;
  }

  return [
    (value >> 16) & 255,
    (value >> 8) & 255,
    value & 255,
  ] as [number, number, number];
}

function rgbaFromHex(hex: string, opacity: number) {
  const [r, g, b] = parseHexColor(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(opacity, 0, 1)})`;
}

function getSlideDurationMs(slide: StudioSlide) {
  return slide.voiceDuration && slide.voiceDuration > 0 ? slide.voiceDuration * 1000 : 3000;
}

function getSlideForElapsed(project: StudioProject, elapsedMs: number) {
  let cursor = 0;

  for (let index = 0; index < project.slides.length; index += 1) {
    const slide = project.slides[index];
    const duration = getSlideDurationMs(slide);

    if (elapsedMs < cursor + duration || index === project.slides.length - 1) {
      return { slide, index };
    }

    cursor += duration;
  }

  return { slide: project.slides[0], index: 0 };
}

function createImageLoader() {
  const cache = new Map<string, Promise<HTMLImageElement | null>>();

  return (src: string) => {
    if (!cache.has(src)) {
      cache.set(src, new Promise((resolve) => {
        const image = new window.Image();
        let settled = false;
        const finish = (value: HTMLImageElement | null) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeoutId);
          resolve(value);
        };
        const timeoutId = window.setTimeout(() => {
          finish(null);
        }, STUDIO_EXPORT_IMAGE_LOAD_TIMEOUT_MS);
        image.crossOrigin = "anonymous";
        image.decoding = "async";
        image.onload = () => finish(image);
        image.onerror = () => finish(null);
        image.src = src;
      }));
    }

    return cache.get(src)!;
  };
}

function createVideoLoader() {
  const cache = new Map<string, Promise<HTMLVideoElement | null>>();

  return (src: string) => {
    if (!cache.has(src)) {
      cache.set(src, new Promise((resolve) => {
        const video = document.createElement("video");
        let settled = false;
        const finish = (value: HTMLVideoElement | null) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeoutId);
          resolve(value);
        };
        const timeoutId = window.setTimeout(() => {
          finish(video.readyState >= 2 ? video : null);
        }, STUDIO_EXPORT_VIDEO_LOAD_TIMEOUT_MS);
        video.crossOrigin = "anonymous";
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = "auto";
        video.onloadeddata = () => finish(video);
        video.oncanplay = () => finish(video);
        video.onerror = () => finish(null);
        video.src = src;
        void video.play().catch(() => {});
      }));
    }

    return cache.get(src)!;
  };
}

function decodeAudioBuffer(audioContext: AudioContext, src: string) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, STUDIO_EXPORT_AUDIO_LOAD_TIMEOUT_MS);

  return fetch(src, { signal: controller.signal })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load audio: ${src}`);
      }

      return response.arrayBuffer();
    })
    .then((buffer) => audioContext.decodeAudioData(buffer))
    .catch(() => null)
    .finally(() => {
      window.clearTimeout(timeoutId);
    });
}

async function createStudioExportAudioMix(project: StudioProject, durationMs: number) {
  const AudioContextCtor = window.AudioContext || (window as typeof window & {
    webkitAudioContext?: typeof AudioContext;
  }).webkitAudioContext;

  if (!AudioContextCtor) {
    return {
      stream: null as MediaStream | null,
      start: () => {},
      cleanup: () => {},
    };
  }

  const audioContext = new AudioContextCtor({ sampleRate: 48000 });
  const destination = audioContext.createMediaStreamDestination();
  const scheduledSources: AudioBufferSourceNode[] = [];
  const trackBuffers = await Promise.all(
    project.musicTracks.map(async (track) => ({
      track,
      buffer: await decodeAudioBuffer(audioContext, track.src),
    })),
  );
  const voiceBuffers = await Promise.all(
    project.slides.map(async (slide) => ({
      slide,
      buffer: slide.voiceUrl ? await decodeAudioBuffer(audioContext, slide.voiceUrl) : null,
    })),
  );

  const start = () => {
    void audioContext.resume().catch(() => {});
    const startAt = audioContext.currentTime + 0.08;
    const stopAt = startAt + durationMs / 1000 + 0.2;

    for (const { track, buffer } of trackBuffers) {
      if (!buffer) continue;

      const source = audioContext.createBufferSource();
      const gain = audioContext.createGain();
      source.buffer = buffer;
      source.loop = true;
      gain.gain.value = clamp(track.volume ?? 1, 0, 1);
      source.connect(gain);
      gain.connect(destination);
      source.start(startAt);
      source.stop(stopAt);
      scheduledSources.push(source);
    }

    let cursorMs = 0;
    voiceBuffers.forEach(({ slide, buffer }) => {
      if (!buffer) {
        cursorMs += getSlideDurationMs(slide);
        return;
      }

      const source = audioContext.createBufferSource();
      const gain = audioContext.createGain();
      source.buffer = buffer;
      gain.gain.value = 1;
      source.connect(gain);
      gain.connect(destination);
      source.start(startAt + cursorMs / 1000);
      source.stop(Math.min(stopAt, startAt + cursorMs / 1000 + buffer.duration + 0.1));
      scheduledSources.push(source);
      cursorMs += getSlideDurationMs(slide);
    });
  };

  return {
    stream: destination.stream,
    start,
    cleanup: () => {
      for (const source of scheduledSources) {
        try {
          source.stop();
        } catch {}
        try {
          source.disconnect();
        } catch {}
      }

      destination.stream.getTracks().forEach((track) => track.stop());
      void audioContext.close().catch(() => {});
    },
  };
}

function drawContainedMedia(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  slide: StudioSlide,
  canvasWidth: number,
  canvasHeight: number,
) {
  const fitMode = slide.mediaFit ?? "cover";
  const safeSourceWidth = Math.max(1, sourceWidth);
  const safeSourceHeight = Math.max(1, sourceHeight);
  const sourceRatio = safeSourceWidth / safeSourceHeight;
  const canvasRatio = canvasWidth / canvasHeight;
  let drawWidth = canvasWidth;
  let drawHeight = canvasHeight;
  let drawX = 0;
  let drawY = 0;

  if (fitMode === "cover") {
    if (sourceRatio > canvasRatio) {
      drawHeight = canvasHeight;
      drawWidth = canvasHeight * sourceRatio;
      drawX = (canvasWidth - drawWidth) / 2;
    } else {
      drawWidth = canvasWidth;
      drawHeight = canvasWidth / sourceRatio;
      drawY = (canvasHeight - drawHeight) / 2;
    }
  } else if (sourceRatio > canvasRatio) {
    drawWidth = canvasWidth;
    drawHeight = canvasWidth / sourceRatio;
    drawY = (canvasHeight - drawHeight) / 2;
  } else {
    drawHeight = canvasHeight;
    drawWidth = canvasHeight * sourceRatio;
    drawX = (canvasWidth - drawWidth) / 2;
  }

  if (fitMode === "cover") {
    if ((slide.mediaPosition ?? "center") === "top") {
      drawY = 0;
    } else if ((slide.mediaPosition ?? "center") === "bottom") {
      drawY = canvasHeight - drawHeight;
    }
  }

  const scale = slide.mediaScale ?? 1;
  context.save();
  context.translate(canvasWidth / 2 + (slide.mediaOffsetX ?? 0) * 3, canvasHeight / 2 + (slide.mediaOffsetY ?? 0) * 3);
  context.scale(scale, scale);
  context.translate(-canvasWidth / 2, -canvasHeight / 2);
  context.drawImage(source, drawX, drawY, drawWidth, drawHeight);
  context.restore();
}

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth || !currentLine) {
      currentLine = candidate;
      return;
    }

    lines.push(currentLine);
    currentLine = word;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

async function recordStudioProjectCanvas(
  project: StudioProject,
  mimeType: string,
  onProgress: (progress: number, slideIndex: number) => void,
  options: { includeAudio?: boolean } = {},
) {
  const includeAudio = options.includeAudio !== false;
  const canvas = document.createElement("canvas") as HTMLCanvasElement & {
    captureStream?: (frameRate?: number) => MediaStream;
  };
  canvas.width = 720;
  canvas.height = 1280;

  if (typeof canvas.captureStream !== "function") {
    throw new Error("Canvas recording is not supported");
  }

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context is not available");
  }

  if (document.fonts?.ready) {
    await withTimeout(document.fonts.ready, 3_000, "Font loading timed out").catch(() => {});
  }

  const loadImage = createImageLoader();
  const loadVideo = createVideoLoader();
  const watermarkImagePromise = loadImage("/icons/watermark.webp");
  const totalDurationMs = getProjectPreviewDurationMs(project);
  const watermarkImage = await watermarkImagePromise;
  await Promise.allSettled([
    watermarkImagePromise,
    ...project.slides.flatMap((slide) => {
      const preloaders: Array<Promise<unknown>> = [];

      if (slide.mediaUrl) {
        preloaders.push(slide.mediaType === "video" ? loadVideo(slide.mediaUrl) : loadImage(slide.mediaUrl));
      }

      (slide.stickers ?? []).forEach((sticker) => {
        if (sticker.visible !== false) {
          preloaders.push(sticker.animationType === "video" ? loadVideo(sticker.sourceUrl) : loadImage(sticker.sourceUrl));
        }
      });

      return preloaders;
    }),
  ]);

  const audioMix = includeAudio
    ? await createStudioExportAudioMix(project, totalDurationMs)
    : {
        stream: null as MediaStream | null,
        start: () => {},
        cleanup: () => {},
      };
  const stream = canvas.captureStream(30);
  audioMix.stream?.getAudioTracks().forEach((track) => stream.addTrack(track));
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 4_000_000 } : undefined);
  const chunks: BlobPart[] = [];
  let animationFrameId = 0;
  let startedAt = 0;

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  const drawFrame = async (elapsedMs: number) => {
    const { slide, index } = getSlideForElapsed(project, elapsedMs);
    context.fillStyle = slide.bgColor || "#000";
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (slide.mediaUrl) {
      if (slide.mediaType === "video") {
        const video = await loadVideo(slide.mediaUrl);
        if (video && video.readyState >= 2) {
          drawContainedMedia(context, video, video.videoWidth, video.videoHeight, slide, canvas.width, canvas.height);
        }
      } else {
        const image = await loadImage(slide.mediaUrl);
        if (image) {
          drawContainedMedia(context, image, image.naturalWidth, image.naturalHeight, slide, canvas.width, canvas.height);
        }
      }
    }

    const stickers = [...(slide.stickers ?? [])]
      .filter((sticker) => sticker.visible !== false)
      .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

    for (const sticker of stickers) {
      const source = sticker.animationType === "video"
        ? await loadVideo(sticker.sourceUrl)
        : await loadImage(sticker.sourceUrl);
      if (!source) continue;

      const x = (sticker.x / 100) * canvas.width;
      const y = (sticker.y / 100) * canvas.height;
      const width = (sticker.width / 100) * canvas.width;
      const height = (sticker.height / 100) * canvas.height;

      context.save();
      context.globalAlpha = sticker.opacity ?? 1;
      context.translate(x, y);
      context.rotate(((sticker.rotation ?? 0) * Math.PI) / 180);
      context.drawImage(source, -width / 2, -height / 2, width, height);
      context.restore();
    }

    if (slide.text?.trim()) {
      const fontSize = (slide.fontSize || 28) * 2.35;
      const fontFamily = resolveFontFamily(slide.fontFamily);
      const lineHeight = fontSize * 1.12;
      const maxTextWidth = canvas.width * 0.82;
      context.font = `${slide.fontStyle ?? "normal"} ${slide.fontWeight ?? 700} ${fontSize}px ${fontFamily}`;
      context.textAlign = slide.textAlign ?? "center";
      context.textBaseline = "middle";

      const lines = slide.text
        .split("\n")
        .flatMap((line) => wrapCanvasText(context, line, maxTextWidth));
      const blockHeight = Math.max(lineHeight, lines.length * lineHeight);
      const baseY = slide.textPosition === "top"
        ? 190
        : slide.textPosition === "bottom"
          ? canvas.height - 150 - blockHeight / 2
          : canvas.height * 0.56;
      const x = canvas.width / 2 + (slide.textOffsetX ?? 0) * 2.35;
      const y = baseY + (slide.textOffsetY ?? 0) * 2.35;

      if (slide.textBgEnabled) {
        context.fillStyle = rgbaFromHex(slide.textBgColor ?? "#000", slide.textBgOpacity ?? 0.5);
        context.beginPath();
        context.roundRect(
          canvas.width * 0.05,
          y - blockHeight / 2 - 18,
          canvas.width * 0.9,
          blockHeight + 36,
          26,
        );
        context.fill();
      }

      context.fillStyle = slide.textColor || "#fff";
      lines.forEach((line, lineIndex) => {
        context.fillText(line, x, y - blockHeight / 2 + lineHeight * lineIndex + lineHeight / 2, maxTextWidth);
      });
    }

    if (watermarkImage) {
      const watermarkSize = 112;
      context.save();
      context.globalAlpha = 0.82;
      context.drawImage(
        watermarkImage,
        canvas.width - watermarkSize - 18,
        18,
        watermarkSize,
        watermarkSize,
      );
      context.restore();
    }

    onProgress(Math.min(0.98, elapsedMs / Math.max(1, totalDurationMs)), index + 1);
  };

  await withTimeout(
    drawFrame(0),
    STUDIO_EXPORT_FIRST_FRAME_TIMEOUT_MS,
    "First export frame timed out",
  );

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;

      if (recorder.state === "recording") {
        resolve();
        return;
      }

      reject(new Error("Canvas recording start timed out"));
    }, STUDIO_EXPORT_RECORDER_START_TIMEOUT_MS);

    recorder.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      reject(new Error("Canvas recording failed"));
    };
    recorder.onstart = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      resolve();
    };

    try {
      recorder.start(250);
    } catch (error) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      reject(error);
    }
  });

  await new Promise<void>((resolve) => {
    startedAt = performance.now() - STUDIO_EXPORT_START_SKIP_MS;
    audioMix.start();

    const tick = () => {
      const elapsedMs = performance.now() - startedAt;
      void drawFrame(elapsedMs);

      if (elapsedMs >= totalDurationMs) {
        resolve();
        return;
      }

      animationFrameId = window.requestAnimationFrame(tick);
    };

    animationFrameId = window.requestAnimationFrame(tick);
  });

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;

      if (chunks.length > 0) {
        resolve();
        return;
      }

      reject(new Error("Canvas recording stopped without data"));
    }, 8_000);

    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      resolve();
    };

    recorder.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      reject(new Error("Canvas recording stopped with an error"));
    };
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    recorder.onstop = finish;

    try {
      recorder.requestData();
    } catch {}

    recorder.stop();
  });

  if (animationFrameId) {
    window.cancelAnimationFrame(animationFrameId);
  }
  stream.getTracks().forEach((track) => track.stop());
  audioMix.cleanup();

  if (!chunks.length) {
    throw new Error("Canvas recording produced an empty file");
  }

  return new Blob(chunks, { type: mimeType || "video/webm" });
}

function areStudioTracksEqual(a: StudioProject["musicTracks"], b: StudioProject["musicTracks"]) {
  if (a.length !== b.length) return false;

  return a.every((track, index) => {
    const other = b[index];
    return (
      other &&
      track.id === other.id &&
      track.label === other.label &&
      track.src === other.src &&
      track.volume === other.volume
    );
  });
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
  activeStickerId,
  setActiveStickerId,
}: StudioLayoutProps) {
  const activeSticker = activeSlide.stickers?.find((sticker) => sticker.id === activeStickerId) ?? null;

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
              <SlideCanvas9x16
                slide={activeSlide}
                lang={lang}
                onUpdateSlide={updateSlide}
                activeStickerId={activeStickerId}
                onActiveStickerChange={setActiveStickerId}
              />
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
              activeStickerOpacity={activeSticker?.opacity}
              onChangeActiveStickerOpacity={(opacity) => {
                if (!activeSticker) return;
                updateSlide({
                  ...activeSlide,
                  stickers: (activeSlide.stickers ?? []).map((sticker) =>
                    sticker.id === activeSticker.id
                      ? { ...sticker, opacity }
                      : sticker,
                  ),
                });
              }}
            />
          </div>
        </div>
      </div>
      <MediaPickerModal
        lang={lang}
        isOpen={isMediaOpen}
        onClose={() => setIsMediaOpen(false)}
        onSelect={({
          url,
          mediaType,
          sourceUrl,
          sourceMediaType,
          mediaMimeType,
          mediaNormalized,
          previewUrl,
          animationType,
          source,
          tags,
        }) => {
          const normalizedUrl = toStudioMediaUrl(url) ?? url;
          if (mediaType === "sticker") {
            const nextSticker = createStudioSticker(normalizedUrl, {
              previewUrl,
              animationType,
              source,
              tags,
            });
            updateActiveSlide((slide) => ({
              ...slide,
              stickers: [
                ...(slide.stickers ?? []),
                {
                  ...nextSticker,
                  zIndex: (slide.stickers ?? []).length + 1,
                },
              ],
            }));
            setActiveStickerId(nextSticker.id);
            setIsMediaOpen(false);
            return;
          }

          updateActiveSlide((slide) => ({
            ...slide,
            mediaUrl: normalizedUrl,
            mediaType,
            sourceMediaUrl: sourceUrl,
            sourceMediaType,
            mediaMimeType,
            mediaNormalized,
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
  hasUnsavedChanges,
  confirmExitMessage,
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
  prepareVoiceRecording,
  releaseVoiceRecording,
  updateSlide,
  deleteAll,
  undo,
  redo,
  router,
  audioEngineRef,
  activeStickerId,
  setActiveStickerId,
}: StudioLayoutProps) {
  const studioViewport = useStudioViewportMode();
  const isTabletStudio = studioViewport.isTablet;
  const isTabletLandscape = studioViewport.isTablet && studioViewport.orientation === "landscape";
  const t = dictionaries[lang].cats.studio;
  const exportText = t.exportSheet;
  const hasPushedHistoryRef = useRef(false);
  const onClose = useCallback(() => {
    void router.push(
      {
        pathname: "/cats",
        query: buildLocalizedQuery(lang),
      },
      undefined,
      { locale: lang },
    );
  }, [lang, router]);
  const requestClose = () => {
    if (hasUnsavedChanges) {
      const shouldLeave = window.confirm(confirmExitMessage);
      if (!shouldLeave) return;
    }

    onClose();
  };
  const [mode, setMode] = useState<"slides" | "text" | "media" | "audio" | "settings" | null>("slides");
  const [activePicker, setActivePicker] = useState<MobilePickerTarget>(null);
  const [activeAudioSheet, setActiveAudioSheet] = useState<"music" | "voice" | null>(null);
  const [isPreviewSheetOpen, setIsPreviewSheetOpen] = useState(false);
  const [isExportSheetOpen, setIsExportSheetOpen] = useState(false);
  const [exportState, setExportState] = useState<MobileExportState>("idle");
  const [exportStatusText, setExportStatusText] = useState(exportText.idle);
  const [exportBlobUrl, setExportBlobUrl] = useState<string | null>(null);
  const [exportBlob, setExportBlob] = useState<Blob | null>(null);
  const [exportResetSignal, setExportResetSignal] = useState(0);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportSlideProgress, setExportSlideProgress] = useState(1);
  const [exportedWithoutSound, setExportedWithoutSound] = useState(false);
  const [exportShareStatusText, setExportShareStatusText] = useState<string | null>(null);
  const [isExportFallbackPlayerMode, setIsExportFallbackPlayerMode] = useState(false);
  const [showExportFallbackHint, setShowExportFallbackHint] = useState(false);
  const [isExportFallbackPlaybackStarted, setIsExportFallbackPlaybackStarted] = useState(false);
  const [exportCapability, setExportCapability] = useState<MobileExportCapability>("checking");
  const [slideTransitionDirection, setSlideTransitionDirection] = useState<"left" | "right" | null>(null);
  const fallbackMusicPresets = useMemo(() => getHardcodedParrotStyleRecords(lang), [lang]);
  const [musicPresets, setMusicPresets] = useState<ParrotStyleRecord[]>(fallbackMusicPresets);
  const [selectedMusicPresetId, setSelectedMusicPresetId] = useState<string | null>(fallbackMusicPresets[0]?.id ?? null);
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
  const slideSwipeRef = useRef<{ startX: number; startY: number } | null>(null);
  const previousSlideIndexRef = useRef(activeSlideIndex);
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
  const mobileHintCardStyle = {
    padding: "12px",
    borderRadius: "14px",
    background: "rgba(152, 240, 197, 0.16)",
    border: "1px solid rgba(152, 240, 197, 0.42)",
    color: "#dffff0",
    fontSize: "12px",
    lineHeight: 1.45,
  } satisfies React.CSSProperties;
  const exportBodyTextStyle = {
    color: "rgba(255,255,255,0.88)",
    fontSize: isTabletStudio ? "17px" : "13px",
    lineHeight: 1.42,
    fontWeight: 650,
  } satisfies React.CSSProperties;
  const exportMutedTextStyle = {
    color: "rgba(255,255,255,0.74)",
    fontSize: isTabletStudio ? "15px" : "12px",
    lineHeight: 1.42,
  } satisfies React.CSSProperties;
  useEffect(() => {
    setMusicPresets(fallbackMusicPresets);
  }, [fallbackMusicPresets]);

  useEffect(() => {
    let cancelled = false;

    const loadMusicPresets = async () => {
      try {
        const loaded = await fetchParrotMusicStylesWithOptions(lang, { rawTitles: true });
        if (!cancelled && loaded.length > 0) {
          setMusicPresets(loaded);
        }
      } catch (error) {
        console.warn("[studio/root] failed to load DB music styles; using fallback", error);
      }
    };

    void loadMusicPresets();

    return () => {
      cancelled = true;
    };
  }, [lang]);

  useEffect(() => {
    if (musicPresets.length === 0) {
      setSelectedMusicPresetId(null);
      return;
    }

    if (!selectedMusicPresetId || !musicPresets.some((preset) => preset.id === selectedMusicPresetId)) {
      setSelectedMusicPresetId(musicPresets[0].id);
    }
  }, [musicPresets, selectedMusicPresetId]);

  const selectedMusicPreset = musicPresets.find((preset) => preset.id === selectedMusicPresetId) ?? null;
  const activeSticker = activeSlide.stickers?.find((sticker) => sticker.id === activeStickerId) ?? null;
  const exportCaption = "Made with LapLapLa Cat Studio";
  const exportCredits = "Some media may be sourced from GIPHY and Pexels. Created with LapLapLa Cat Studio.";

  useEffect(() => {
    if (activeAudioSheet !== "voice") return;

    void prepareVoiceRecording();
  }, [activeAudioSheet, prepareVoiceRecording]);

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

    preloadFFmpeg().catch(() => {});

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
    const previousIndex = previousSlideIndexRef.current;
    if (previousIndex === activeSlideIndex) return;

    setSlideTransitionDirection(activeSlideIndex > previousIndex ? "left" : "right");
    previousSlideIndexRef.current = activeSlideIndex;

    const timeoutId = window.setTimeout(() => {
      setSlideTransitionDirection(null);
    }, 240);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeSlideIndex]);

  function handleCanvasTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    const target = e.target;
    if (target instanceof Element && target.closest("[data-disable-slide-swipe='true']")) {
      slideSwipeRef.current = null;
      return;
    }

    const touch = e.touches[0];
    if (!touch) return;

    slideSwipeRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
    };
  }

  function handleCanvasTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    if (!slideSwipeRef.current) return;

    const touch = e.changedTouches[0];
    if (!touch) {
      slideSwipeRef.current = null;
      return;
    }

    const deltaX = touch.clientX - slideSwipeRef.current.startX;
    const deltaY = touch.clientY - slideSwipeRef.current.startY;
    slideSwipeRef.current = null;

    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }

    if (deltaX < 0 && activeSlideIndex < project.slides.length - 1) {
      setActiveSlideIndex(activeSlideIndex + 1);
      return;
    }

    if (deltaX > 0 && activeSlideIndex > 0) {
      setActiveSlideIndex(activeSlideIndex - 1);
    }
  }

  function handleCloseStudio() {
    requestClose();
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!hasPushedHistoryRef.current) {
      window.history.pushState({ catStudio: true }, "", window.location.href);
      hasPushedHistoryRef.current = true;
    }

    const handlePopState = () => {
      if (hasUnsavedChanges) {
        const shouldLeave = window.confirm(confirmExitMessage);
        if (!shouldLeave) {
          try {
            window.history.forward();
          } catch {}
          return;
        }
      }

      onClose();
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [confirmExitMessage, hasUnsavedChanges, onClose]);

  useEffect(() => {
    if (!isExportSheetOpen || exportState !== "idle") return;

    if (exportCapability === "direct-record") {
      setExportStatusText(exportText.idle);
      return;
    }

    if (exportCapability === "guided-record") {
      setExportStatusText(exportText.localScreenRecording);
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
    setExportBlob(null);
    setExportState("idle");
    setExportStatusText(exportText.idle);
    setExportProgress(0);
    setExportSlideProgress(1);
    setExportedWithoutSound(false);
    setExportShareStatusText(null);
    setIsExportFallbackPlayerMode(false);
    setShowExportFallbackHint(false);
    setIsExportFallbackPlaybackStarted(false);
  }

  function startScreenRecordFallback() {
    setExportState("fallback-screen-record");
    setExportStatusText(exportText.localScreenRecording);
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
    setIsExportFallbackPlaybackStarted(false);
    setExportStatusText(exportText.fullscreenHint);

    window.setTimeout(() => {
      requestExportFullscreen();
    }, 0);
  }

  function closeExportFallbackPlayer() {
    setIsExportFallbackPlayerMode(false);
    setShowExportFallbackHint(false);
    setIsExportFallbackPlaybackStarted(false);
    exitExportFullscreen();
  }

  function startExportFallbackPlaybackFromBeginning() {
    setShowExportFallbackHint(false);
    setExportStatusText(exportText.recordingSlide
      .replace("{current}", "1")
      .replace("{total}", String(Math.max(1, project.slides.length))));
    setIsExportFallbackPlaybackStarted(true);
    setExportResetSignal((current) => current + 1);
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
    if (!isExportFallbackPlayerMode || exportState !== "recording") return;

    setExportState("processing");
    setExportStatusText(exportText.finalizingMp4);
    setExportProgress(1);
  }

  async function handleSaveExportedVideo() {
    if (!exportBlobUrl) return;

    const link = document.createElement("a");
    link.href = exportBlobUrl;
    link.download = "laplapla-story.mp4";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleShareExportedVideo() {
    if (!exportBlobUrl || !exportBlob) return;

    setExportShareStatusText(null);

    try {
      const file = new File([exportBlob], "laplapla-story.mp4", { type: exportBlob.type || "video/mp4" });
      const hasNativeShare = typeof navigator.share === "function";
      const canShareFiles = Boolean(
        hasNativeShare &&
        (!navigator.canShare || navigator.canShare({ files: [file] })),
      );

      if (canShareFiles) {
        await navigator.share({
          files: [file],
          title: "LapLapLa Story",
          text: exportCaption,
        });
        setExportShareStatusText(exportText.shareOpened);
        return;
      }

      setExportShareStatusText(exportText.shareUnavailable);
      await handleSaveExportedVideo();
    } catch (error) {
      const isAbort =
        error instanceof DOMException &&
        (error.name === "AbortError" || error.name === "NotAllowedError");

      if (isAbort) {
        setExportShareStatusText(exportText.shareCancelled);
        return;
      }

      setExportShareStatusText(exportText.shareUnavailable);
      await handleSaveExportedVideo();
    }
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

    if (!mimeType) {
      startScreenRecordFallback();
      return;
    }

    try {
      setExportState("recording");
      setExportStatusText(exportText.recordingSlide
        .replace("{current}", "1")
        .replace("{total}", String(Math.max(1, project.slides.length))));
      setExportProgress(0);
      setExportSlideProgress(1);

      const supportedRecorderMimeTypes = getSupportedRecorderMimeTypes() ?? [];
      const firstMp4MimeType = supportedRecorderMimeTypes.find((item) => item.includes("mp4")) ?? mimeType;
      const firstWebmMimeType = supportedRecorderMimeTypes.find((item) => item.includes("webm")) ?? "";
      const prefersVideoOnlyExport = isAndroidBrowser();
      const recorderAttemptPlan = prefersVideoOnlyExport
        ? [
            { mimeType: firstMp4MimeType, includeAudio: false },
            { mimeType: firstWebmMimeType, includeAudio: false },
            { mimeType: "", includeAudio: false },
          ]
        : [
            { mimeType: firstMp4MimeType, includeAudio: true },
            { mimeType: firstMp4MimeType, includeAudio: false },
            { mimeType: firstWebmMimeType, includeAudio: false },
            { mimeType: "", includeAudio: false },
          ];
      const recorderAttempts = recorderAttemptPlan.filter((attempt, index, attempts) =>
        attempt.mimeType !== undefined &&
        attempts.findIndex((other) =>
          other.mimeType === attempt.mimeType && other.includeAudio === attempt.includeAudio,
        ) === index,
      );
      let blob: Blob | null = null;
      let usedMimeType = mimeType;
      let recordedWithoutAudio = false;
      let lastRecordError: unknown = null;
      const failedRecorderAttempts: string[] = [];

      for (const attempt of recorderAttempts) {
        try {
          setExportStatusText(
            attempt.includeAudio
              ? exportText.preparingMedia
              : exportText.preparingVideoOnly,
          );
          blob = await recordStudioProjectCanvas(
            project,
            attempt.mimeType,
            (progress, slideIndex) => {
              setExportProgress(progress * 0.78);
              setExportSlideProgress(slideIndex);
              setExportStatusText(exportText.recordingSlide
                .replace("{current}", String(slideIndex))
                .replace("{total}", String(Math.max(1, project.slides.length))));
            },
            { includeAudio: attempt.includeAudio },
          );
          usedMimeType = attempt.mimeType || blob.type || mimeType;
          recordedWithoutAudio = !attempt.includeAudio;
          break;
        } catch (recordError) {
          lastRecordError = recordError;
          failedRecorderAttempts.push(
            `${attempt.mimeType || "native"} ${attempt.includeAudio ? "with-audio" : "video-only"}`,
          );
        }
      }

      if (!blob) {
        console.warn("Studio canvas recorder failed all candidates", failedRecorderAttempts, lastRecordError);
        throw lastRecordError instanceof Error
          ? lastRecordError
          : new Error("Canvas recording failed");
      }

      setExportState("processing");
      setExportStatusText(isMp4Blob(blob, usedMimeType) ? exportText.finalizingMp4 : exportText.convertingMp4);
      const mp4Blob = isMp4Blob(blob, usedMimeType)
        ? blob
        : await withTimeout(
            convertWebmToMp4(blob, (progress) => {
              setExportProgress(0.78 + Math.min(0.2, progress * 0.2));
            }),
            90_000,
            "MP4 conversion timed out on this device",
          );
      const nextUrl = URL.createObjectURL(mp4Blob);
      setExportBlobUrl(nextUrl);
      setExportBlob(mp4Blob);
      setExportState("success");
      setExportStatusText(exportText.ready);
      setExportProgress(1);
      setExportedWithoutSound(recordedWithoutAudio);
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

    const handlePointerOutside = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (pickerRef.current?.contains(target)) return;
      setActivePicker(null);
    };

    document.addEventListener("mousedown", handlePointerOutside);

    return () => {
      document.removeEventListener("mousedown", handlePointerOutside);
    };
  }, [activePicker]);

  return (
    <div
      className={[
        "studio-mobile-root",
        isTabletStudio ? "studio-mobile-root--tablet" : "",
        isTabletLandscape ? "studio-mobile-root--tablet-landscape" : "",
      ].filter(Boolean).join(" ")}
      style={{
        position: "fixed",
        inset: 0,
        height: "100dvh",
        maxHeight: "100dvh",
        width: "100%",
        display: "flex",
        flexDirection: isTabletLandscape ? "row-reverse" : "column",
        background: "#000",
        overflow: "hidden",
        overflowX: "hidden",
        overscrollBehavior: "none",
        zIndex: 100,
      }}
    >
      <AudioEngine ref={audioEngineRef} maxTracks={4} />
      <button
        type="button"
        onClick={handleCloseStudio}
        style={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top, 0px) + 10px)",
          left: "10px",
          zIndex: 14,
          minHeight: "40px",
          padding: "8px 12px",
          borderRadius: "999px",
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(17,17,17,0.82)",
          color: "#fff",
          fontSize: "13px",
          fontWeight: 700,
        }}
      >
        ← Cats
      </button>
      <div
        className="studio-mobile-canvas"
        onTouchStart={handleCanvasTouchStart}
        onTouchEnd={handleCanvasTouchEnd}
        onTouchCancel={() => {
          slideSwipeRef.current = null;
        }}
        style={{
          flex: "1 1 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: isTabletLandscape ? "18px 24px" : isTabletStudio ? "18px" : "8px",
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
            maxHeight: "100%",
            position: "relative",
            zIndex: 1,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: "100%",
              animation: slideTransitionDirection
                ? slideTransitionDirection === "left"
                  ? "mobile-slide-enter-from-right 240ms ease"
                  : "mobile-slide-enter-from-left 240ms ease"
                : undefined,
            }}
          >
            <SlideCanvas9x16
              slide={activeSlide}
              lang={lang}
              isMobile
              isTextEditing={mode === "text"}
              isMediaEditing={mode === "media"}
              onUpdateSlide={updateSlide}
              activeStickerId={activeStickerId}
              onActiveStickerChange={setActiveStickerId}
            />
          </div>
          <style jsx>{`
            @keyframes mobile-slide-enter-from-right {
              0% {
                opacity: 0.68;
                transform: translateX(16%);
              }
              100% {
                opacity: 1;
                transform: translateX(0);
              }
            }

            @keyframes mobile-slide-enter-from-left {
              0% {
                opacity: 0.68;
                transform: translateX(-16%);
              }
              100% {
                opacity: 1;
                transform: translateX(0);
              }
            }
          `}</style>
        </div>
      </div>
      <div
        className="studio-mobile-panel"
        style={{
          flex: isTabletLandscape ? "0 0 clamp(320px, 34vw, 390px)" : "0 0 auto",
          width: isTabletLandscape ? "clamp(320px, 34vw, 390px)" : undefined,
          maxHeight: isTabletLandscape ? "none" : isTabletStudio ? "36vh" : "40vh",
          height: isTabletLandscape ? "100%" : undefined,
          overflowY: "auto",
          overflowX: "hidden",
          overscrollBehavior: "contain",
          background: "#1a1a1a",
          padding: isTabletLandscape ? "76px 14px 150px" : isTabletStudio ? "14px" : "10px",
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
                          <Image
                            src={slide.mediaUrl}
                            alt=""
                            fill
                            unoptimized
                            sizes="90px"
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
                Edit text here. Drag the text block on the canvas to place it.
              </div>

              <textarea
                value={activeSlide.text ?? ""}
                disabled={activeSlide.introLayout === "book-meta"}
                onChange={(event) => {
                  updateSlide({
                    ...activeSlide,
                    text: event.currentTarget.value,
                  }, { commitHistory: false });
                }}
                onBlur={(event) => {
                  updateSlide({
                    ...activeSlide,
                    text: event.currentTarget.value,
                  });
                }}
                rows={isTabletLandscape ? 4 : 3}
                placeholder="Напиши что-нибудь..."
                style={{
                  width: "100%",
                  minHeight: isTabletLandscape ? "112px" : "92px",
                  resize: "none",
                  border: "1px solid rgba(255,255,255,0.16)",
                  borderRadius: "14px",
                  background: "#fff",
                  color: "#111",
                  padding: "12px",
                  fontSize: "18px",
                  lineHeight: 1.35,
                  fontFamily: "var(--font-nunito), system-ui, sans-serif",
                  outline: "none",
                  boxShadow: "inset 0 2px 8px rgba(0,0,0,0.08)",
                }}
              />

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
                Drag media or stickers on the canvas. Use the pink corner handle to resize, or X to remove the selected frame.
              </div>

              <button
                type="button"
                onClick={() => setIsMediaOpen(true)}
                style={mobileButtonStyle}
              >
                {activeSlide.mediaUrl ? "Open library" : "Add media / sticker"}
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

              {activeSticker ? (
                <label style={{ display: "flex", flexDirection: "column", gap: "6px", color: "#fff", fontSize: "12px" }}>
                  Sticker opacity
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={Math.round((activeSticker.opacity ?? 1) * 100)}
                    onChange={(event) => {
                      const opacity = Number(event.target.value) / 100;
                      updateSlide({
                        ...activeSlide,
                        stickers: (activeSlide.stickers ?? []).map((sticker) =>
                          sticker.id === activeSticker.id
                            ? { ...sticker, opacity }
                            : sticker,
                        ),
                      });
                    }}
                    style={{ width: "100%" }}
                  />
                </label>
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
                {t.preview}
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
                {t.export}
              </button>
              <div style={exportMutedTextStyle}>
                {exportText.idle} {exportText.idleWorks}
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
          position: isTabletLandscape ? "fixed" : "sticky",
          left: isTabletLandscape ? 0 : undefined,
          bottom: 0,
          width: isTabletLandscape ? "clamp(320px, 34vw, 390px)" : "100%",
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
        disableStickers={isTabletStudio}
        onClose={() => setIsMediaOpen(false)}
        onSelect={({
          url,
          mediaType,
          sourceUrl,
          sourceMediaType,
          mediaMimeType,
          mediaNormalized,
          previewUrl,
          animationType,
          source,
          tags,
        }) => {
          if (mediaType === "sticker") {
            const normalizedUrl = toStudioMediaUrl(url) ?? url;
            const nextSticker = createStudioSticker(normalizedUrl, {
              previewUrl,
              animationType,
              source,
              tags,
            });
            updateSlide({
              ...activeSlide,
              stickers: [
                ...(activeSlide.stickers ?? []),
                {
                  ...nextSticker,
                  zIndex: (activeSlide.stickers ?? []).length + 1,
                },
              ],
            });
            setActiveStickerId(nextSticker.id);
            setIsMediaOpen(false);
            return;
          }

          updateSlide({
            ...activeSlide,
            mediaUrl: toStudioMediaUrl(url) ?? url,
            mediaType,
            sourceMediaUrl: sourceUrl,
            sourceMediaType,
            mediaMimeType,
            mediaNormalized,
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
              {musicPresets.map((preset) => (
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
                                id: `${selectedMusicPreset.id}:${loop.id}:${variant.id}`,
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
          onClose={() => {
            if (isRecording) {
              stopVoiceRecording({ releaseAfterStop: true });
            } else {
              releaseVoiceRecording();
            }
            setActiveAudioSheet(null);
          }}
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
                  <div style={{ color: "#fff", fontSize: isTabletStudio ? "24px" : "18px", fontWeight: 800 }}>
                    {t.export}
                  </div>
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
                      lineHeight: 1.35,
                      maxWidth: "calc(100% - 32px)",
                      textAlign: "center",
                      pointerEvents: "none",
                    }}
                  >
                    {exportText.fullscreenHint}
                  </div>
                ) : null}
                {!isExportFallbackPlaybackStarted ? (
                  <button
                    type="button"
                    aria-label="Start slideshow from beginning"
                    onClick={startExportFallbackPlaybackFromBeginning}
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      width: "44%",
                      height: "24%",
                      minWidth: "180px",
                      minHeight: "120px",
                      border: "none",
                      background: "transparent",
                      color: "transparent",
                      zIndex: 179,
                      padding: 0,
                    }}
                  >
                    Play
                  </button>
                ) : null}
              </>
            ) : null}
            <div
              style={{
                height: "100%",
                width: "auto",
                aspectRatio: "9 / 16",
                maxWidth: "100%",
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
                loopPlayback={
                  isExportFallbackPlayerMode
                    ? !isExportFallbackPlaybackStarted
                    : exportState !== "recording" && exportState !== "processing"
                }
                onPlaybackComplete={handleExportPlaybackComplete}
                resetSignal={exportResetSignal}
                showWatermark={exportState !== "idle"}
                showCloseButton={!isExportFallbackPlayerMode}
                isPlaybackEnabled={!isExportFallbackPlayerMode || isExportFallbackPlaybackStarted}
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
                <div style={{ color: "#fff", fontSize: isTabletStudio ? "20px" : "14px", fontWeight: 800, lineHeight: 1.25 }}>
                  {exportState === "processing"
                    ? exportStatusText
                    : exportText.recordingSlide
                        .replace("{current}", String(exportSlideProgress))
                        .replace("{total}", String(Math.max(1, project.slides.length)))}
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
                <div style={exportMutedTextStyle}>
                  {exportText.keepOpen}
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
                  {exportCapability === "direct-record" ? exportText.startExport : exportText.saveToPhone}
                </button>
                {exportCapability === "direct-record" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={exportBodyTextStyle}>{exportText.idle}</div>
                    <div style={exportMutedTextStyle}>{exportText.idleWorks}</div>
                    <div style={exportMutedTextStyle}>{exportText.browserProcessing}</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={exportBodyTextStyle}>
                      {exportText.localScreenRecording}
                    </div>
                    <div style={exportMutedTextStyle}>
                      {exportText.privacyNote}
                    </div>
                  </div>
                )}
                {exportCapability === "guided-record" ? (
                  <div style={mobileHintCardStyle}>
                    <strong style={{ display: "block", marginBottom: "6px", color: "#98f0c5" }}>
                      {exportText.beforeStart}
                    </strong>
                    <div>1. {exportText.guidedStepSave}</div>
                    <div>2. {exportText.guidedStepRecord}</div>
                    <div>3. {exportText.guidedStepPlay}</div>
                    <div>4. {exportText.guidedStepClose}</div>
                  </div>
                ) : null}
              </>
            ) : null}

            {exportState === "success" ? (
              <>
                <div style={{ color: "#fff", fontSize: isTabletStudio ? "24px" : "18px", fontWeight: 800 }}>
                  {exportText.ready}
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
                  <div style={exportMutedTextStyle}>
                    {exportText.exportedWithoutSound}
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
                  {exportText.share}
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
                  {exportText.save}
                </button>
                {exportShareStatusText ? (
                  <div style={exportMutedTextStyle}>
                    {exportShareStatusText}
                  </div>
                ) : null}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard?.writeText(exportCaption)}
                    style={{ ...mobileButtonStyle, flex: 1 }}
                  >
                    {exportText.copyCaption}
                  </button>
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard?.writeText(exportCredits)}
                    style={{ ...mobileButtonStyle, flex: 1 }}
                  >
                    {exportText.copyCredits}
                  </button>
                </div>
              </>
            ) : null}

            {exportState === "fallback-screen-record" ? (
              <>
                <div style={{ color: "#fff", fontSize: isTabletStudio ? "24px" : "18px", fontWeight: 800 }}>
                  {exportText.fallbackTitle}
                </div>
                <div style={exportBodyTextStyle}>
                  {exportText.fallbackInstructions.split("\n").map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
                <div style={exportMutedTextStyle}>
                  {exportText.privacyNote}
                </div>
                <div style={mobileHintCardStyle}>
                  <strong style={{ display: "block", marginBottom: "6px", color: "#98f0c5" }}>
                    {exportText.beforeStart}
                  </strong>
                  <div>1. {exportText.guidedStepRecord}</div>
                  <div>2. {exportText.guidedStepPlay}</div>
                  <div>3. {exportText.guidedStepClose}</div>
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
                  {exportText.saveToPhone}
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

export default function StudioRoot({
  lang,
  projectId = DEFAULT_PROJECT_ID,
  expectedStudioType,
  initialSlides,
  initialTracks,
}: StudioRootProps) {
  if (typeof window !== "undefined" && expectedStudioType) {
    const routeType = new URLSearchParams(window.location.search).get("type");
    if (routeType !== expectedStudioType) {
      return null;
    }
  }

  const [project, setProject] = useState<StudioProject>(() => createInitialProject(projectId));
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [history, setHistory] = useState<StudioProject[]>([]);
  const [future, setFuture] = useState<StudioProject[]>([]);
  const [isMediaOpen, setIsMediaOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);
  const studioViewport = useStudioViewportMode();
  const usesTouchStudioLayout = studioViewport.usesTouchStudioLayout;

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
  const mobileExitBaselineSnapshotRef = useRef<string | null>(null);
  const isSavingRef = useRef(false);
  const pendingHistorySnapshotRef = useRef<StudioProject | null>(null);
  const voiceRawStreamRef = useRef<MediaStream | null>(null);
  const voiceAudioContextRef = useRef<AudioContext | null>(null);
  const voiceProcessedStreamRef = useRef<MediaStream | null>(null);
  const voicePreparationPromiseRef = useRef<Promise<MediaStream> | null>(null);
  const releaseVoiceOnStopRef = useRef(false);

  const t = dictionaries[lang].cats.studio
  const router = useRouter();

  const previewRef = useRef<HTMLDivElement>(null);
  const projectSnapshot = JSON.stringify(project);
  const isSaved = projectSnapshot === lastSavedSnapshotRef.current;
  const hasUnsavedChanges = Boolean(
    mobileExitBaselineSnapshotRef.current &&
    mobileExitBaselineSnapshotRef.current !== projectSnapshot,
  );
  const confirmExitMessage = lang === "ru"
    ? "Изменения не сохранятся. Выйти?"
    : lang === "he"
      ? "השינויים לא יישמרו. לצאת?"
      : "Changes will not be saved. Exit?";

  async function flushProjectSave(targetProject = projectRef.current) {
    const nextSnapshot = JSON.stringify(targetProject);
    if (isSavingRef.current || nextSnapshot === lastSavedSnapshotRef.current) {
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);

    try {
      await saveProject(targetProject);
      lastSavedSnapshotRef.current = nextSnapshot;
      setLastSavedAt(Date.now());
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }

  function markProjectSaved(savedProject: StudioProject) {
    projectRef.current = savedProject;
    lastSavedSnapshotRef.current = JSON.stringify(savedProject);
    setLastSavedAt(Date.now());
  }

  function releaseVoiceRecording() {
    releaseVoiceOnStopRef.current = false;
    mediaRecorderRef.current = null;

    voiceProcessedStreamRef.current?.getTracks().forEach((track) => track.stop());
    voiceRawStreamRef.current?.getTracks().forEach((track) => track.stop());

    if (voiceAudioContextRef.current) {
      void voiceAudioContextRef.current.close().catch(() => {});
    }

    voiceProcessedStreamRef.current = null;
    voiceRawStreamRef.current = null;
    voiceAudioContextRef.current = null;
    voicePreparationPromiseRef.current = null;
  }

  async function prepareVoiceRecording() {
    if (voiceProcessedStreamRef.current) {
      return;
    }

    if (voicePreparationPromiseRef.current) {
      await voicePreparationPromiseRef.current;
      return;
    }

    voicePreparationPromiseRef.current = (async () => {
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
        throw new Error(message);
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
      highpass.frequency.value = 80;

      const destination = audioCtx.createMediaStreamDestination();

      source.connect(highpass);
      highpass.connect(compressor);
      compressor.connect(destination);

      voiceRawStreamRef.current = rawStream;
      voiceAudioContextRef.current = audioCtx;
      voiceProcessedStreamRef.current = destination.stream;

      return destination.stream;
    })();

    try {
      await voicePreparationPromiseRef.current;
    } catch (error) {
      releaseVoiceRecording();
      throw error;
    } finally {
      voicePreparationPromiseRef.current = null;
    }
  }

  async function startVoiceRecording() {
    if (isRecording) return;

    try {
      await prepareVoiceRecording();
      const stream = voiceProcessedStreamRef.current;
      if (!stream) {
        throw new Error("Voice recording stream is not ready");
      }
      const recordingSlideIndex = activeSlideIndex;

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
            i === recordingSlideIndex
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

        if (releaseVoiceOnStopRef.current) {
          releaseVoiceOnStopRef.current = false;
          releaseVoiceRecording();
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Voice recording failed", err);
    }
  }

  function stopVoiceRecording(options?: { releaseAfterStop?: boolean }) {
    if (!mediaRecorderRef.current) {
      if (options?.releaseAfterStop) {
        releaseVoiceRecording();
      }
      return;
    }

    releaseVoiceOnStopRef.current = Boolean(options?.releaseAfterStop);
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
    if (!voiceUrl) {
      throw new Error("Missing voice URL");
    }

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

    if (voiceUrl.startsWith("blob:")) {
      await new Promise<void>((resolve, reject) => {
        const audio = new Audio();
        audio.preload = "auto";
        audio.src = voiceUrl;
        audio.onloadedmetadata = () => resolve();
        audio.onerror = () => reject(new Error("Failed to load blob voice URL"));
      });

      throw new Error("Blob voice URL is not supported for voice processing");
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
    if (!activeStickerId) return;
    const hasSticker = activeSlide?.stickers?.some((sticker) => sticker.id === activeStickerId);
    if (!hasSticker) {
      setActiveStickerId(null);
    }
  }, [activeSlide?.id, activeSlide?.stickers, activeStickerId]);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  useEffect(() => {
    return () => {
      releaseVoiceRecording();
    };
  }, []);

  // Restore saved project on mount (only if no external slides arrive)
  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      if (cancelled) return;

      // If external import was provided, do not restore old project
      if ((initialSlides && initialSlides.length > 0) || (initialTracks && initialTracks.length > 0)) return;

      const saved = await loadProject(projectId);
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
        mobileExitBaselineSnapshotRef.current = JSON.stringify(normalizedSaved);
        setProject(normalizedSaved);
      } else {
        mobileExitBaselineSnapshotRef.current = JSON.stringify(projectRef.current);
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [initialSlides, initialTracks, projectId]);

  // Debounced autosave keeps reload recovery tight without writing on every keystroke.
  useEffect(() => {
    if (projectSnapshot === lastSavedSnapshotRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void flushProjectSave();
    }, 800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [projectSnapshot]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      void flushProjectSave();
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [projectSnapshot]);

  useEffect(() => {
    const flush = () => {
      void flushProjectSave();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flush();
      }
    };

    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [projectSnapshot]);

  useEffect(() => {
    if ((!initialSlides || initialSlides.length === 0) && (!initialTracks || initialTracks.length === 0)) {
      return;
    }

    const mappedSlides: StudioSlide[] = (initialSlides ?? []).map(
      (s) => {
        const importedMediaUrl = s.image ?? s.mediaUrl;
        return ({
        id: createStudioId(),
        text: s.text,
        fontSize: getImportedSlideFontSize(s.text),
        mediaUrl: toStudioMediaUrl(importedMediaUrl),
        mediaType:
          s.mediaType ??
          (importedMediaUrl?.includes(".mp4") || importedMediaUrl?.includes(".webm")
            ? "video"
            : "image"),
        sourceMediaUrl: s.sourceMediaUrl,
        sourceMediaType: s.sourceMediaType,
        mediaMimeType: s.mediaMimeType,
        mediaNormalized: s.mediaNormalized,
        mediaFit: s.mediaFit ?? "contain",
        mediaPosition: s.mediaPosition ?? "center",
        textPosition: s.textPosition ?? "bottom",
        textAlign: s.textAlign ?? "center",
        textBgEnabled: s.textBgEnabled ?? true,
        textBgColor: s.textBgColor ?? "#ffffff",
        textBgOpacity: s.textBgOpacity ?? 1,
        introLayout: s.introLayout,
        voiceUrl: s.voiceUrl,
        voiceDuration: s.voiceDuration,
        voiceBaseUrl: s.voiceBaseUrl,
        voiceBaseDuration: s.voiceBaseDuration,
        activeVoiceEffects: s.activeVoiceEffects,
        bgColor: "#ffffff",
        textColor: "#000000",
      })},
    );

    const newProject: StudioProject = {
      id: projectId,
      slides: mappedSlides.length > 0 ? mappedSlides : [createEmptySlide()],
      musicTracks: initialTracks ?? [],
      updatedAt: Date.now(),
    };

    setProject(newProject);
    mobileExitBaselineSnapshotRef.current = JSON.stringify(newProject);
    setActiveSlideIndex(0);

    // Immediately overwrite saved project with external slides
    void saveProject(newProject).then(() => {
      markProjectSaved(newProject);
    });
  }, [initialSlides, initialTracks, projectId]);

  function pushHistory(current: StudioProject) {
    pendingHistorySnapshotRef.current = null;
    setHistory((prev) => [...prev, current]);
    setFuture([]);
  }

  function updateSlide(
    updatedSlide: StudioSlide,
    options?: { commitHistory?: boolean },
  ) {
    setProject((currentProject) => {
      const currentSlide = currentProject.slides[activeSlideIndex];
      if (!currentSlide) {
        return currentProject;
      }

      const normalizedSlide = currentSlide.introLayout === "book-meta"
        ? {
            ...updatedSlide,
            text: currentSlide.text,
          }
        : updatedSlide;

      const hasPendingHistorySnapshot = pendingHistorySnapshotRef.current !== null;

      if (options?.commitHistory === false && !hasPendingHistorySnapshot) {
        pendingHistorySnapshotRef.current = currentProject;
      }

      if (JSON.stringify(currentSlide) === JSON.stringify(normalizedSlide)) {
        if (options?.commitHistory !== false && hasPendingHistorySnapshot) {
          pushHistory(pendingHistorySnapshotRef.current ?? currentProject);
        }
        return currentProject;
      }

      if (options?.commitHistory !== false) {
        pushHistory(pendingHistorySnapshotRef.current ?? currentProject);
      }

      const updatedSlides = [...currentProject.slides];
      updatedSlides[activeSlideIndex] = normalizedSlide;

      return {
        ...currentProject,
        slides: updatedSlides,
        updatedAt: Date.now(),
      };
    });
  }

  function updateActiveSlide(
    updater: (slide: StudioSlide) => StudioSlide,
    slideIndex = activeSlideIndex,
  ) {
    setProject((currentProject) => {
      const updatedSlides = [...currentProject.slides];
      const currentSlide = updatedSlides[slideIndex];
      if (!currentSlide) {
        return currentProject;
      }

      const updatedSlide = updater(currentSlide);
      updatedSlides[slideIndex] = currentSlide.introLayout === "book-meta"
        ? {
            ...updatedSlide,
            text: currentSlide.text,
          }
        : updatedSlide;

      if (JSON.stringify(currentSlide) === JSON.stringify(updatedSlides[slideIndex])) {
        return currentProject;
      }

      pendingHistorySnapshotRef.current = null;
      pushHistory(currentProject);

      return {
        ...currentProject,
        slides: updatedSlides,
        updatedAt: Date.now(),
      };
    });
  }

  function updateMusicTracks(tracks: StudioProject["musicTracks"]) {
    setProject((currentProject) => {
      if (areStudioTracksEqual(currentProject.musicTracks, tracks)) {
        return currentProject;
      }

      pendingHistorySnapshotRef.current = null;
      pushHistory(currentProject);

      return {
        ...currentProject,
        musicTracks: tracks,
        updatedAt: Date.now(),
      };
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
    setProject(createInitialProject(projectId));
    setActiveSlideIndex(0);
  }

  function undo() {
    if (history.length === 0) return;

    const previous = history[history.length - 1];

    pendingHistorySnapshotRef.current = null;
    setFuture((f) => [project, ...f]);
    setHistory((h) => h.slice(0, -1));
    setProject(previous);
  }

  function redo() {
    if (future.length === 0) return;

    const next = future[0];

    pendingHistorySnapshotRef.current = null;
    setHistory((h) => [...h, project]);
    setFuture((f) => f.slice(1));
    setProject(next);
  }

  const layoutProps: StudioLayoutProps = {
    lang,
    project,
    activeSlide,
    activeSlideIndex,
    isMediaOpen,
    isPreviewOpen,
    isRecording,
    isSaving,
    isSaved,
    hasUnsavedChanges,
    lastSavedAt,
    confirmExitMessage,
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
    prepareVoiceRecording,
    releaseVoiceRecording,
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
    activeStickerId,
    setActiveStickerId,
  };

  return usesTouchStudioLayout ? (
    <StudioMobileLayout {...layoutProps} />
  ) : (
    <StudioDesktopLayout {...layoutProps} />
  );
}
