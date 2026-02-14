import type { StudioSlide } from "@/types/studio";
import { dictionaries, type Lang } from "@/i18n";

interface SlideCanvasProps {
  slide: StudioSlide;
  lang: Lang;
}

export default function SlideCanvas9x16({ slide, lang }: SlideCanvasProps) {
  const mediaUrl = slide.mediaUrl;


  const isVideo = slide.mediaType === "video";

  const fitMode: "cover" | "contain" = slide.mediaFit ?? "cover";

  const t = dictionaries[lang].cats.studio

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
  

  function hexToRgba(hex: string, alpha: number) {
    const cleaned = hex.replace("#", "");
    const bigint = parseInt(cleaned, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return (
    <div
      style={{
        width: 360,
        aspectRatio: "9 / 16",
        background: slide.bgColor,
        borderRadius: 12,
        border: "1px solid #ddd",
        marginBottom: 16,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: textVerticalAlign,
      }}
    >
      {mediaUrl ? (
        isVideo ? (
          <video
            src={mediaUrl}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: fitMode,
              objectPosition,
            }}
            muted
            playsInline
            autoPlay
            loop
          />
        ) : (
          <img
            src={mediaUrl}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: fitMode,
              objectPosition,
            }}
          />
        )
      ) : null}

      <div
        style={{
          position: "relative",
          zIndex: 1,
          color: slide.textColor,
          fontFamily: "'Amatic SC', cursive",
          fontSize: slide.fontSize,
          textAlign: slide.textAlign,
          whiteSpace: "pre-wrap",
          padding: 16,
          margin: 16,
          background: textBgEnabled
            ? hexToRgba(textBgColor, textBgOpacity)
            : "transparent",
          borderRadius: textBgEnabled ? 12 : 0,
        }}
      >
        {slide.text || t.textPlaceholder}
      </div>
    </div>
  );
}
