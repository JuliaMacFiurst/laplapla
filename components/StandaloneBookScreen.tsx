"use client";

import { useRouter } from "next/router";
import BookScreen from "@/components/BookScreen";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useBook } from "@/hooks/useBook";
import { buildBookHref, buildBookModeHref } from "@/lib/books";
import type { dictionaries, Lang } from "@/i18n";
import type { Book } from "@/types/types";

type CapybaraPageDict = (typeof dictionaries)["ru"]["capybaras"]["capybaraPage"];

interface StandaloneBookScreenProps {
  book: Book;
  lang: Lang;
  t: CapybaraPageDict;
  initialModeId?: string | number | null;
}

export default function StandaloneBookScreen({
  book,
  lang,
  t,
  initialModeId = null,
}: StandaloneBookScreenProps) {
  const router = useRouter();
  const {
    currentBook,
    slides,
    tests,
    explanationModes,
    selectedModeId,
    currentSlideIndex,
    showQuiz,
    loading,
    error,
    preloadNextSlideMedia,
    buildStudioSlides,
    setCurrentBookSlideIndex,
    toggleCurrentBookQuiz,
    closeCurrentBookQuiz,
    mediaCache,
  } = useBook(t, lang, {
    initialBook: book,
    disableInitialRandom: true,
    initialModeId,
  });

  const handleModeSelect = (modeId: string | number) => {
    closeCurrentBookQuiz();
    const mode = explanationModes.find((item) => String(item.id) === String(modeId));
    const nextHref = mode ? buildBookModeHref(book, mode) : buildBookHref(book);
    void router.push(`${nextHref}?lang=${lang}`);
  };

  const handleExplainMeaning = () => {
    closeCurrentBookQuiz();
    void router.push(`/caps/stories/create?lang=${lang}`);
  };

  const handleCreateVideo = async () => {
    const studioSlides = await buildStudioSlides();

    sessionStorage.setItem("catsSlides", JSON.stringify(studioSlides));
    void router.push(`/cats/studio?lang=${lang}`);
  };

  if (loading && !currentBook) {
    return (
      <div className="loading-spinner-container">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !currentBook) {
    return (
      <div className="error-message-container">
        <ErrorMessage message={error} customTitle={t.loadingErrorTitle} dict={t} />
      </div>
    );
  }

  if (!currentBook) {
    return null;
  }

  return (
    <article className="book-card">
      <BookScreen
        book={currentBook}
        lang={lang}
        slides={slides}
        tests={tests}
        modes={explanationModes}
        selectedModeId={selectedModeId}
        currentSlideIndex={currentSlideIndex}
        loading={loading}
        showTests={showQuiz}
        showRandomBookAction={false}
        onRandomBook={() => {}}
        onExplainMeaning={handleExplainMeaning}
        onTakeTest={toggleCurrentBookQuiz}
        onCreateVideo={handleCreateVideo}
        onModeSelect={handleModeSelect}
        onSlideIndexChange={setCurrentBookSlideIndex}
        mediaCache={mediaCache}
        onPreloadNextSlide={(slideIndex) => {
          void preloadNextSlideMedia(slideIndex);
        }}
        t={t}
      />
    </article>
  );
}
