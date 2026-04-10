import { useEffect, useRef, useState } from "react";
import type { StudioSlide } from "@/types/studio";
import { dictionaries, type Lang } from "@/i18n";

interface SlideCanvasProps {
  slide: StudioSlide;
  lang: Lang;
  isMobile?: boolean;
  isTextEditing?: boolean;
  onUpdateSlide?: (updatedSlide: StudioSlide) => void;
}

export default function SlideCanvas9x16({
  slide,
  lang,
  isMobile = false,
  isTextEditing = false,
  onUpdateSlide,
}: SlideCanvasProps) {
  const mediaUrl = slide.mediaUrl;
  const mediaAlt = slide.text?.trim() || "illustration";
  const isVideo = slide.mediaType === "video";
  const fitMode: "cover" | "contain" = slide.mediaFit ?? "cover";
  const t = dictionaries[lang].cats.studio;
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragStateRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const resizeStateRef = useRef<{ startY: number; baseFontSize: number } | null>(null);

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

  const textBgEnabled = slide.textBgEnabled ?? false;
  const textBgColor = slide.textBgColor ?? "#000000";
  const textBgOpacity = slide.textBgOpacity ?? 0.6;
  const fontSize = slide.fontSize ?? 24;
  const showMobileEditorFrame = isMobile && isTextEditing;

  useEffect(() => {
    setPosition({ x: 0, y: 0 });
    dragStateRef.current = null;
    resizeStateRef.current = null;
  }, [slide.id]);

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

  return (
    <div
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
        maxWidth: "100%",
      }}
    >
      {mediaUrl ? (
        isVideo ? (
          <video
            key={`${slide.id}:${mediaUrl}`}
            src={mediaUrl}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: fitMode,
              objectPosition,
              zIndex: 0,
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
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: fitMode,
              objectPosition,
              zIndex: 0,
            }}
          />
        )
      ) : null}

      <div
        style={{
          position: "relative",
          zIndex: 2,
          fontFamily: "'Amatic SC', cursive",
          fontSize: slide.fontSize ?? 24,
          textAlign: slide.textAlign ?? "center",
          whiteSpace: "pre-wrap",
          padding: 16,
          margin: 16,
          borderRadius: textBgEnabled ? 12 : 0,
          maxWidth: "calc(100% - 32px)",
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
          {slide.text || t.textPlaceholder}
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
