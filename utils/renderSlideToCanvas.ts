

// utils/renderSlideToCanvas.ts
// A deterministic, reusable Canvas renderer for 9:16 slides.
// Designed to be shared by Preview (Canvas) and future ffmpeg export (frame-by-frame).

export type MediaFit = "cover" | "contain";
export type MediaPosition = "top" | "center" | "bottom";
export type TextPosition = "top" | "center" | "bottom";
export type TextAlign = "left" | "center" | "right";

export type RenderSlide = {
  // Canvas size. Keep explicit for ffmpeg export.
  width: number;
  height: number;

  // Background
  bgColor: string;

  // Media (optional)
  media?: {
    url?: string; // optional, not used by renderer directly (caller may use for caching)
    source: CanvasImageSource; // HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | ImageBitmap
    type: "image" | "video";
    fit: MediaFit;
    position: MediaPosition;
  };

  // Text (optional)
  text?: {
    content: string;
    position: TextPosition;
    align: TextAlign;
    fontSize: number;
    fontFamily: string;
    color: string;

    bg?: {
      enabled: boolean;
      color: string;
      opacity: number; // 0..1
      paddingX?: number;
      paddingY?: number;
      radius?: number;
    };

    // Optional tuning knobs
    lineHeight?: number; // multiplier, default 1.2
    maxLines?: number; // default 6
    marginX?: number; // px, default 64
    marginY?: number; // px, default 96
    shadow?: {
      enabled: boolean;
      color: string;
      blur: number;
      offsetX: number;
      offsetY: number;
      opacity: number;
    };
  };
};

export type RenderOptions = {
  // If true, uses a safe transparent clear before drawing.
  // Useful when re-using the same canvas.
  clear?: boolean;

  // Optional debug overlays.
  debug?: boolean;
};

export const DEFAULT_EXPORT_SIZE = { width: 1080, height: 1920 };

/** Main entry: render a slide deterministically into a CanvasRenderingContext2D. */
export function renderSlideToCanvas(
  ctx: CanvasRenderingContext2D,
  slide: RenderSlide,
  options: RenderOptions = {}
) {
  const { width, height } = slide;

  if (options.clear) {
    ctx.clearRect(0, 0, width, height);
  }

  // 1) Background
  ctx.save();
  ctx.fillStyle = slide.bgColor || "#000";
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // 2) Media
  if (slide.media) {
    drawMedia(ctx, width, height, slide.media.source, slide.media.fit, slide.media.position);
  }

  // 3) Text
  if (slide.text && (slide.text.content || "").trim().length > 0) {
    drawTextBlock(ctx, width, height, slide.text);
  }

  if (options.debug) {
    drawDebugFrame(ctx, width, height);
  }
}

function drawDebugFrame(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);
  ctx.restore();
}

/**
 * Draw media using cover/contain math (object-fit) with vertical anchoring (top/center/bottom).
 * This is deterministic and works for ImageBitmap / HTMLImageElement / HTMLVideoElement etc.
 */
function drawMedia(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  source: CanvasImageSource,
  fit: MediaFit,
  position: MediaPosition
) {
  const size = getSourceSize(source);
  if (!size) return;

  const { sw, sh } = size;
  if (sw <= 0 || sh <= 0) return;

  const srcAspect = sw / sh;
  const dstAspect = canvasW / canvasH;

  // We will compute destination rect (dx, dy, dw, dh) for contain/cover.
  let dw = canvasW;
  let dh = canvasH;

  if (fit === "contain") {
    if (srcAspect > dstAspect) {
      // source is wider
      dw = canvasW;
      dh = Math.round(canvasW / srcAspect);
    } else {
      dh = canvasH;
      dw = Math.round(canvasH * srcAspect);
    }
  } else {
    // cover
    if (srcAspect > dstAspect) {
      // source is wider -> scale by height
      dh = canvasH;
      dw = Math.round(canvasH * srcAspect);
    } else {
      // source is taller -> scale by width
      dw = canvasW;
      dh = Math.round(canvasW / srcAspect);
    }
  }

  let dx = Math.round((canvasW - dw) / 2);
  let dy: number;

  if (position === "top") dy = 0;
  else if (position === "bottom") dy = Math.round(canvasH - dh);
  else dy = Math.round((canvasH - dh) / 2);

  ctx.save();
  // Small quality helpers.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // If cover and overscales, we still draw full rect (it will crop outside canvas).
  // Use clip to avoid bleeding.
  ctx.beginPath();
  ctx.rect(0, 0, canvasW, canvasH);
  ctx.clip();

  ctx.drawImage(source, dx, dy, dw, dh);
  ctx.restore();
}

function drawTextBlock(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  text: NonNullable<RenderSlide["text"]>
) {
  const marginX = text.marginX ?? 64;
  const marginY = text.marginY ?? 96;
  const maxWidth = Math.max(1, canvasW - marginX * 2);

  const fontSize = clampInt(text.fontSize ?? 64, 12, 240);
  const lineHeightMul = clamp(text.lineHeight ?? 1.2, 0.9, 2.0);
  const lineHeightPx = Math.round(fontSize * lineHeightMul);

  const maxLines = clampInt(text.maxLines ?? 6, 1, 20);

  ctx.save();

  // Font setup
  ctx.font = `${fontSize}px ${text.fontFamily || "sans-serif"}`;
  ctx.textAlign = text.align;
  ctx.textBaseline = "top";

  // Optional shadow
  if (text.shadow?.enabled) {
    ctx.shadowColor = withOpacity(text.shadow.color, clamp(text.shadow.opacity, 0, 1));
    ctx.shadowBlur = Math.max(0, text.shadow.blur);
    ctx.shadowOffsetX = text.shadow.offsetX;
    ctx.shadowOffsetY = text.shadow.offsetY;
  } else {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  const lines = wrapText(ctx, text.content, maxWidth, maxLines);

  // Compute block rect
  const blockH = lines.length * lineHeightPx;

  // Compute x anchor
  const x =
    text.align === "left"
      ? marginX
      : text.align === "right"
        ? canvasW - marginX
        : Math.round(canvasW / 2);

  // Compute y based on textPosition
  let y: number;
  if (text.position === "top") y = marginY;
  else if (text.position === "bottom") y = Math.max(marginY, canvasH - marginY - blockH);
  else y = Math.round((canvasH - blockH) / 2);

  // Background for text (optional)
  const bg = text.bg;
  if (bg?.enabled) {
    const paddingX = bg.paddingX ?? Math.round(fontSize * 0.45);
    const paddingY = bg.paddingY ?? Math.round(fontSize * 0.35);
    const radius = bg.radius ?? 18;

    // Determine widest line for background width
    const lineWidths = lines.map((l) => ctx.measureText(l).width);
    const widest = Math.max(0, ...lineWidths);

    // Background rect width depends on alignment
    let rectW = Math.ceil(widest) + paddingX * 2;
    rectW = Math.min(rectW, canvasW - marginX * 2);

    const rectH = blockH + paddingY * 2;

    let rectX: number;
    if (text.align === "left") rectX = marginX - paddingX;
    else if (text.align === "right") rectX = canvasW - marginX - rectW + paddingX;
    else rectX = Math.round(x - rectW / 2);

    const rectY = Math.round(y - paddingY);

    ctx.save();
    // Disable text shadow for the background, keep it for glyphs later.
    const savedShadowColor = ctx.shadowColor;
    const savedShadowBlur = ctx.shadowBlur;
    const savedShadowOffsetX = ctx.shadowOffsetX;
    const savedShadowOffsetY = ctx.shadowOffsetY;
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = withOpacity(bg.color || "#000", clamp(bg.opacity ?? 0.6, 0, 1));
    roundRect(ctx, rectX, rectY, rectW, rectH, radius);
    ctx.fill();

    // Restore shadow for text
    ctx.shadowColor = savedShadowColor;
    ctx.shadowBlur = savedShadowBlur;
    ctx.shadowOffsetX = savedShadowOffsetX;
    ctx.shadowOffsetY = savedShadowOffsetY;
    ctx.restore();
  }

  // Draw text
  ctx.fillStyle = text.color || "#fff";
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, y + i * lineHeightPx);
  }

  ctx.restore();
}

/** Word wrap that respects existing newlines. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
) {
  const paragraphs = String(text || "").split(/\r?\n/);
  const lines: string[] = [];

  for (const p of paragraphs) {
    const words = p.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      // preserve empty line
      lines.push("");
      if (lines.length >= maxLines) break;
      continue;
    }

    let current = words[0];
    for (let i = 1; i < words.length; i++) {
      const next = `${current} ${words[i]}`;
      if (ctx.measureText(next).width <= maxWidth) {
        current = next;
      } else {
        lines.push(current);
        if (lines.length >= maxLines) return ellipsizeLast(lines);
        current = words[i];
      }
    }
    lines.push(current);
    if (lines.length >= maxLines) return ellipsizeLast(lines);
  }

  return lines;
}

function ellipsizeLast(lines: string[]) {
  if (lines.length === 0) return lines;
  const lastIdx = lines.length - 1;
  const s = lines[lastIdx];
  if (!s) return lines;
  // Add ellipsis only if not already present.
  if (!s.endsWith("…")) lines[lastIdx] = `${s.replace(/[\s.]+$/, "")}…`;
  return lines;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function getSourceSize(source: CanvasImageSource): { sw: number; sh: number } | null {
  // ImageBitmap
  if (typeof (source as any).width === "number" && typeof (source as any).height === "number") {
    const w = Number((source as any).width);
    const h = Number((source as any).height);
    if (Number.isFinite(w) && Number.isFinite(h)) return { sw: w, sh: h };
  }

  // HTMLVideoElement / HTMLImageElement
  const anySrc = source as any;
  if (typeof anySrc.videoWidth === "number" && typeof anySrc.videoHeight === "number") {
    const w = Number(anySrc.videoWidth);
    const h = Number(anySrc.videoHeight);
    if (w > 0 && h > 0) return { sw: w, sh: h };
  }

  // Fallback
  return null;
}

function withOpacity(color: string, opacity: number) {
  // If already rgba/hsla, just return as-is.
  const c = String(color || "").trim();
  if (!c) return `rgba(0,0,0,${opacity})`;
  if (c.startsWith("rgba(") || c.startsWith("hsla(")) return c;

  // Handle hex (#RGB, #RRGGBB)
  if (c.startsWith("#")) {
    const hex = c.slice(1);
    const norm = hex.length === 3
      ? hex.split("").map((ch) => ch + ch).join("")
      : hex;

    if (norm.length === 6) {
      const r = parseInt(norm.slice(0, 2), 16);
      const g = parseInt(norm.slice(2, 4), 16);
      const b = parseInt(norm.slice(4, 6), 16);
      if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
        return `rgba(${r},${g},${b},${opacity})`;
      }
    }
  }

  // Last resort: use the raw color (opacity can’t be applied reliably)
  return c;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function clampInt(v: number, min: number, max: number) {
  const n = Math.round(Number.isFinite(v) ? v : min);
  return Math.max(min, Math.min(max, n));
}