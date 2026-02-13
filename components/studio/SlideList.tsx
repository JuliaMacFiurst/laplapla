import { useRef } from "react";
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
  const listRef = useRef<HTMLDivElement | null>(null);

  const scrollLeft = () => {
    listRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  };

  const scrollRight = () => {
    listRef.current?.scrollBy({ left: 150, behavior: "smooth" });
  };

  return (
    <div style={{ display: "flex", alignItems: "center", width: 490 }}>
      <button
        onClick={scrollLeft}
        className="slide-scroll-arrow"
        type="button"
      >
        ‹
      </button>

      <div
        ref={listRef}
        className="slide-list"
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          scrollBehavior: "smooth",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          flex: 1,
          margin: "0 8px",
          justifyContent: "flex-start",
        }}
      >
        {slides.map((slide, index) => (
          <div key={slide.id} className="slide-thumb-wrap">
            <button
              onClick={() => onSelect(index)}
              className={`slide-thumb${index === activeIndex ? " slide-thumb-active" : ""}`}
            >
              {index + 1}
            </button>

            <button
              onClick={() => {
                if (confirm("Удалить этот слайд?")) {
                  onDelete(index);
                }
              }}
              className="slide-delete"
            >
              ×
            </button>
          </div>
        ))}

        <button
          onClick={onAdd}
          className="slide-thumb slide-add"
        >
          +
        </button>
      </div>

      <button
        onClick={scrollRight}
        className="slide-scroll-arrow"
        type="button"
      >
        ›
      </button>
    </div>
  );
}
