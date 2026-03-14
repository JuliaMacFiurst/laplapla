import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import BookFeed from "@/components/BookFeed";
import { useBook } from "@/hooks/useBook";
import { dictionaries, type Lang } from "@/i18n";
import { buildLocalizedQuery, getCurrentLang } from "@/lib/i18n/routing";

export default function CapybaraPage({ lang }: { lang: Lang }) {
  const router = useRouter();
  const currentLang = getCurrentLang(router) || lang;
  const dict = dictionaries[currentLang] || dictionaries.ru;
  const t = dict.capybaras.capybaraPage;
  const {
    currentBook,
    slides,
    tests,
    explanationModes,
    selectedModeId,
    loading,
    error,
    loadRandomBook,
    loadExplanation,
    meaningModeId,
  } = useBook(t, currentLang);
  const [showTests, setShowTests] = useState(false);

  const currentModeId = useMemo(
    () => selectedModeId || meaningModeId || explanationModes[0]?.id || null,
    [explanationModes, meaningModeId, selectedModeId],
  );

  const handleModeSelect = async (modeId: string | number) => {
    if (!currentBook) {
      return;
    }

    setShowTests(false);
    await loadExplanation(currentBook.id, modeId);
  };

  const handleRandomBook = async () => {
    setShowTests(false);
    await loadRandomBook(currentModeId);
  };

  const handleExplainMeaning = async () => {
    if (!currentBook || !currentModeId) {
      return;
    }

    setShowTests(false);
    await loadExplanation(currentBook.id, meaningModeId || currentModeId);
  };

  const handleCreateVideo = () => {
    const studioSlides = slides.map((slide) => ({
      text: slide.text,
      image: slide.capybaraImage || slide.imageUrl || slide.gifUrl || slide.videoUrl,
    }));

    sessionStorage.setItem("catsSlides", JSON.stringify(studioSlides));
    router.push(
      { pathname: "/cats/studio", query: buildLocalizedQuery(currentLang) },
      undefined,
      { locale: currentLang },
    );
  };

  return (
    <div className="capybara-page-container">
      <header className="capybara-page-header">
        <h1 className="page-title">{t.title}</h1>
        <p className="page-subtitle">{t.subtitle}</p>
      </header>

      <main className="capybara-page-main capybara-feed-main">
        <BookFeed
          book={currentBook}
          slides={slides}
          tests={tests}
          modes={explanationModes}
          selectedModeId={selectedModeId}
          loading={loading}
          error={error}
          showTests={showTests}
          onNextBook={handleRandomBook}
          onExplainMeaning={handleExplainMeaning}
          onTakeTest={() => setShowTests((prev) => !prev)}
          onCreateVideo={handleCreateVideo}
          onModeSelect={handleModeSelect}
          t={t}
        />
      </main>
    </div>
  );
}
