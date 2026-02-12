import type { StudioSlide } from "@/types/studio";

interface SlideListProps {
  slides: StudioSlide[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
}

export default function SlideList({
  slides,
  activeIndex,
  onSelect,
  onAdd,
}: SlideListProps) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      {slides.map((slide, index) => (
        <button
          key={slide.id}
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
