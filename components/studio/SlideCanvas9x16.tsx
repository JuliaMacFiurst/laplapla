import { useEffect, useRef, useState } from "react";
import type { StudioSlide } from "@/types/studio";
import { dictionaries, type Lang } from "@/i18n";

interface SlideCanvasProps {
  slide: StudioSlide;
  lang: Lang;
  isMobile?: boolean;
  isTextEditing?: boolean;
  isMediaEditing?: boolean;
  onUpdateSlide?: (updatedSlide: StudioSlide) => void;
}

export default function SlideCanvas9x16({
  slide,
  lang,
  isMobile = false,
  isTextEditing = false,
  isMediaEditing = false,
  onUpdateSlide,
}: SlideCanvasProps) {
  const slideRootRef = useRef<HTMLDivElement | null>(null);
  const editableTextRef = useRef<HTMLDivElement | null>(null);
  function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  const mediaUrl = slide.mediaUrl;
  const mediaAlt = slide.text?.trim() || "illustration";
  const isVideo = slide.mediaType === "video";
  const fitMode: "cover" | "contain" = slide.mediaFit ?? "cover";
  const t = dictionaries[lang].cats.studio;
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [mediaTransform, setMediaTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [mediaAspectRatio, setMediaAspectRatio] = useState(9 / 16);
  const dragStateRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const resizeStateRef = useRef<{ startY: number; baseFontSize: number } | null>(null);
  const mediaDragStateRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const mediaResizeStateRef = useRef<{ startY: number; baseScale: number } | null>(null);

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
  const canvasAspectRatio = 9 / 16;
  const [canvasScale, setCanvasScale] = useState(1);
  const effectiveScale = isMobile ? canvasScale : 1;
  const effectiveFontSize = fontSize * effectiveScale;
  const textSpacing = 16 * effectiveScale;
  const textRadius = textBgEnabled ? 12 * effectiveScale : 0;

  useEffect(() => {
    setPosition({ x: 0, y: 0 });
    setMediaTransform({ x: 0, y: 0, scale: 1 });
    setMediaAspectRatio(9 / 16);
    dragStateRef.current = null;
    resizeStateRef.current = null;
    mediaDragStateRef.current = null;
    mediaResizeStateRef.current = null;
  }, [slide.id, slide.mediaUrl]);

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

  useEffect(() => {
    const node = editableTextRef.current;
    if (!node || !showMobileEditorFrame) return;
    if (document.activeElement === node) return;

    const nextText = slide.text ?? "";
    if (node.textContent !== nextText) {
      node.textContent = nextText;
    }
  }, [slide.text, showMobileEditorFrame]);

  function hexToRgba(hex: string, alpha: number) {
    const cleaned = hex.replace("#", "");
    const bigint = parseInt(cleaned, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function handleTextTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (!showMobileEditorFrame) return;

    const touch = e.touches[0];
    if (!touch) return;

    dragStateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      baseX: position.x,
      baseY: position.y,
    };
  }

  function handleTextTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (!showMobileEditorFrame || !dragStateRef.current) return;

    const touch = e.touches[0];
    if (!touch) return;

    e.preventDefault();
    setPosition({
      x: dragStateRef.current.baseX + (touch.clientX - dragStateRef.current.startX),
      y: dragStateRef.current.baseY + (touch.clientY - dragStateRef.current.startY),
    });
  }

  function handleResizeStart(e: React.TouchEvent<HTMLDivElement>) {
    if (!showMobileEditorFrame) return;

    e.stopPropagation();
    const touch = e.touches[0];
    if (!touch) return;

    resizeStateRef.current = {
      startY: touch.clientY,
      baseFontSize: fontSize,
    };
  }

  function handleResizeMove(e: React.TouchEvent<HTMLDivElement>) {
    if (!showMobileEditorFrame || !resizeStateRef.current || !onUpdateSlide) return;

    const touch = e.touches[0];
    if (!touch) return;

    e.preventDefault();
    e.stopPropagation();

    const deltaY = touch.clientY - resizeStateRef.current.startY;
    const nextFontSize = Math.max(14, Math.min(72, resizeStateRef.current.baseFontSize + deltaY / 4));

    onUpdateSlide({
      ...slide,
      fontSize: Math.round(nextFontSize),
    });
  }

  function handleMediaTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (!showMobileMediaEditor) return;

    const touch = e.touches[0];
    if (!touch) return;

    mediaDragStateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      baseX: mediaTransform.x,
      baseY: mediaTransform.y,
    };
  }

  function handleMediaTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (!showMobileMediaEditor || !mediaDragStateRef.current) return;

    const touch = e.touches[0];
    if (!touch) return;

    e.preventDefault();
    setMediaTransform((current) => ({
      ...current,
      x: mediaDragStateRef.current!.baseX + (touch.clientX - mediaDragStateRef.current!.startX),
      y: mediaDragStateRef.current!.baseY + (touch.clientY - mediaDragStateRef.current!.startY),
    }));
  }

  function handleMediaResizeStart(e: React.TouchEvent<HTMLDivElement>) {
    if (!showMobileMediaEditor) return;

    e.stopPropagation();
    const touch = e.touches[0];
    if (!touch) return;

    mediaResizeStateRef.current = {
      startY: touch.clientY,
      baseScale: mediaTransform.scale,
    };
  }

  function handleMediaResizeMove(e: React.TouchEvent<HTMLDivElement>) {
    if (!showMobileMediaEditor || !mediaResizeStateRef.current) return;

    const touch = e.touches[0];
    if (!touch) return;

    e.preventDefault();
    e.stopPropagation();

    const deltaY = touch.clientY - mediaResizeStateRef.current.startY;
    setMediaTransform((current) => ({
      ...current,
      scale: clamp(mediaResizeStateRef.current!.baseScale + deltaY / 240, 0.6, 2.2),
    }));
  }

  function handleTextInput(e: React.FormEvent<HTMLDivElement>) {
    if (!showMobileEditorFrame || !onUpdateSlide) return;

    onUpdateSlide({
      ...slide,
      text: e.currentTarget.textContent ?? "",
    });
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
  } as const;
  const mediaFrame = getMediaFrame();

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
          onTouchStart={handleMediaTouchStart}
          onTouchMove={handleMediaTouchMove}
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
            <img
              key={`${slide.id}:${mediaUrl}`}
              src={mediaUrl}
              alt={mediaAlt}
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
                onTouchStart={handleMediaResizeStart}
                onTouchMove={handleMediaResizeMove}
              />
            </>
          ) : null}
        </div>
      ) : null}

      <div
        style={{
          position: "relative",
          zIndex: 2,
          fontFamily: "'Amatic SC', cursive",
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
        }}
        onTouchStart={handleTextTouchStart}
        onTouchMove={handleTextTouchMove}
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
          {showMobileEditorFrame ? (
            <div
              ref={editableTextRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleTextInput}
              onTouchStart={(e) => e.stopPropagation()}
              style={{
                position: "relative",
                zIndex: 1,
                color: slide.textColor,
                outline: "none",
                minWidth: `${48 * effectiveScale}px`,
                minHeight: `${28 * effectiveScale}px`,
              }}
            />
          ) : (
            <div
              style={{
                position: "relative",
                zIndex: 1,
                color: slide.textColor,
              }}
            >
              {slide.text || t.textPlaceholder}
            </div>
          )}
        </div>
        {showMobileEditorFrame ? (
          <>
            <button
              type="button"
              onClick={() => onUpdateSlide?.({ ...slide, text: "" })}
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
              onTouchStart={handleResizeStart}
              onTouchMove={handleResizeMove}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
