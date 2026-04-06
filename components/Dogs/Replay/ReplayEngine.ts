import { buildRegionMap, type BuildRegionMapResult } from "@/utils/buildRegionMap";
import { autoColorRegions } from "@/utils/autoColorRegions";
import {
  drawLapLapLaWatermarkSync,
  preloadLapLapLaWatermark,
} from "@/utils/drawLapLapLaWatermark";
import type {
  ReplayAction,
  ReplayActionGroup,
  ReplayBrushSettings,
  ReplayRegionData,
} from "./types";

type ReplayEngineOptions = {
  width: number;
  height: number;
  strokePointDelayMs?: number;
  actionDelayMs?: number;
};

type StrokeState = {
  brush: ReplayBrushSettings;
  lastX: number;
  lastY: number;
  hue: number;
  gradientProgress: number;
};

type VideoOptions = {
  fps?: number;
  mimeType?: string;
  bitsPerSecond?: number;
};

type GifOptions = {
  width?: number;
  height?: number;
  fps?: number;
  workerScript?: string;
};

const TARGET_DURATION_SECONDS = 20;
const TARGET_FPS = 30;
const MAX_TARGET_FRAMES = TARGET_DURATION_SECONDS * TARGET_FPS;
const STROKE_POINT_KEEP_EVERY = 3;

function getSupportedReplayVideoMimeType(preferred?: string): string {
  const candidates = [
    preferred,
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ].filter((value): value is string => Boolean(value));

  if (typeof MediaRecorder?.isTypeSupported !== "function") {
    return candidates[0] ?? "video/webm";
  }

  return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? "video/webm";
}

export class ReplayEngine {
  private actionGroups: ReplayActionGroup[];
  private processedActionGroups: ReplayActionGroup[];
  private readonly regionMaps: Map<number, ReplayRegionData>;
  private readonly displayCanvas: HTMLCanvasElement;
  private readonly displayCtx: CanvasRenderingContext2D;
  private readonly drawingLayer: HTMLCanvasElement;
  private readonly drawingCtx: CanvasRenderingContext2D;
  private readonly colorLayer: HTMLCanvasElement;
  private readonly colorCtx: CanvasRenderingContext2D;
  private readonly pawLayer: HTMLCanvasElement;
  private readonly pawCtx: CanvasRenderingContext2D;
  private readonly width: number;
  private readonly height: number;

  private strokePointDelayMs: number;
  private actionDelayMs: number;
  private adaptiveSpeedMultiplier = 1;

  private groupIndex = 0;
  private actionIndex = 0;
  private isPlaying = false;
  private isPaused = false;
  private rafId: number | null = null;
  private nextActionAt = 0;
  private activeStroke: StrokeState | null = null;
  private regionDataCache: BuildRegionMapResult | null = null;
  private finishListeners = new Set<() => void>();
  private watermarkDuringExport = false;
  private pendingAsyncAction: Promise<void> | null = null;

  private pawImage: HTMLImageElement | null = null;

  constructor(
    actionGroups: ReplayActionGroup[],
    regionMaps: Map<number, ReplayRegionData>,
    canvas: HTMLCanvasElement,
    options: ReplayEngineOptions,
  ) {
    this.actionGroups = actionGroups;
    this.processedActionGroups = this.buildProcessedActionGroups(actionGroups);
    this.recomputeAdaptiveSpeed();
    this.regionMaps = regionMaps;
    this.displayCanvas = canvas;

    const displayCtx = canvas.getContext("2d");
    if (!displayCtx) {
      throw new Error("ReplayEngine: failed to get 2D context for display canvas");
    }
    this.displayCtx = displayCtx;

    this.width = options.width;
    this.height = options.height;
    this.strokePointDelayMs = options.strokePointDelayMs ?? 8;
    this.actionDelayMs = options.actionDelayMs ?? 80;

    this.drawingLayer = document.createElement("canvas");
    this.drawingLayer.width = this.width;
    this.drawingLayer.height = this.height;
    const dCtx = this.drawingLayer.getContext("2d");
    if (!dCtx) throw new Error("ReplayEngine: failed to create drawing layer context");
    this.drawingCtx = dCtx;

    this.colorLayer = document.createElement("canvas");
    this.colorLayer.width = this.width;
    this.colorLayer.height = this.height;
    const cCtx = this.colorLayer.getContext("2d");
    if (!cCtx) throw new Error("ReplayEngine: failed to create color layer context");
    this.colorCtx = cCtx;

    this.pawLayer = document.createElement("canvas");
    this.pawLayer.width = this.width;
    this.pawLayer.height = this.height;
    const pCtx = this.pawLayer.getContext("2d");
    if (!pCtx) throw new Error("ReplayEngine: failed to create paw layer context");
    this.pawCtx = pCtx;

    this.initPawImage();
    this.resetLayers();
  }

  setActionGroups(actionGroups: ReplayActionGroup[]) {
    this.actionGroups = actionGroups;
    this.processedActionGroups = this.buildProcessedActionGroups(actionGroups);
    this.recomputeAdaptiveSpeed();
    this.restart();
  }

  play() {
    if (this.isPlaying && !this.isPaused) return;

    if (!this.hasMoreActions()) {
      this.restart();
    }

    this.isPlaying = true;
    this.isPaused = false;

    if (this.rafId == null) {
      this.rafId = requestAnimationFrame(this.tick);
    }
  }

  pause() {
    if (!this.isPlaying) return;
    this.isPaused = true;
  }

  resume() {
    if (!this.isPlaying) {
      this.play();
      return;
    }
    this.isPaused = false;
    if (this.rafId == null) {
      this.rafId = requestAnimationFrame(this.tick);
    }
  }

  stop() {
    this.isPlaying = false;
    this.isPaused = false;
    this.groupIndex = this.processedActionGroups.length;
    this.actionIndex = 0;
    this.nextActionAt = 0;
    this.activeStroke = null;
    this.pendingAsyncAction = null;
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  restart() {
    this.isPlaying = false;
    this.isPaused = false;
    this.groupIndex = 0;
    this.actionIndex = 0;
    this.nextActionAt = 0;
    this.activeStroke = null;
    this.pendingAsyncAction = null;
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.resetLayers();
  }

  async exportVideo(options: VideoOptions = {}): Promise<Blob> {
    const fps = options.fps ?? 30;
    const mimeType = getSupportedReplayVideoMimeType(options.mimeType);
    const bitsPerSecond = options.bitsPerSecond ?? 3_000_000;

    if (typeof MediaRecorder === "undefined") {
      throw new Error("MediaRecorder is not available in this browser");
    }

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = this.width;
    exportCanvas.height = this.height;
    const exportCtx = exportCanvas.getContext("2d");
    if (!exportCtx) {
      throw new Error("ReplayEngine: failed to create export video context");
    }

    const exportEngine = new ReplayEngine(this.actionGroups, this.regionMaps, exportCanvas, {
      width: this.width,
      height: this.height,
      strokePointDelayMs: this.strokePointDelayMs,
      actionDelayMs: this.actionDelayMs,
    });

    const stream = exportCanvas.captureStream(fps);
    const videoTrack = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined;
    const chunks: BlobPart[] = [];

    const recorder = new MediaRecorder(stream, { mimeType, bitsPerSecond });

    const done = new Promise<Blob>((resolve, reject) => {
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onerror = () => {
        reject(new Error("Failed to record replay video"));
      };

      recorder.onstop = () => {
        if (!chunks.length) {
          reject(new Error("Replay video export produced an empty file"));
          return;
        }

        resolve(new Blob(chunks, { type: mimeType }));
      };
    });

    await preloadLapLapLaWatermark();

    let previousFrame: ImageData | null = null;
    let pendingDelay = 0;

    const pushFrame = (delayMs: number, force = false) => {
      drawLapLapLaWatermarkSync(exportCtx, exportCanvas);
      const currentFrame = exportCtx.getImageData(0, 0, this.width, this.height);
      if (!force && previousFrame && !this.framesDifferent(previousFrame.data, currentFrame.data)) {
        pendingDelay += delayMs;
        return false;
      }

      const totalDelay = Math.max(16, delayMs + pendingDelay);
      pendingDelay = 0;
      previousFrame = currentFrame;

      if (videoTrack?.requestFrame) {
        videoTrack.requestFrame();
      }
      return totalDelay;
    };

    try {
      exportEngine.restart();
      recorder.start();

      await this.withFastAnimationFrames(async () => {
        for (const action of exportEngine.iterateActions()) {
          if (action.type === "fillRegion" || action.type === "autoColorStart") {
            await exportEngine.applyActionAndWait(action, () => {
              pushFrame(16);
            });
            const delay = pushFrame(16);
            if (typeof delay === "number") {
              await this.sleep(delay);
            }
            continue;
          }

          await exportEngine.applyActionAndWait(action);
          const delay = pushFrame(exportEngine.getActionDelay(action));
          if (typeof delay === "number") {
            await this.sleep(delay);
          }
        }
      });

      // Hold final frame so the export does not instantly loop/restart.
      const finalHoldDelay = pushFrame(2000, true);
      if (typeof finalHoldDelay === "number") {
        await this.sleep(finalHoldDelay);
      } else {
        await this.sleep(2000);
      }

      if (recorder.state !== "inactive") {
        recorder.stop();
      }

      return done;
    } finally {
      exportEngine.destroy();
    }
  }

  async exportGIF(options: GifOptions = {}): Promise<Blob> {
    const gifModule = await import("gif.js");
    const GIFCtor = (gifModule as any).default ?? (gifModule as any);

    const outputWidth = options.width ?? 384;
    const outputHeight = options.height ?? 384;
    const gifFps = options.fps ?? 12;
    const gifFrameDelayMs = Math.max(20, Math.round(1000 / gifFps));

    const gif = new GIFCtor({
      workers: 2,
      quality: 10,
      width: outputWidth,
      height: outputHeight,
      workerScript: options.workerScript,
    });

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = this.width;
    exportCanvas.height = this.height;

    const exportEngine = new ReplayEngine(this.actionGroups, this.regionMaps, exportCanvas, {
      width: this.width,
      height: this.height,
      strokePointDelayMs: this.strokePointDelayMs,
      actionDelayMs: this.actionDelayMs,
    });
    const exportCtx = exportCanvas.getContext("2d");
    if (!exportCtx) {
      throw new Error("ReplayEngine: failed to create export GIF context");
    }
    const gifFrameCanvas = document.createElement("canvas");
    gifFrameCanvas.width = outputWidth;
    gifFrameCanvas.height = outputHeight;
    const gifFrameCtx = gifFrameCanvas.getContext("2d");
    if (!gifFrameCtx) {
      throw new Error("ReplayEngine: failed to create scaled GIF frame context");
    }

    exportEngine.restart();
    await preloadLapLapLaWatermark();
    let previousFrame: ImageData | null = null;
    let pendingDelay = 0;
    let pendingActionDelay = 0;
    let frameCount = 0;

    const pushGifFrame = (delayMs: number, force = false) => {
      drawLapLapLaWatermarkSync(exportCtx, exportCanvas);
      gifFrameCtx.clearRect(0, 0, outputWidth, outputHeight);
      gifFrameCtx.drawImage(exportCanvas, 0, 0, outputWidth, outputHeight);
      const currentFrame = gifFrameCtx.getImageData(0, 0, outputWidth, outputHeight);
      if (!force && previousFrame && !this.framesDifferent(previousFrame.data, currentFrame.data)) {
        pendingDelay += delayMs;
        return;
      }

      const totalDelay = Math.max(gifFrameDelayMs, delayMs + pendingDelay);
      pendingDelay = 0;

      gif.addFrame(gifFrameCanvas, {
        copy: true,
        delay: totalDelay,
      });
      previousFrame = currentFrame;
      frameCount += 1;
    };

    await this.withFastAnimationFrames(async () => {
      for (const action of exportEngine.iterateActions()) {
        await exportEngine.applyActionAndWait(action);
        pendingActionDelay += exportEngine.getActionDelay(action);

        if (this.shouldCaptureGifFrame(action)) {
          pushGifFrame(pendingActionDelay);
          pendingActionDelay = 0;
        }
      }
    });

    if (pendingActionDelay > 0 || frameCount === 0) {
      pushGifFrame(pendingActionDelay || gifFrameDelayMs);
    }

    pushGifFrame(2000, true);

    if (frameCount === 0) {
      drawLapLapLaWatermarkSync(exportCtx, exportCanvas);
      gifFrameCtx.clearRect(0, 0, outputWidth, outputHeight);
      gifFrameCtx.drawImage(exportCanvas, 0, 0, outputWidth, outputHeight);
      gif.addFrame(gifFrameCanvas, { copy: true, delay: gifFrameDelayMs });
    }

    return new Promise<Blob>((resolve, reject) => {
      gif.on("finished", (blob: Blob) => resolve(blob));
      gif.on("abort", () => reject(new Error("GIF export was aborted")));
      gif.on("error", (error: unknown) =>
        reject(error instanceof Error ? error : new Error(String(error))),
      );
      gif.render();
    });
  }

  onFinish(listener: () => void): () => void {
    this.finishListeners.add(listener);
    return () => {
      this.finishListeners.delete(listener);
    };
  }

  destroy() {
    this.stop();
    this.finishListeners.clear();
  }

  private readonly tick = (ts: number) => {
    this.rafId = null;

    if (!this.isPlaying) {
      return;
    }

    if (this.isPaused) {
      this.rafId = requestAnimationFrame(this.tick);
      return;
    }

    if (this.pendingAsyncAction) {
      this.rafId = requestAnimationFrame(this.tick);
      return;
    }

    if (this.nextActionAt === 0) {
      this.nextActionAt = ts;
    }

    let processed = 0;
    while (ts >= this.nextActionAt && this.hasMoreActions() && processed < 5) {
      const action = this.getCurrentAction();
      if (!action) break;
      const asyncAction = this.applyAction(action);
      this.advanceActionPointer();
      this.nextActionAt += this.getActionDelay(action);
      processed += 1;

      if (asyncAction) {
        this.pendingAsyncAction = asyncAction.finally(() => {
          this.pendingAsyncAction = null;
        });
        break;
      }
    }

    if (!this.hasMoreActions()) {
      this.isPlaying = false;
      this.activeStroke = null;
      this.nextActionAt = 0;
      this.notifyFinish();
      return;
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  private notifyFinish() {
    this.finishListeners.forEach((listener) => listener());
  }

  private getActionDelay(action: ReplayAction): number {
    const baseDelay = action.type === "strokePoint" ? this.strokePointDelayMs : this.actionDelayMs;
    if (this.adaptiveSpeedMultiplier <= 1) {
      return baseDelay;
    }

    const speedByType = this.getActionSpeedBoost(action);
    const accelerated = baseDelay / (this.adaptiveSpeedMultiplier * speedByType);
    const minDelay = action.type === "strokePoint" ? 1 : 6;
    return Math.max(minDelay, accelerated);
  }

  private getActionSpeedBoost(action: ReplayAction) {
    switch (action.type) {
      case "strokeStart":
      case "strokePoint":
      case "strokeEnd":
        return 6;
      case "pawPlace":
      case "clearPaws":
        return 3;
      case "fillRegion":
      case "autoColorStart":
        return 1.5;
      default:
        return 2;
    }
  }

  private applyAction(
    action: ReplayAction,
    onFrame?: () => void | Promise<void>,
  ): Promise<void> | null {
    switch (action.type) {
      case "clearAll": {
        this.resetLayers();
        onFrame?.();
        return null;
      }
      case "strokeStart": {
        this.activeStroke = {
          brush: action.brush,
          lastX: action.x,
          lastY: action.y,
          hue: 0,
          gradientProgress: 0,
        };
        this.compositeLayers();
        onFrame?.();
        return null;
      }
      case "strokePoint": {
        if (!this.activeStroke) {
          this.compositeLayers();
          onFrame?.();
          return null;
        }
        this.drawStrokeSegment(this.activeStroke, action.x, action.y);
        this.compositeLayers();
        onFrame?.();
        return null;
      }
      case "strokeEnd": {
        this.activeStroke = null;
        this.compositeLayers();
        onFrame?.();
        return null;
      }
      case "pawPlace": {
        this.drawPaw(action.x, action.y, action.color);
        this.compositeLayers();
        onFrame?.();
        return null;
      }
      case "fillRegion": {
        const regionData = this.getRegionData();
        const fillRegionId = this.resolveFillRegionId(
          regionData.regionMap,
          action.regionId,
          action.seedX,
          action.seedY,
        );
        if (fillRegionId < 0) break;

        const safeColor: [number, number, number] = [
          this.sanitizeColorChannel(action.color[0]),
          this.sanitizeColorChannel(action.color[1]),
          this.sanitizeColorChannel(action.color[2]),
        ];

        const fillSeed = {
          x: action.seedX,
          y: action.seedY,
          regionId: fillRegionId,
          color: safeColor,
        };

        return autoColorRegions(
          this.colorCtx,
          {
            width: this.width,
            height: this.height,
            regionMap: regionData.regionMap,
          },
          [fillSeed],
          {
            onFrame: () => {
              this.compositeLayers();
              onFrame?.();
            },
          },
        ).then(() => {
          this.compositeLayers();
          onFrame?.();
        });
      }
      case "autoColorStart": {
        const replayRegionData = this.regionMaps.get(action.regionMapId);
        if (!replayRegionData) return null;
        const seeds = action.seeds.map((seed) => ({
          x: seed.x,
          y: seed.y,
          regionId: seed.regionId,
          color: [
            this.sanitizeColorChannel(seed.color[0]),
            this.sanitizeColorChannel(seed.color[1]),
            this.sanitizeColorChannel(seed.color[2]),
          ] as [number, number, number],
        }));

        return autoColorRegions(this.colorCtx, replayRegionData, seeds, {
          onFrame: () => {
            this.compositeLayers();
            onFrame?.();
          },
        }).then(() => {
          this.compositeLayers();
          onFrame?.();
        });
      }
      case "clearPaws": {
        this.pawCtx.clearRect(0, 0, this.width, this.height);
        this.compositeLayers();
        onFrame?.();
        return null;
      }
      default:
        this.compositeLayers();
        onFrame?.();
        return null;
    }

    return null;
  }

  private drawStrokeSegment(stroke: StrokeState, x: number, y: number) {
    const fromX = stroke.lastX;
    const fromY = stroke.lastY;
    const brush = stroke.brush;

    const drawingCtx = this.drawingCtx;
    drawingCtx.save();
    drawingCtx.lineWidth = Math.max(1, brush.size);
    drawingCtx.lineJoin = "round";
    drawingCtx.lineCap = "round";
    drawingCtx.globalAlpha = Math.max(0.05, Math.min(1, brush.opacity));
    drawingCtx.globalCompositeOperation = brush.isEraser ? "destination-out" : "source-over";
    drawingCtx.shadowBlur = 0;

    if (!brush.isEraser) {
      if (brush.style === "rainbow") {
        drawingCtx.strokeStyle = `hsl(${stroke.hue}, 100%, 50%)`;
      } else if (brush.style === "chameleon") {
        drawingCtx.strokeStyle = `hsl(${(stroke.hue + 180) % 360}, 70%, 50%)`;
      } else if (brush.style === "gradient") {
        const p = stroke.gradientProgress;
        const r = Math.floor(255 * (1 - p) + 100 * p);
        const g = Math.floor(100 * (1 - p) + 200 * p);
        const b = Math.floor(150 * (1 - p) + 255 * p);
        drawingCtx.strokeStyle = `rgba(${r},${g},${b},0.7)`;
      } else if (brush.style === "neon") {
        drawingCtx.strokeStyle = `hsl(${stroke.hue}, 100%, 70%)`;
        drawingCtx.shadowColor = drawingCtx.strokeStyle;
        drawingCtx.shadowBlur = 8;
      } else {
        drawingCtx.strokeStyle = brush.color;
      }
    }

    drawingCtx.beginPath();
    drawingCtx.moveTo(fromX, fromY);
    drawingCtx.lineTo(x, y);

    if (!brush.isEraser && brush.style === "watercolor") {
      drawingCtx.lineJoin = "round";
      drawingCtx.lineCap = "round";
      drawingCtx.strokeStyle = brush.color;

      // base wet stroke
      drawingCtx.globalAlpha = 0.15;
      drawingCtx.lineWidth = Math.max(1, brush.size * 2.4);
      drawingCtx.shadowColor = brush.color;
      drawingCtx.shadowBlur = brush.size * 0.8;
      drawingCtx.stroke();

      // soft diffusion layer
      drawingCtx.globalAlpha = 0.08;
      drawingCtx.lineWidth = Math.max(1, brush.size * 3.8);
      drawingCtx.shadowBlur = brush.size * 1.8;
      drawingCtx.stroke();

      // outer water bloom
      drawingCtx.globalAlpha = 0.04;
      drawingCtx.lineWidth = Math.max(1, brush.size * 5.5);
      drawingCtx.shadowBlur = brush.size * 3;
      drawingCtx.stroke();

      // pigment diffusion particles (deterministic noise to keep replay stable)
      for (let i = 0; i < 8; i += 1) {
        const nx = this.pseudoNoise(x + i * 17.3, y + i * 11.7) - 0.5;
        const ny = this.pseudoNoise(y + i * 23.1, x + i * 7.9) - 0.5;
        const px = x + nx * brush.size * 4;
        const py = y + ny * brush.size * 4;
        const radius = this.pseudoNoise(px + i, py - i) * brush.size * 0.7;

        drawingCtx.globalAlpha = 0.03 + this.pseudoNoise(px * 0.7, py * 0.7) * 0.05;
        drawingCtx.beginPath();
        drawingCtx.arc(px, py, Math.max(0.5, radius), 0, Math.PI * 2);
        drawingCtx.fillStyle = brush.color;
        drawingCtx.fill();
      }
    }

    drawingCtx.globalAlpha = Math.max(0.05, Math.min(1, brush.opacity));
    drawingCtx.lineWidth = Math.max(1, brush.size);
    drawingCtx.stroke();

    if (!brush.isEraser && brush.style === "sparkle") {
      drawingCtx.fillStyle = "rgba(255, 255, 255, 0.5)";
      for (let i = 0; i < 5; i += 1) {
        const n1 = this.pseudoNoise(x + i * 17, y + i * 31);
        const n2 = this.pseudoNoise(y + i * 11, x + i * 23);
        const sx = x + (n1 - 0.5) * 10;
        const sy = y + (n2 - 0.5) * 10;
        drawingCtx.beginPath();
        drawingCtx.arc(sx, sy, 1 + this.pseudoNoise(sx, sy) * 1.5, 0, Math.PI * 2);
        drawingCtx.fill();
      }
    }

    drawingCtx.restore();

    if (brush.isEraser) {
      this.colorCtx.save();
      this.colorCtx.globalCompositeOperation = "destination-out";
      this.colorCtx.lineJoin = "round";
      this.colorCtx.lineCap = "round";
      this.colorCtx.lineWidth = Math.max(1, brush.size);
      this.colorCtx.beginPath();
      this.colorCtx.moveTo(fromX, fromY);
      this.colorCtx.lineTo(x, y);
      this.colorCtx.stroke();
      this.colorCtx.restore();
    }

    stroke.lastX = x;
    stroke.lastY = y;
    stroke.hue = (stroke.hue + 2) % 360;
    stroke.gradientProgress = (stroke.gradientProgress + 0.02) % 1;
    this.regionDataCache = null;
  }

  private getRegionData(): BuildRegionMapResult {
    if (this.regionDataCache) return this.regionDataCache;

    const drawingImage = this.drawingCtx.getImageData(0, 0, this.width, this.height);
    const regionData = buildRegionMap(drawingImage);
    this.regionDataCache = regionData;

    return this.regionDataCache;
  }

  private drawPaw(x: number, y: number, color: [number, number, number]) {
    const size = 26;

    const pawCanvas = document.createElement("canvas");
    pawCanvas.width = size;
    pawCanvas.height = size;

    const pawCtx = pawCanvas.getContext("2d");
    if (!pawCtx) return;

    const [r, g, b] = color;

    if (this.pawImage && this.pawImage.complete) {
      pawCtx.drawImage(this.pawImage, 0, 0, size, size);
      pawCtx.globalCompositeOperation = "source-in";
      pawCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      pawCtx.fillRect(0, 0, size, size);

      this.pawCtx.save();
      this.pawCtx.translate(x, y);
      this.pawCtx.rotate((this.pseudoNoise(x, y) - 0.5) * 0.6);
      this.pawCtx.drawImage(pawCanvas, -size / 2, -size / 2);
      this.pawCtx.restore();
      return;
    }

    this.pawCtx.save();
    this.pawCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    this.pawCtx.beginPath();
    this.pawCtx.arc(x, y, 5, 0, Math.PI * 2);
    this.pawCtx.fill();
    this.pawCtx.restore();
  }

  private initPawImage() {
    this.pawImage = new Image();
    this.pawImage.src = "/dog/paw.svg";
  }

  private resetLayers() {
    this.drawingCtx.clearRect(0, 0, this.width, this.height);
    this.colorCtx.clearRect(0, 0, this.width, this.height);
    this.pawCtx.clearRect(0, 0, this.width, this.height);
    this.regionDataCache = null;
    this.compositeLayers();
  }

  private compositeLayers() {
    this.displayCtx.clearRect(0, 0, this.width, this.height);
    this.displayCtx.fillStyle = "#ffffff";
    this.displayCtx.fillRect(0, 0, this.width, this.height);
    this.displayCtx.drawImage(this.colorLayer, 0, 0);
    this.displayCtx.drawImage(this.drawingLayer, 0, 0);
    this.displayCtx.drawImage(this.pawLayer, 0, 0);
    if (this.watermarkDuringExport) {
      drawLapLapLaWatermarkSync(this.displayCtx, this.displayCanvas);
    }
  }

  private pseudoNoise(x: number, y: number) {
    const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return s - Math.floor(s);
  }

  private sanitizeColorChannel(value: number) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(255, Math.round(value)));
  }

  private resolveFillRegionId(
    regionMap: Int32Array,
    fallbackRegionId: number,
    seedX: number,
    seedY: number,
  ) {
    const x = Math.max(0, Math.min(this.width - 1, Math.floor(seedX)));
    const y = Math.max(0, Math.min(this.height - 1, Math.floor(seedY)));

    const direct = regionMap[y * this.width + x];
    if (direct >= 0) return direct;

    const radius = 6;
    for (let r = 1; r <= radius; r += 1) {
      for (let dy = -r; dy <= r; dy += 1) {
        for (let dx = -r; dx <= r; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= this.width || ny >= this.height) continue;
          const regionId = regionMap[ny * this.width + nx];
          if (regionId >= 0) return regionId;
        }
      }
    }

    return Number.isInteger(fallbackRegionId) ? fallbackRegionId : -1;
  }

  private hasMoreActions() {
    this.normalizeActionPointer();
    if (this.groupIndex >= this.processedActionGroups.length) return false;
    const group = this.processedActionGroups[this.groupIndex];
    return this.actionIndex < group.actions.length;
  }

  private getCurrentAction(): ReplayAction | null {
    this.normalizeActionPointer();
    const group = this.processedActionGroups[this.groupIndex];
    if (!group) return null;
    return group.actions[this.actionIndex] ?? null;
  }

  private advanceActionPointer() {
    const group = this.processedActionGroups[this.groupIndex];
    if (!group) return;

    this.actionIndex += 1;
    if (this.actionIndex >= group.actions.length) {
      this.groupIndex += 1;
      this.actionIndex = 0;
    }
    this.normalizeActionPointer();
  }

  private *iterateActions() {
    for (const group of this.processedActionGroups) {
      for (const action of group.actions) {
        yield action;
      }
    }
  }

  private recomputeAdaptiveSpeed() {
    const totalActions = this.countActions(this.processedActionGroups);
    if (totalActions <= 0) {
      this.adaptiveSpeedMultiplier = 1;
      return;
    }

    this.adaptiveSpeedMultiplier = Math.max(1, totalActions / MAX_TARGET_FRAMES);
  }

  private countActions(groups: ReplayActionGroup[]) {
    let total = 0;
    for (const group of groups) {
      total += group.actions.length;
    }
    return total;
  }

  private buildProcessedActionGroups(groups: ReplayActionGroup[]) {
    return groups.map((group) => ({
      id: group.id,
      actions: this.decimateStrokePoints(group.actions),
    }));
  }

  private decimateStrokePoints(actions: ReplayAction[]) {
    const result: ReplayAction[] = [];
    let strokePointBuffer: ReplayAction[] = [];
    let inStroke = false;

    const flushStrokeBuffer = () => {
      if (strokePointBuffer.length === 0) return;
      strokePointBuffer.forEach((action, index) => {
        const isNth = index % STROKE_POINT_KEEP_EVERY === 0;
        const isLast = index === strokePointBuffer.length - 1;
        if (isNth || isLast) {
          result.push(action);
        }
      });
      strokePointBuffer = [];
    };

    for (const action of actions) {
      if (action.type === "strokeStart") {
        flushStrokeBuffer();
        inStroke = true;
        result.push(action);
        continue;
      }

      if (action.type === "strokePoint" && inStroke) {
        strokePointBuffer.push(action);
        continue;
      }

      if (action.type === "strokeEnd" && inStroke) {
        flushStrokeBuffer();
        result.push(action);
        inStroke = false;
        continue;
      }

      flushStrokeBuffer();
      result.push(action);
    }

    flushStrokeBuffer();
    return result;
  }

  private shouldCaptureGifFrame(action: ReplayAction) {
    return (
      action.type === "strokeEnd" ||
      action.type === "pawPlace" ||
      action.type === "fillRegion" ||
      action.type === "clearPaws" ||
      // Backward compatibility: newer logs can contain a single auto-color action.
      action.type === "autoColorStart"
    );
  }

  private async withFastAnimationFrames<T>(run: () => Promise<T>): Promise<T> {
    const originalRaf = window.requestAnimationFrame.bind(window);
    const originalCancelRaf = window.cancelAnimationFrame.bind(window);

    window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      return window.setTimeout(() => callback(performance.now()), 0);
    }) as typeof window.requestAnimationFrame;

    window.cancelAnimationFrame = ((id: number) => {
      window.clearTimeout(id);
    }) as typeof window.cancelAnimationFrame;

    try {
      return await run();
    } finally {
      window.requestAnimationFrame = originalRaf;
      window.cancelAnimationFrame = originalCancelRaf;
    }
  }

  private framesDifferent(a: Uint8ClampedArray, b: Uint8ClampedArray) {
    if (a.length !== b.length) return true;
    for (let i = 0; i < a.length; i += 16) {
      if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) {
        return true;
      }
    }
    return false;
  }

  private normalizeActionPointer() {
    while (this.groupIndex < this.processedActionGroups.length) {
      const group = this.processedActionGroups[this.groupIndex];
      if (this.actionIndex < group.actions.length) break;
      this.groupIndex += 1;
      this.actionIndex = 0;
    }
  }

  private async applyActionAndWait(
    action: ReplayAction,
    onFrame?: () => void | Promise<void>,
  ) {
    const maybeAsync = this.applyAction(action, onFrame);
    if (!maybeAsync) return;
    await maybeAsync;
  }

  private sleep(ms: number) {
    return new Promise<void>((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }
}
