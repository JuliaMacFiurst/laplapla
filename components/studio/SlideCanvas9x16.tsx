import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { resolveFontFamily } from "@/lib/fonts";
import type { StudioSlide, StudioSticker } from "@/types/studio";
import { dictionaries, type Lang } from "@/i18n";

interface SlideCanvasProps {
  slide: StudioSlide;
  lang: Lang;
  isMobile?: boolean;
  isTextEditing?: boolean;
  isMediaEditing?: boolean;
  onUpdateSlide?: (
    updatedSlide: StudioSlide,
    options?: { commitHistory?: boolean },
  ) => void;
  activeStickerId?: string | null;
  onActiveStickerChange?: (id: string | null) => void;
}

interface StickerOverlayProps {
  sticker: StudioSticker;
  isActive: boolean;
  isEditable: boolean;
  onSelect: (id: string) => void;
  onUpdate: (sticker: StudioSticker, options?: { commitHistory?: boolean }) => void;
  onDelete: (id: string) => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function StickerOverlay({
  sticker,
  isActive,
  isEditable,
  onSelect,
  onUpdate,
  onDelete,
}: StickerOverlayProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const gestureRef = useRef<{
    mode: "drag" | "resize";
    pointerId: number;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    baseWidth: number;
    baseHeight: number;
    canvasWidth: number;
    canvasHeight: number;
  } | null>(null);
  const [draft, setDraft] = useState(sticker);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (gestureRef.current) return;
    setDraft(sticker);
  }, [sticker]);

  function getCanvasRect() {
    const node = rootRef.current?.parentElement;
    return node?.getBoundingClientRect() ?? null;
  }

  function beginGesture(event: ReactPointerEvent<HTMLDivElement>, mode: "drag" | "resize") {
    if (!isEditable) return;
    const rect = getCanvasRect();
    if (!rect) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelect(sticker.id);

    gestureRef.current = {
      mode,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      baseX: draft.x,
      baseY: draft.y,
      baseWidth: draft.width,
      baseHeight: draft.height,
      canvasWidth: rect.width,
      canvasHeight: rect.height,
    };
  }

  function moveGesture(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();

    const deltaXPercent = ((event.clientX - gesture.startX) / gesture.canvasWidth) * 100;
    const deltaYPercent = ((event.clientY - gesture.startY) / gesture.canvasHeight) * 100;
    const nextSticker = gesture.mode === "drag"
      ? {
          ...draft,
          x: gesture.baseX + deltaXPercent,
          y: gesture.baseY + deltaYPercent,
        }
      : {
          ...draft,
          width: clamp(gesture.baseWidth + deltaXPercent, 8, 92),
          height: clamp(gesture.baseHeight + deltaYPercent, 8, 92),
        };

    setDraft(nextSticker);
    onUpdate(nextSticker, { commitHistory: false });
  }

  function endGesture(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();
    gestureRef.current = null;
    onUpdate({
      ...draft,
      x: Number(draft.x.toFixed(2)),
      y: Number(draft.y.toFixed(2)),
      width: Number(draft.width.toFixed(2)),
      height: Number(draft.height.toFixed(2)),
    });
  }

  if (sticker.visible === false) return null;
  const isVideoSticker =
    sticker.animationType === "video" ||
    /\.(mp4|webm)(?:\?|$)/i.test(draft.sourceUrl);

  return (
    <div
      ref={rootRef}
      data-disable-slide-swipe={isEditable ? "true" : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPointerDown={(event) => beginGesture(event, "drag")}
      onPointerMove={moveGesture}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      style={{
        position: "absolute",
        left: `${draft.x}%`,
        top: `${draft.y}%`,
        width: `${draft.width}%`,
        height: `${draft.height}%`,
        transform: `translate(-50%, -50%) rotate(${draft.rotation ?? 0}deg)`,
        transformOrigin: "center center",
        opacity: draft.opacity ?? 1,
        zIndex: 10 + (draft.zIndex ?? 0),
        touchAction: isEditable ? "none" : "auto",
        cursor: isEditable ? (isActive ? "move" : "grab") : "default",
        pointerEvents: isEditable ? "auto" : "none",
        willChange: gestureRef.current ? "left, top, width, height" : "auto",
      }}
    >
      {isVideoSticker ? (
        <video
          src={draft.sourceUrl}
          autoPlay
          muted
          loop
          playsInline
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            pointerEvents: "none",
            userSelect: "none",
            display: "block",
          }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- Animated sticker formats must bypass Next image optimization.
        <img
          src={draft.sourceUrl}
          alt="animated sticker"
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            pointerEvents: "none",
            userSelect: "none",
            display: "block",
          }}
        />
      )}

      {isEditable && (isActive || isHovered) ? (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "-4px",
            border: isActive
              ? "1px dashed rgba(255, 179, 209, 0.95)"
              : "1px solid rgba(255, 255, 255, 0.64)",
            borderRadius: "10px",
            pointerEvents: "none",
          }}
        />
      ) : null}

      {isEditable && isActive ? (
        <>
          <button
            type="button"
            aria-label="Remove sticker"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onTouchStart={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              gestureRef.current = null;
              onDelete(sticker.id);
            }}
            style={{
              position: "absolute",
              top: "-12px",
              right: "-12px",
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              border: "none",
              background: "#ffb3d1",
              color: "#000",
              zIndex: 3,
              cursor: "pointer",
            }}
          >
            ×
          </button>
          <div
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              beginGesture(event, "resize");
            }}
            onPointerMove={moveGesture}
            onPointerUp={endGesture}
            onPointerCancel={endGesture}
            style={{
              position: "absolute",
              right: "-10px",
              bottom: "-10px",
              width: "22px",
              height: "22px",
              borderRadius: "50%",
              background: "#ffb3d1",
              border: "2px solid #fff",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              zIndex: 3,
              cursor: "nwse-resize",
              touchAction: "none",
            }}
          />
        </>
      ) : null}

    </div>
  );
}

function renderStudioText(slide: StudioSlide) {
  if (slide.introLayout !== "book-meta") {
    return slide.text || "";
  }

  const lines = (slide.text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div
      style={{
        display: "grid",
        gap: "0.5em",
        justifyItems: "center",
      }}
    >
      {lines.map((line, index) => (
        <div
          key={`${index}-${line}`}
          style={{
            width: "100%",
            padding: index === 0 ? "0.5em 0.9em" : "0.42em 0.85em",
            borderRadius: "999px",
            background: index === 0
              ? "rgba(255, 232, 239, 0.92)"
              : "rgba(255, 255, 255, 0.92)",
            boxShadow: "0 8px 24px rgba(148, 163, 184, 0.12)",
            fontWeight: index === 0 ? 900 : 700,
            fontSize: index === 0 ? "1.12em" : "0.86em",
            lineHeight: 1.15,
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
}

export default function SlideCanvas9x16({
  slide,
  lang,
  isMobile = false,
  isTextEditing = false,
  isMediaEditing = false,
  onUpdateSlide,
  activeStickerId,
  onActiveStickerChange,
}: SlideCanvasProps) {
  const slideRootRef = useRef<HTMLDivElement | null>(null);
  const mediaUrl = slide.mediaUrl;
  const mediaAlt = slide.text?.trim() || "illustration";
  const isVideo = slide.mediaType === "video";
  const fitMode: "cover" | "contain" = slide.mediaFit ?? "cover";
  const t = dictionaries[lang].cats.studio;
  const [position, setPosition] = useState({
    x: slide.textOffsetX ?? 0,
    y: slide.textOffsetY ?? 0,
  });
  const [mediaTransform, setMediaTransform] = useState({
    x: slide.mediaOffsetX ?? 0,
    y: slide.mediaOffsetY ?? 0,
    scale: slide.mediaScale ?? 1,
  });
  const [mediaAspectRatio, setMediaAspectRatio] = useState(9 / 16);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    latestX: number;
    latestY: number;
  } | null>(null);
  const resizeStateRef = useRef<{ pointerId: number; startY: number; baseFontSize: number; latestFontSize: number } | null>(null);
  const mediaDragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    latestX: number;
    latestY: number;
  } | null>(null);
  const mediaResizeStateRef = useRef<{ pointerId: number; startY: number; baseScale: number; latestScale: number } | null>(null);

  const positionMap: Record<
    "top" | "center" | "bottom",
    string
  > = {
    top: "center top",
    center: "center center",
    bottom: "center bottom",
  };

  const objectPosition = positionMap[slide.mediaPosition ?? "center"];

  const textPositionMap: Record<
    "top" | "center" | "bottom",
    string
  > = {
    top: "flex-start",
    center: "center",
    bottom: "flex-end",
  };

  const textVerticalAlign = textPositionMap[
    slide.textPosition ?? "center"
  ];
  const textHorizontalAlignMap: Record<
    "left" | "center" | "right",
    string
  > = {
    left: "flex-start",
    center: "center",
    right: "flex-end",
  };
  const textHorizontalAlign = textHorizontalAlignMap[
    slide.textAlign ?? "center"
  ];

  const textBgEnabled = slide.textBgEnabled ?? false;
  const textBgColor = slide.textBgColor ?? "#000000";
  const textBgOpacity = slide.textBgOpacity ?? 0.6;
  const fontSize = slide.fontSize ?? 24;
  const showMobileEditorFrame = isMobile && isTextEditing;
  const showMobileMediaEditor = isMobile && isMediaEditing && Boolean(mediaUrl);
  const showStickerEditor = Boolean(onUpdateSlide);
  const isIntroSlideLocked = slide.introLayout === "book-meta";
  const canvasAspectRatio = 9 / 16;
  const [canvasScale, setCanvasScale] = useState(1);
  const effectiveScale = isMobile ? canvasScale : 1;
  const effectiveFontSize = fontSize * effectiveScale;
  const textSpacing = 16 * effectiveScale;
  const textRadius = textBgEnabled ? 12 * effectiveScale : 0;

  useEffect(() => {
    setPosition({
      x: slide.textOffsetX ?? 0,
      y: slide.textOffsetY ?? 0,
    });
    setMediaTransform({
      x: slide.mediaOffsetX ?? 0,
      y: slide.mediaOffsetY ?? 0,
      scale: slide.mediaScale ?? 1,
    });
    setMediaAspectRatio(9 / 16);
    dragStateRef.current = null;
    resizeStateRef.current = null;
    mediaDragStateRef.current = null;
    mediaResizeStateRef.current = null;
  }, [slide.id, slide.mediaUrl]);

  useEffect(() => {
    if (dragStateRef.current || resizeStateRef.current) return;

    setPosition({
      x: slide.textOffsetX ?? 0,
      y: slide.textOffsetY ?? 0,
    });
  }, [slide.textOffsetX, slide.textOffsetY]);

  useEffect(() => {
    if (mediaDragStateRef.current || mediaResizeStateRef.current) return;

    setMediaTransform({
      x: slide.mediaOffsetX ?? 0,
      y: slide.mediaOffsetY ?? 0,
      scale: slide.mediaScale ?? 1,
    });
  }, [slide.mediaOffsetX, slide.mediaOffsetY, slide.mediaScale]);

  useEffect(() => {
    if (!isMobile || !slideRootRef.current || typeof ResizeObserver === "undefined") {
      setCanvasScale(1);
      return;
    }

    const node = slideRootRef.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const width = entry?.contentRect.width ?? 360;
      setCanvasScale(clamp(width / 360, 0.55, 1));
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [isMobile]);

  function hexToRgba(hex: string, alpha: number) {
    const cleaned = hex.replace("#", "");
    const bigint = parseInt(cleaned, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function handleTextPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!showMobileEditorFrame) return;

    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    dragStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      baseX: position.x,
      baseY: position.y,
      latestX: position.x,
      latestY: position.y,
    };
  }

  function handleTextPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const gesture = dragStateRef.current;
    if (!showMobileEditorFrame || !gesture || gesture.pointerId !== e.pointerId || !onUpdateSlide) return;

    e.preventDefault();
    e.stopPropagation();
    const nextPosition = {
      x: gesture.baseX + (e.clientX - gesture.startX),
      y: gesture.baseY + (e.clientY - gesture.startY),
    };
    gesture.latestX = nextPosition.x;
    gesture.latestY = nextPosition.y;
    setPosition(nextPosition);
    onUpdateSlide({
      ...slide,
      textOffsetX: Math.round(nextPosition.x),
      textOffsetY: Math.round(nextPosition.y),
    }, { commitHistory: false });
  }

  function handleTextPointerEnd(e: ReactPointerEvent<HTMLDivElement>) {
    const gesture = dragStateRef.current;
    if (gesture && gesture.pointerId !== e.pointerId) return;

    if (showMobileEditorFrame && onUpdateSlide && gesture) {
      e.preventDefault();
      e.stopPropagation();
      onUpdateSlide({
        ...slide,
        textOffsetX: Math.round(gesture.latestX),
        textOffsetY: Math.round(gesture.latestY),
      });
    }
    dragStateRef.current = null;
  }

  function commitMediaTransform(pointerId?: number) {
    const dragGesture = mediaDragStateRef.current;
    const resizeGesture = mediaResizeStateRef.current;
    if (pointerId !== undefined && dragGesture && dragGesture.pointerId !== pointerId) return;
    if (pointerId !== undefined && resizeGesture && resizeGesture.pointerId !== pointerId) return;

    if (showMobileMediaEditor && onUpdateSlide) {
      const nextTransform = {
        x: dragGesture?.latestX ?? mediaTransform.x,
        y: dragGesture?.latestY ?? mediaTransform.y,
        scale: resizeGesture?.latestScale ?? mediaTransform.scale,
      };
      onUpdateSlide({
        ...slide,
        mediaOffsetX: Math.round(nextTransform.x),
        mediaOffsetY: Math.round(nextTransform.y),
        mediaScale: Number(nextTransform.scale.toFixed(3)),
      });
    }
    mediaDragStateRef.current = null;
    mediaResizeStateRef.current = null;
  }

  function handleResizePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!showMobileEditorFrame) return;

    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    resizeStateRef.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      baseFontSize: fontSize,
      latestFontSize: fontSize,
    };
  }

  function handleResizePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const gesture = resizeStateRef.current;
    if (!showMobileEditorFrame || !gesture || gesture.pointerId !== e.pointerId || !onUpdateSlide) return;

    e.preventDefault();
    e.stopPropagation();

    const deltaY = e.clientY - gesture.startY;
    const nextFontSize = Math.max(14, Math.min(72, gesture.baseFontSize + deltaY / 4));
    gesture.latestFontSize = nextFontSize;

    onUpdateSlide({
      ...slide,
      fontSize: Math.round(nextFontSize),
    }, { commitHistory: false });
  }

  function handleResizePointerEnd(e: ReactPointerEvent<HTMLDivElement>) {
    const gesture = resizeStateRef.current;
    if (gesture && gesture.pointerId !== e.pointerId) return;

    if (showMobileEditorFrame && onUpdateSlide && gesture) {
      e.preventDefault();
      e.stopPropagation();
      onUpdateSlide({
        ...slide,
        fontSize: Math.round(gesture.latestFontSize),
      });
    }
    resizeStateRef.current = null;
  }

  function handleMediaPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!showMobileMediaEditor) return;

    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    mediaDragStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      baseX: mediaTransform.x,
      baseY: mediaTransform.y,
      latestX: mediaTransform.x,
      latestY: mediaTransform.y,
    };
  }

  function handleMediaPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const gesture = mediaDragStateRef.current;
    if (!showMobileMediaEditor || !gesture || gesture.pointerId !== e.pointerId || !onUpdateSlide) return;

    e.preventDefault();
    e.stopPropagation();
    const nextTransform = {
      ...mediaTransform,
      x: gesture.baseX + (e.clientX - gesture.startX),
      y: gesture.baseY + (e.clientY - gesture.startY),
    };
    gesture.latestX = nextTransform.x;
    gesture.latestY = nextTransform.y;
    setMediaTransform(nextTransform);
    onUpdateSlide({
      ...slide,
      mediaOffsetX: Math.round(nextTransform.x),
      mediaOffsetY: Math.round(nextTransform.y),
      mediaScale: nextTransform.scale,
    }, { commitHistory: false });
  }

  function handleMediaResizePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!showMobileMediaEditor) return;

    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    mediaResizeStateRef.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      baseScale: mediaTransform.scale,
      latestScale: mediaTransform.scale,
    };
  }

  function handleMediaResizePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const gesture = mediaResizeStateRef.current;
    if (!showMobileMediaEditor || !gesture || gesture.pointerId !== e.pointerId || !onUpdateSlide) return;

    e.preventDefault();
    e.stopPropagation();

    const deltaY = e.clientY - gesture.startY;
    const nextScale = clamp(gesture.baseScale + deltaY / 240, 0.6, 2.2);
    gesture.latestScale = nextScale;
    setMediaTransform((current) => ({
      ...current,
      scale: nextScale,
    }));
    onUpdateSlide({
      ...slide,
      mediaOffsetX: mediaTransform.x,
      mediaOffsetY: mediaTransform.y,
      mediaScale: Number(nextScale.toFixed(3)),
    }, { commitHistory: false });
  }

  function getMediaFrame() {
    if (fitMode === "cover") {
      return {
        width: "100%",
        height: "100%",
        left: "0%",
        top: "0%",
      };
    }

    const safeMediaAspectRatio = mediaAspectRatio > 0 ? mediaAspectRatio : canvasAspectRatio;

    if (safeMediaAspectRatio > canvasAspectRatio) {
      const heightPercent = (canvasAspectRatio / safeMediaAspectRatio) * 100;
      let topPercent = (100 - heightPercent) / 2;

      if ((slide.mediaPosition ?? "center") === "top") {
        topPercent = 0;
      } else if ((slide.mediaPosition ?? "center") === "bottom") {
        topPercent = 100 - heightPercent;
      }

      return {
        width: "100%",
        height: `${heightPercent}%`,
        left: "0%",
        top: `${topPercent}%`,
      };
    }

    const widthPercent = (safeMediaAspectRatio / canvasAspectRatio) * 100;
    return {
      width: `${widthPercent}%`,
      height: "100%",
      left: `${(100 - widthPercent) / 2}%`,
      top: "0%",
    };
  }

  const mediaStyle = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: fitMode,
    objectPosition,
    zIndex: 0,
    pointerEvents: "none",
    userSelect: "none",
  } as const;
  const mediaFrame = getMediaFrame();
  const stickers = [...(slide.stickers ?? [])].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  function updateSticker(nextSticker: StudioSticker, options?: { commitHistory?: boolean }) {
    if (!onUpdateSlide) return;
    onUpdateSlide({
      ...slide,
      stickers: (slide.stickers ?? []).map((sticker) =>
        sticker.id === nextSticker.id ? nextSticker : sticker,
      ),
    }, options);
  }

  function deleteSticker(stickerId: string) {
    if (!onUpdateSlide) return;
    onUpdateSlide({
      ...slide,
      stickers: (slide.stickers ?? []).filter((sticker) => sticker.id !== stickerId),
    });
    if (activeStickerId === stickerId) {
      onActiveStickerChange?.(null);
    }
  }

  return (
    <div
      ref={slideRootRef}
      style={{
        width: isMobile ? "100%" : 360,
        height: isMobile ? "100%" : "auto",
        aspectRatio: "9 / 16",
        background: slide.bgColor,
        borderRadius: 12,
        border: "1px solid #ddd",
        marginBottom: isMobile ? 0 : 16,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: textVerticalAlign,
        alignItems: isMobile ? textHorizontalAlign : "stretch",
        maxWidth: "100%",
      }}
    >
      {mediaUrl ? (
        <div
          data-disable-slide-swipe={showMobileMediaEditor ? "true" : undefined}
          style={{
            position: "absolute",
            width: mediaFrame.width,
            height: mediaFrame.height,
            left: mediaFrame.left,
            top: mediaFrame.top,
            transform: isMobile
              ? `translate(${mediaTransform.x}px, ${mediaTransform.y}px) scale(${mediaTransform.scale})`
              : undefined,
            transformOrigin: "center center",
            border: showMobileMediaEditor ? "1px dashed rgba(255, 179, 209, 0.9)" : "none",
            zIndex: 1,
            touchAction: showMobileMediaEditor ? "none" : "auto",
        }}
        onPointerDown={handleMediaPointerDown}
        onPointerMove={handleMediaPointerMove}
        onPointerUp={(event) => commitMediaTransform(event.pointerId)}
        onPointerCancel={(event) => commitMediaTransform(event.pointerId)}
      >
          {isVideo ? (
            <video
              key={`${slide.id}:${mediaUrl}`}
              src={mediaUrl}
              style={mediaStyle}
              onLoadedMetadata={(event) => {
                const element = event.currentTarget;
                if (element.videoWidth > 0 && element.videoHeight > 0) {
                  setMediaAspectRatio(element.videoWidth / element.videoHeight);
                }
              }}
              muted
              playsInline
              autoPlay
              loop
            />
          ) : (
            <Image
              key={`${slide.id}:${mediaUrl}`}
              src={mediaUrl}
              alt={mediaAlt}
              fill
              unoptimized
              sizes="100vw"
              style={mediaStyle}
              onLoad={(event) => {
                const element = event.currentTarget;
                if (element.naturalWidth > 0 && element.naturalHeight > 0) {
                  setMediaAspectRatio(element.naturalWidth / element.naturalHeight);
                }
              }}
            />
          )}

          {showMobileMediaEditor ? (
            <>
              <button
                type="button"
                onClick={() =>
                  onUpdateSlide?.({
                    ...slide,
                    mediaUrl: undefined,
                    mediaType: undefined,
                  })
                }
                style={{
                  position: "absolute",
                  top: "-10px",
                  right: "-10px",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "#ffb3d1",
                  color: "#000",
                  border: "none",
                  zIndex: 2,
                }}
              >
                ×
              </button>
              <div
                style={{
                  position: "absolute",
                  right: "-8px",
                  bottom: "-8px",
                  width: "16px",
                  height: "16px",
                  background: "#ffb3d1",
                  borderRadius: "50%",
                  zIndex: 2,
                }}
                onPointerDown={handleMediaResizePointerDown}
                onPointerMove={handleMediaResizePointerMove}
                onPointerUp={(event) => commitMediaTransform(event.pointerId)}
                onPointerCancel={(event) => commitMediaTransform(event.pointerId)}
              />
            </>
          ) : null}
        </div>
      ) : null}

      {stickers.length > 0 ? (
        <div
          aria-label="Sticker overlay layer"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            pointerEvents: "none",
          }}
        >
          {stickers.map((sticker) => (
            <StickerOverlay
              key={sticker.id}
              sticker={sticker}
              isActive={activeStickerId === sticker.id}
              isEditable={showStickerEditor}
              onSelect={(id) => onActiveStickerChange?.(id)}
              onUpdate={updateSticker}
              onDelete={deleteSticker}
            />
          ))}
        </div>
      ) : null}

      <div
        data-disable-slide-swipe={showMobileEditorFrame ? "true" : undefined}
        style={{
          position: "relative",
          zIndex: 20,
          fontFamily: resolveFontFamily(slide.fontFamily),
          fontSize: effectiveFontSize,
          textAlign: slide.textAlign ?? "center",
          whiteSpace: "pre-wrap",
          flex: "0 0 auto",
          padding: textSpacing,
          margin: textSpacing,
          borderRadius: textRadius,
          width: isMobile ? "fit-content" : undefined,
          maxWidth: `calc(100% - ${textSpacing * 2}px)`,
          overflowWrap: "break-word",
          wordBreak: "break-word",
          transform: isMobile ? `translate(${position.x}px, ${position.y}px)` : undefined,
          border: showMobileEditorFrame ? "1px dashed rgba(255, 179, 209, 0.9)" : "none",
          touchAction: showMobileEditorFrame ? "none" : "auto",
          pointerEvents: showMobileEditorFrame ? "auto" : "none",
          userSelect: "none",
        }}
        onPointerDown={handleTextPointerDown}
        onPointerMove={handleTextPointerMove}
        onPointerUp={handleTextPointerEnd}
        onPointerCancel={handleTextPointerEnd}
      >
        {textBgEnabled ? (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background: hexToRgba(textBgColor, textBgOpacity),
              borderRadius: 12,
              zIndex: 0,
            }}
          />
        ) : null}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            color: slide.textColor,
          }}
        >
          <div
            style={{
              position: "relative",
              zIndex: 1,
              color: slide.textColor,
            }}
          >
            {renderStudioText(slide) || t.textPlaceholder}
          </div>
        </div>
        {showMobileEditorFrame && !isIntroSlideLocked ? (
          <>
            <button
              type="button"
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onUpdateSlide?.({ ...slide, text: "" });
              }}
              style={{
                position: "absolute",
                top: "-10px",
                right: "-10px",
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                background: "#ffb3d1",
                color: "#000",
                border: "none",
                zIndex: 2,
              }}
            >
              ×
            </button>
            <div
              style={{
                position: "absolute",
                right: "-8px",
                bottom: "-8px",
                width: "16px",
                height: "16px",
                background: "#ffb3d1",
                borderRadius: "50%",
                zIndex: 2,
                touchAction: "none",
              }}
              onPointerDown={handleResizePointerDown}
              onPointerMove={handleResizePointerMove}
              onPointerUp={handleResizePointerEnd}
              onPointerCancel={handleResizePointerEnd}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
