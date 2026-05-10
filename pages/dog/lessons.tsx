import { useEffect, useState } from 'react';
import Image from "next/image";
import { useRouter } from 'next/router';
import BackButton from '../../components/BackButton';
import SEO from "@/components/SEO";
import { dictionaries, Lang } from "../../i18n";
import { buildLocalizedQuery, getCurrentLang } from "@/lib/i18n/routing";

interface Lesson {
  id: string;
  title: string;
  preview: string;
  slug: string;
  category_slug: string;
}

export default function LessonsPage() {
  const router = useRouter();
  const lang = getCurrentLang(router) as Lang;
  const dict = dictionaries[lang] || dictionaries["ru"];
  const t = dict.dogs.lessonsPage;
  const loadingLessonsLabel =
    ("loadingLessons" in t ? t.loadingLessons : t.chooseLesson) as string;
  const noLessonsLabel =
    ("noLessons" in t ? t.noLessons : t.noPreview) as string;
  const seo = dict.seo.dogs.lessons;
  const category = router.query.category as string;
  const categoryKey = category as keyof typeof dict.dogs.dogsPage.categories;
  const categoryLabel = dict.dogs.dogsPage.categories[categoryKey] || null;
  const seoTitle = categoryLabel ? `${categoryLabel} — ${seo.titleSuffix}` : seo.defaultTitle;
  const seoPath = router.asPath.split("#")[0]?.split("?")[0] || "/dog/lessons";
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!category) return;
    setIsLoading(true);

    fetch(`/api/dog-lessons?category=${encodeURIComponent(category)}&lang=${lang}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load lessons: ${response.status}`);
        }

        return response.json() as Promise<Lesson[]>;
      })
      .then(setLessons)
      .catch((error) => {
        console.error('❌ Ошибка загрузки уроков:', error);
        setLessons([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [category, lang]);

  return (
    <>
      <SEO title={seoTitle} description={seo.description} path={seoPath} />
      <main className="lessons-page">
        <BackButton href={`/dog?lang=${lang}`}/>
        {categoryLabel ? (
          <p className="lessons-category-label">{categoryLabel}</p>
        ) : null}
        <h1 className="lessons-title page-title">{t.chooseLesson}</h1>
        <div className="lessons-grid">
          {isLoading ? (
            <div className="lessons-empty-state">{loadingLessonsLabel}</div>
          ) : null}
          {lessons.map((lesson) => (
            <div key={lesson.id} className="lesson-card">
              {lesson.preview ? (
                <Image
                  src={lesson.preview}
                  alt={lesson.title}
                  className="lesson-image"
                  width={512}
                  height={512}
                  unoptimized
                />
              ) : (
                <div className="lesson-image lesson-image--placeholder">{t.noPreview}</div>
              )}
              <div className="lesson-info">
                <h2 className="lesson-title">{lesson.title}</h2>
                <button
                  className="lessons-button"
                  onClick={() =>
                    router.push(
                      {
                        pathname: `/dog/lessons/${lesson.slug}`,
                        query: buildLocalizedQuery(lang),
                      },
                      undefined,
                      { locale: lang },
                    )
                  }
                >
                  {t.startDrawing}
                </button>
              </div>
            </div>
          ))}
          {!isLoading && lessons.length === 0 ? (
            <div className="lessons-empty-state">{noLessonsLabel}</div>
          ) : null}
        </div>
      </main>
    </>
  );
}
