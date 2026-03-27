import BookScreen from "@/components/BookScreen";
import type { Book, BookTest, ExplanationMode, Slide } from "@/types/types";
import type { dictionaries, Lang } from "@/i18n";

type CapybaraPageDict = (typeof dictionaries)["ru"]["capybaras"]["capybaraPage"];
type SlideMedia = {
  type: "image" | "video" | "gif";
  capybaraImage?: string;
  capybaraImageAlt?: string;
  gifUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
};

interface BookCardProps {
  book: Book;
  lang: Lang;
  slides: Slide[];
  tests: BookTest[];
  modes: ExplanationMode[];
  selectedModeId: string | number | null;
  currentSlideIndex: number;
  loading?: boolean;
  showTests?: boolean;
  showRandomBookAction?: boolean;
  onRandomBook: () => void;
  onExplainMeaning: () => void;
  onTakeTest: () => void;
  onCreateVideo: () => void;
  onModeSelect: (modeId: string | number) => void;
  onSlideIndexChange: (slideIndex: number) => void;
  mediaCache: ReadonlyMap<number, SlideMedia>;
  onPreloadNextSlide: (slideIndex: number) => void;
  t: CapybaraPageDict;
}

export default function BookCard({
  book,
  lang,
  slides,
  tests,
  modes,
  selectedModeId,
  currentSlideIndex,
  loading,
  showTests,
  showRandomBookAction = true,
  onRandomBook,
  onExplainMeaning,
  onTakeTest,
  onCreateVideo,
  onModeSelect,
  onSlideIndexChange,
  mediaCache,
  onPreloadNextSlide,
  t,
}: BookCardProps) {
  return (
    <article className="book-card">
      <BookScreen
        book={book}
        lang={lang}
        slides={slides}
        tests={tests}
        modes={modes}
        selectedModeId={selectedModeId}
        currentSlideIndex={currentSlideIndex}
        loading={loading}
        showTests={showTests}
        showRandomBookAction={showRandomBookAction}
        onRandomBook={onRandomBook}
        onExplainMeaning={onExplainMeaning}
        onTakeTest={onTakeTest}
        onCreateVideo={onCreateVideo}
        onModeSelect={onModeSelect}
        onSlideIndexChange={onSlideIndexChange}
        mediaCache={mediaCache}
        onPreloadNextSlide={onPreloadNextSlide}
        t={t}
      />
    </article>
  );
}
