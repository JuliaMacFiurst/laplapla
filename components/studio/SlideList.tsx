import type { StudioSlide } from "@/types/studio";

interface SlideListProps {
  slides: StudioSlide[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onDelete: (index: number) => void;
}

export default function SlideList({
  slides,
  activeIndex,
  onSelect,
  onAdd,
  onDelete,
}: SlideListProps) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      {slides.map((slide, index) => (
        <div key={slide.id} style={{ position: "relative" }}>
          <button
            onClick={() => onSelect(index)}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: index === activeIndex ? "2px solid black" : "1px solid #ccc",
              background: "white",
              cursor: "pointer",
            }}
          >
            {index + 1}
          </button>

          <button
            onClick={() => {
              if (confirm("Удалить этот слайд?")) {
                onDelete(index);
              }
            }}
            style={{
              position: "absolute",
              top: -6,
              right: -6,
              width: 18,
              height: 18,
              borderRadius: "50%",
              border: "1px solid #ccc",
              background: "white",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
      ))}

      <button
        onClick={onAdd}
        style={{
          padding: "6px 10px",
          borderRadius: 6,
          border: "1px solid #ccc",
          background: "#f3f3f3",
          cursor: "pointer",
        }}
      >
        +
      </button>
    </div>
  );
}
