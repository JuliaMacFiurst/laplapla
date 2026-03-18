"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import BookScreen from "@/components/BookScreen";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useBook } from "@/hooks/useBook";
import { buildBookHref, buildBookModeHref } from "@/lib/books";
import type { dictionaries, Lang } from "@/i18n";
import type { Book, ExplanationMode } from "@/types/types";

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
    meaningModeId,
    preloadNextSlideMedia,
    setCurrentBookSlideIndex,
    toggleCurrentBookQuiz,
    closeCurrentBookQuiz,
    mediaCache,
  } = useBook(t, lang, {
    initialBook: book,
    disableInitialRandom: true,
    initialModeId,
  });

  const currentModeId = useMemo(
    () => selectedModeId || meaningModeId || explanationModes[0]?.id || null,
    [explanationModes, meaningModeId, selectedModeId],
  );

  const getModeById = (modeId: string | number | null) =>
    explanationModes.find((mode) => String(mode.id) === String(modeId)) || null;

  const navigateToMode = (mode: ExplanationMode | null) => {
    const nextHref = mode ? buildBookModeHref(book, mode) : buildBookHref(book);
    router.push(`${nextHref}?lang=${lang}`);
  };

  const handleModeSelect = (modeId: string | number) => {
    closeCurrentBookQuiz();
    navigateToMode(getModeById(modeId));
  };

  const handleExplainMeaning = () => {
    if (!currentModeId) {
      return;
    }

    closeCurrentBookQuiz();
    navigateToMode(getModeById(meaningModeId || currentModeId));
  };

  const handleCreateVideo = () => {
    const studioSlides = slides.map((slide) => ({
      text: slide.text,
      image: slide.capybaraImage || slide.imageUrl || slide.gifUrl || slide.videoUrl,
    }));

    sessionStorage.setItem("catsSlides", JSON.stringify(studioSlides));
    router.push(`/cats/studio?lang=${lang}`);
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
