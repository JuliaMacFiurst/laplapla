

const CATEGORIES = [
  "Космос",
  "Природа",
  "Животные",
  "Человек",
  "Музыка",
  "Рисование",
  "Математика",
  "Физика",
];

export function VideoCategories() {
  return (
    <div className="video-categories">
      {CATEGORIES.map((category) => (
        <button
          key={category}
          className="video-category-chip"
          disabled
        >
          {category}
        </button>
      ))}
    </div>
  );
}