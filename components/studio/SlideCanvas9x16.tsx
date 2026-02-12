import type { StudioSlide } from "@/types/studio";

interface SlideCanvasProps {
  slide: StudioSlide;
}

export default function SlideCanvas9x16({ slide }: SlideCanvasProps) {
  const mediaUrl = slide.mediaUrl;
  const isVideo = mediaUrl
    ? [".webm", ".mp4"].some((ext) => mediaUrl.toLowerCase().endsWith(ext))
    : false;

  return (
    <div
      style={{
        width: 360,
        aspectRatio: "9 / 16",
        background: slide.bgColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        border: "1px solid #ddd",
        marginBottom: 16,
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
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
              objectFit: "cover",
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
              objectFit: "cover",
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
          fontSize: 28,
          whiteSpace: "pre-wrap",
          padding: 16,
        }}
      >
        {slide.text || "Введите текст слайда"}
      </div>
    </div>
  );
}
