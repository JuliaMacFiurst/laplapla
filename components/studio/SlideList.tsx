import { useRef } from "react";
import type { StudioSlide } from "@/types/studio";
import { dictionaries, type Lang } from "@/i18n";

interface SlideListProps {
  lang: Lang;
  slides: StudioSlide[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onDelete: (index: number) => void;
  onReorder: (from: number, to: number) => void;
}

export default function SlideList({
  lang,
  slides,
  activeIndex,
  onSelect,
  onAdd,
  onDelete,
  onReorder,
}: SlideListProps) {
  const listRef = useRef<HTMLDivElement | null>(null);

  const scrollLeft = () => {
    listRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  };
const t = dictionaries[lang].cats.studio
  const scrollRight = () => {
    listRef.current?.scrollBy({ left: 150, behavior: "smooth" });
  };

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDrop = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const fromIndex = Number(e.dataTransfer.getData("text/plain"));
    if (!isNaN(fromIndex) && fromIndex !== index) {
      onReorder(fromIndex, index);
    }
  };

  const allowDrop = (e: React.DragEvent) => {
    e.preventDefault();
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
          <div
            key={slide.id}
            className="slide-thumb-wrap"
            draggable
            onDragStart={handleDragStart(index)}
            onDragOver={allowDrop}
            onDrop={handleDrop(index)}
          >
            <button
              onClick={() => onSelect(index)}
              className={`slide-thumb${index === activeIndex ? " slide-thumb-active" : ""}`}
            >
              {index + 1}
            </button>

            <button
              onClick={() => {
                if (confirm(t.confirmDeleteSlide)) {
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
